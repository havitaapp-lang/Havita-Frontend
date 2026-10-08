import { useEffect, useRef } from "react";
import { apiClient } from "../api/apiClient";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

interface SyncEvent {
  type: string;
  tenantId: string;
  payload: any;
  timestamp: string;
}

export const useServerSync = (tenantId: string | undefined, isAuthenticated: boolean) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCount = useRef(0);
  const queryClient = useQueryClient();
  const { user, logout, refreshProperties } = useAuth();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!tenantId || !isAuthenticated) return;

    let isSubscribed = true;

    const connect = async () => {
      if (!isSubscribed) return;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        // Solicitar el ticket de un solo uso (Auth via JWT header is handled automatically by apiClient)
        const response = await apiClient.post<{ ticket: string }>("/sync/stream-ticket");
        if (!isSubscribed || !response || !response.ticket) return;

        const ticket = response.ticket;
        const url = `${
          API_BASE_URL.startsWith("http") ? API_BASE_URL : window.location.origin + API_BASE_URL
        }/sync/stream?ticket=${encodeURIComponent(ticket)}`;

        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
          retryCount.current = 0;
          console.log(`[ServerSync] Connected to SSE for tenant ${tenantId}`);
        };

        const handleMessage = (e: MessageEvent) => {
          try {
            const data: SyncEvent = JSON.parse(e.data);
            console.log(`[ServerSync] Event Received:`, data.type, data.payload);

            // Invalidation & Real-Time Security Map
            switch (data.type) {
              case "RESIDENT_ACCESS_REVOKED":
              case "TENANT_RELATION_ENDED":
              case "RESIDENT_RELATION_ENDED": {
                const affectedUserIds: string[] = Array.isArray(data.payload?.affectedUserIds)
                  ? data.payload.affectedUserIds.map((id: any) => String(id || "").toLowerCase().trim())
                  : [];
                const affectedEmails: string[] = Array.isArray(data.payload?.affectedEmails)
                  ? data.payload.affectedEmails.map((em: any) => String(em || "").toLowerCase().trim())
                  : [];
                const terminatedUserId: string = String(data.payload?.terminatedUserId || "").toLowerCase().trim();

                let currentUserId = userRef.current?.id ? String(userRef.current.id).toLowerCase().trim() : "";
                let currentUserEmail = (userRef.current?.email || "").toLowerCase().trim();

                try {
                  const stored = JSON.parse(localStorage.getItem("havita_user") || "{}");
                  if (!currentUserId && stored.id) currentUserId = String(stored.id).toLowerCase().trim();
                  if (!currentUserEmail && stored.email) currentUserEmail = String(stored.email).toLowerCase().trim();
                } catch {}

                const isMe =
                  (currentUserId && (affectedUserIds.includes(currentUserId) || terminatedUserId === currentUserId)) ||
                  (currentUserEmail && affectedEmails.includes(currentUserEmail));

                if (isMe) {
                  console.warn("[ServerSync] Real-time eviction: your access was revoked. Triggering revocation...");
                  logout();
                  window.dispatchEvent(new CustomEvent("auth:access_revoked"));
                  return;
                }

                // Si no soy el revocado (ej. Propietario que ejecutó la acción u otro residente):
                queryClient.invalidateQueries({ queryKey: ["properties", tenantId] });
                queryClient.invalidateQueries({ queryKey: ["residents", tenantId] });
                queryClient.invalidateQueries({ queryKey: ["myPeople"] });
                queryClient.invalidateQueries({ queryKey: ["my-people"] });
                queryClient.invalidateQueries({ queryKey: ["my-properties"] });
                refreshProperties();
                break;
              }

              case "RESIDENT_RELATION_REACTIVATED":
              case "RESIDENT_REGISTERED":
              case "PROPERTY_OCCUPANCY_CHANGED":
              case "PROPERTY_OWNER_TRANSFERRED":
              case "OWNER_ACCESS_CHANGED":
                // Invalidate properties and residents so React Query refetches them
                queryClient.invalidateQueries({ queryKey: ["properties", tenantId] });
                queryClient.invalidateQueries({ queryKey: ["residents", tenantId] });
                queryClient.invalidateQueries({ queryKey: ["my-properties"] });
                queryClient.invalidateQueries({ queryKey: ["myPeople"] });
                queryClient.invalidateQueries({ queryKey: ["my-people"] });
                refreshProperties();
                break;
              case "VISITOR_STATUS_CHANGED":
              case "VISITOR_UPDATED":
              case "VISITOR_CREATED":
              case "VISITOR_DELETED":
              case "PACKAGE_CREATED":
              case "PACKAGE_STATUS_CHANGED":
              case "PACKAGE_NOTIFIED":
              case "ZONE_CREATED":
              case "ZONE_UPDATED":
              case "RESERVATION_CREATED":
              case "RESERVATION_UPDATED":
              case "RESERVATION_DELETED":
              case "DOCUMENT_CREATED":
              case "COMMUNICATION_CREATED":
              case "POLL_CREATED":
              case "POLL_UPDATED":
              case "MARKETPLACE_REPORT_CREATED":
              case "MARKETPLACE_REPORT_RESOLVED":
                window.dispatchEvent(new CustomEvent(data.type, { detail: data.payload }));
                break;
              case "ASSEMBLY_CREATED":
              case "ASSEMBLY_UPDATED":
              case "ASSEMBLY_STARTED":
              case "ASSEMBLY_ENDED":
                // Invalida solo las queries de asambleas — no afecta otros módulos
                queryClient.invalidateQueries({ queryKey: ["assemblies"] });
                queryClient.invalidateQueries({ queryKey: ["activeAssembly"] });
                window.dispatchEvent(new CustomEvent(data.type, { detail: data.payload }));
                break;
              case "ASSEMBLY_QUORUM_UPDATED":
                // Solo invalida asistentes y derechos de voto — no toda la asamblea
                queryClient.invalidateQueries({ queryKey: ["assemblyAttendees"] });
                queryClient.invalidateQueries({ queryKey: ["votingRights"] });
                // También actualiza el % de quórum en la página de detalle
                queryClient.invalidateQueries({ queryKey: ["assemblies"] });
                window.dispatchEvent(new CustomEvent(data.type, { detail: data.payload }));
                break;

              case "PANIC_ALERT":
              case "PANIC_ALERT_UPDATED":
                window.dispatchEvent(new CustomEvent(data.type, { detail: data.payload }));
                break;
              default:
                break;
            }
          } catch (err) {
            console.error("[ServerSync] Failed to parse event data", err);
          }
        };

        es.addEventListener("CONNECTED", (e) => console.log("[ServerSync] SSE Init:", e.data));
        
        // Custom domain events
        es.addEventListener("RESIDENT_REGISTERED", handleMessage);
        es.addEventListener("RESIDENT_ACCESS_REVOKED", handleMessage);
        es.addEventListener("RESIDENT_RELATION_REACTIVATED", handleMessage);
        es.addEventListener("TENANT_RELATION_ENDED", handleMessage);
        es.addEventListener("RESIDENT_RELATION_ENDED", handleMessage);
        es.addEventListener("PROPERTY_OCCUPANCY_CHANGED", handleMessage);
        es.addEventListener("PROPERTY_OWNER_TRANSFERRED", handleMessage);
        es.addEventListener("OWNER_ACCESS_CHANGED", handleMessage);
        es.addEventListener("VISITOR_STATUS_CHANGED", handleMessage);
        es.addEventListener("VISITOR_UPDATED", handleMessage);
        es.addEventListener("VISITOR_CREATED", handleMessage);
        es.addEventListener("VISITOR_DELETED", handleMessage);
        es.addEventListener("PACKAGE_CREATED", handleMessage);
        es.addEventListener("PACKAGE_STATUS_CHANGED", handleMessage);
        es.addEventListener("PACKAGE_NOTIFIED", handleMessage);
        es.addEventListener("ZONE_CREATED", handleMessage);
        es.addEventListener("ZONE_UPDATED", handleMessage);
        es.addEventListener("RESERVATION_CREATED", handleMessage);
        es.addEventListener("RESERVATION_UPDATED", handleMessage);
        es.addEventListener("RESERVATION_DELETED", handleMessage);
        es.addEventListener("DOCUMENT_CREATED", handleMessage);
        es.addEventListener("COMMUNICATION_CREATED", handleMessage);
        es.addEventListener("POLL_CREATED", handleMessage);
        es.addEventListener("POLL_UPDATED", handleMessage);
        es.addEventListener("PANIC_ALERT", handleMessage);
        es.addEventListener("PANIC_ALERT_UPDATED", handleMessage);
        es.addEventListener("ASSEMBLY_CREATED", handleMessage);
        es.addEventListener("ASSEMBLY_UPDATED", handleMessage);
        es.addEventListener("ASSEMBLY_STARTED", handleMessage);
        es.addEventListener("ASSEMBLY_ENDED", handleMessage);
        es.addEventListener("ASSEMBLY_QUORUM_UPDATED", handleMessage);


        es.onerror = (err) => {
          console.error("[ServerSync] Connection error", err);
          es.close();
          
          if (!isSubscribed) return;

          // Reconnection with exponential backoff (max 30s)
          const timeout = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
          retryCount.current += 1;
          
          if (retryCount.current < 10) {
            console.log(`[ServerSync] Reconnecting in ${timeout}ms...`);
            setTimeout(connect, timeout);
          }
        };
      } catch (err) {
        console.error("[ServerSync] Failed to obtain ticket", err);
        // Fallback retry
        if (!isSubscribed) return;
        const timeout = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
        retryCount.current += 1;
        setTimeout(connect, timeout);
      }
    };

    connect();

    return () => {
      isSubscribed = false;
      if (eventSourceRef.current) {
        console.log(`[ServerSync] Closing SSE for tenant ${tenantId}`);
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [tenantId, queryClient]);
};

