import { panicService } from '../services/panicService';
import React, { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import type { 
  Resident, PropertyUnit, Package, Visitor, 
  RequestPQRS, Reservation, Communication, CommunityDocument, CommonZone, PanicAlert, AlertType 
} from "../types";
import { apiClient } from "../api/apiClient";
import { useAuth } from "./AuthContext";
import { useTenant } from "./TenantContext";
import { useServerSync } from "../hooks/useServerSync";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { visitorService } from "../services/visitorService";
import { notificationService } from "../services/notificationService";
import { formatFriendlyDateTime } from "../utils/formatters";

interface DataContextType {
  residents: Resident[];
  properties: PropertyUnit[];
  packages: Package[];
  visitors: Visitor[];
  pqrsList: RequestPQRS[];
  reservations: Reservation[];
  commonZones: CommonZone[];
  fetchCommonZones: () => Promise<void>;
  panicAlerts: PanicAlert[];
  activePanicAlerts: PanicAlert[];
  createEmergencyAlert: (alertType: AlertType, notes?: string) => Promise<PanicAlert>;
  communications: Communication[];
  documents: CommunityDocument[];

  createResident: (resident: Omit<Resident, "id">) => Resident;
  updateResident: (_id: string, _resident: Partial<Resident>) => void;
  deleteResident: (_id: string) => void;

  createProperty: (property: Omit<PropertyUnit, "id">) => Promise<PropertyUnit>;
  updateProperty: (_id: string, _property: Partial<PropertyUnit>) => Promise<void>;
  deleteProperty: (_id: string) => Promise<void>;
  deleteStructure: (_name: string) => Promise<void>;

  createPackage: (pkg: Omit<Package, "id" | "receivedAt">) => Promise<Package>;
  updatePackage: (_id: string, _pkg: Partial<Package>) => void;
  deletePackage: (_id: string) => void;
  markPackageDelivered: (_id: string) => void;
  createBatchPackages: (packages: Array<Omit<Package, "id" | "receivedAt">>) => Promise<Package[]>;
  deliverAllUnitPackages: (_propertyId: string) => Promise<number>;

  createVisitor: (visitor: Omit<Visitor, "id">) => Promise<any>;
  createGroupVisit: (_visitDetails: any, _persons: any[]) => Promise<Visitor[]>;
  updateVisitor: (id: string, visitor: Partial<Visitor>) => void;
  deleteVisitor: (id: string) => Promise<void> | void;
  recordVisitorEntry: (id: string) => void;
  recordGroupEntry: (_groupId: string) => void;
  recordVisitorExit: (id: string) => void;

  createPQRS: (req: Omit<RequestPQRS, "id" | "createdAt" | "updatedAt">) => RequestPQRS;
  updatePQRS: (id: string, req: Partial<RequestPQRS>) => void;
  deletePQRS: (id: string) => void;
  resolvePQRS: (id: string, notes?: string) => void;

  createReservation: (resv: Omit<Reservation, "id">) => Promise<Reservation>;
  updateReservation: (id: string, resv: Partial<Reservation>) => void;
  deleteReservation: (id: string) => void;
  changeReservationStatus: (id: string, status: Reservation["status"], notes?: string) => void;

  createCommunication: (comm: Omit<Communication, "id" | "createdAt">) => Promise<Communication>;
  updateCommunication: (id: string, comm: Partial<Communication>) => Promise<void>;
  deleteCommunication: (id: string) => Promise<void>;

  createDocument: (doc: Omit<CommunityDocument, "id" | "uploadedAt" | "downloadsCount">) => CommunityDocument;
  updateDocument: (id: string, doc: Partial<CommunityDocument>) => void;
  deleteDocument: (id: string) => void;
  incrementDocumentDownload: (id: string) => void;

  resetToInitialData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentTenant } = useTenant();
  const { isAuthenticated, user, userProperties } = useAuth();
  const queryClient = useQueryClient();
  const tenantId = currentTenant?.id || "";
  const isResident = user?.role === "RESIDENT";
  // Espeja el @PreAuthorize de GET /realtime/panic/active (SUPER_ADMIN, COMMUNITY_ADMIN, SECURITY).
  // El residente consulta solo sus alertas vía GET /realtime/panic/my (ResidentEmergency).
  const canViewCommunityPanic =
    user?.role === "SUPER_ADMIN" || user?.role === "COMMUNITY_ADMIN" || user?.role === "SECURITY";

  // SOLO NOS CONECTAMOS A SSE SI ESTAMOS AUTENTICADOS (EVITA EL BUCLE INFINITO DE /login)
  useServerSync(tenantId, isAuthenticated);

  const { data: propertiesData } = useQuery({
    queryKey: ["properties", tenantId],
    queryFn: async () => {
      const propRes = await apiClient.get<any>("/properties", { size: 2000 });
      if (!propRes?.content) return [];
      return propRes.content.map((p: any) => ({
        id: p.id,
        tenantId: p.tenantId || tenantId,
        name: p.name || p.number,
        number: p.number,
        path: p.path || `${p.structureName || "Torre 1"} / ${p.number}`,
        type: p.type || "Apartamento",
        area: p.area,
        status: p.status || "VACANT",
        structureName: p.structureName,
        structureType: p.structureType || "Torre",
        level: p.level,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        vehiclesCount: p.vehiclesCount,
        petsCount: p.petsCount,
      })) as PropertyUnit[];
    },
    enabled: !!tenantId && isAuthenticated && !isResident,
  });

  const { data: residentsData } = useQuery({
    queryKey: ["residents", tenantId],
    queryFn: async () => {
      const resRes = await apiClient.get<any>("/residents", { size: 2000 });
      if (!resRes?.content) return [];
      return resRes.content.map((r: any) => ({
        id: r.id,
        tenantId: r.tenantId || tenantId,
        userId: r.userId,
        propertyId: r.propertyNumber || r.propertyId,
        propertyUuid: r.propertyId,
        propertyNumber: r.propertyNumber,
        propertyName: r.propertyName,
        name: r.name,
        type: r.type || "Propietario",
        phone: r.phone || "",
        email: r.email || "",
        status: r.status || "ACTIVE",
        registeredAt: r.registeredAt ? r.registeredAt.split("T")[0] : new Date().toISOString().split("T")[0],
      })) as Resident[];
    },
    enabled: !!tenantId && isAuthenticated && !isResident,
  });
  const residents = residentsData || [];

  const properties = React.useMemo(() => {
    const rawProps = propertiesData || [];
    return rawProps.map((p) => {
      // Buscar residente activo vinculado a este inmueble por UUID o por número
      const activeRes = residents.find(
        (r: any) =>
          r.status === "ACTIVE" &&
          (r.propertyUuid === p.id ||
            r.propertyId === p.id ||
            (p.number && (r.propertyId === p.number || r.propertyNumber === p.number)))
      );

      let normalizedStatus = p.status as string;
      if (activeRes || normalizedStatus === "OCCUPIED") {
        normalizedStatus = "OCCUPIED";
      } else if (normalizedStatus === "MAINTENANCE") {
        normalizedStatus = "MAINTENANCE";
      } else if (normalizedStatus === "INACTIVE") {
        normalizedStatus = "INACTIVE";
      } else {
        normalizedStatus = "VACANT";
      }

      return {
        ...p,
        status: normalizedStatus as any,
        residentName: activeRes?.name || p.residentName,
        residentPhone: activeRes?.phone || p.residentPhone,
        residentEmail: activeRes?.email || p.residentEmail,
      };
    });
  }, [propertiesData, residents]);

  const [packages, setPackages] = useState<Package[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [pqrsList, setPqrsList] = useState<RequestPQRS[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [commonZones, setCommonZones] = useState<CommonZone[]>([]);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [documents, setDocuments] = useState<CommunityDocument[]>([]);
  const [panicAlerts, setPanicAlerts] = useState<PanicAlert[]>([]);

  const fetchCommonZones = async () => {
    try {
      const zonesRes = await apiClient.get<any[]>("/properties/zones");
      if (Array.isArray(zonesRes)) {
        const mappedZones: CommonZone[] = zonesRes.map((z: any) => ({
          id: z.id,
          tenantId: z.tenantId || tenantId,
          name: z.name,
          description: z.description,
          capacity: z.capacity,
          reservationRequired: z.reservationRequired,
          costPerHour: z.costPerHour,
          rules: z.rules,
          status: z.status,
          disabledMessage: z.disabledMessage,
          disabledDays: z.disabledDays,
          openTime: z.openTime,
          closeTime: z.closeTime,
        }));
        setCommonZones(mappedZones);
      }
    } catch (e) {
      console.debug("CommonZones endpoint unavailable:", e);
    }
  };


  useEffect(() => {
    if (!tenantId || !isAuthenticated) return;
    let isMounted = true;

    const handleVisitorStatusUpdate = (e: any) => {
      const visitorObj = e.detail?.visitor;
      const targetId = e.detail?.visitorId || visitorObj?.id;
      const rawStatus = e.detail?.status || visitorObj?.status;
      if (!targetId) return;

      const status = (rawStatus === 'AUTHORIZED' || rawStatus === 'AUTORIZADO') ? 'APPROVED' : 
                     (rawStatus === 'PENDIENTE' ? 'PENDING' : 
                     (rawStatus === 'INGRESO' ? 'ENTERED' : 
                     (rawStatus === 'SALIO' ? 'EXITED' : 
                     (rawStatus === 'EXPIRADO' ? 'EXPIRED' : rawStatus))));

      setVisitors(prev => prev.map(v => {
        if (v.id === targetId) {
          const merged = {
            ...v,
            status: status || v.status,
            enteredAt: status === 'ENTERED' ? (visitorObj?.enteredAt ? formatFriendlyDateTime(visitorObj.enteredAt) : new Date().toISOString()) : v.enteredAt,
            exitedAt: status === 'EXITED' ? (visitorObj?.exitedAt ? formatFriendlyDateTime(visitorObj.exitedAt) : new Date().toISOString()) : v.exitedAt,
          };
          if (visitorObj) {
            if (visitorObj.expectedAt) merged.expectedAt = formatFriendlyDateTime(visitorObj.expectedAt) || visitorObj.expectedAt;
            if (visitorObj.name) merged.name = visitorObj.name;
            if (visitorObj.documentId) merged.documentId = visitorObj.documentId;
            if (visitorObj.vehiclePlate) merged.vehiclePlate = visitorObj.vehiclePlate;
            if (visitorObj.observations) merged.observations = visitorObj.observations;
            if (visitorObj.visitPurpose) merged.visitPurpose = visitorObj.visitPurpose;
          }
          return merged;
        }
        return v;
      }));
    };

    const handleVisitorUpdated = (e: any) => {
      const visitorObj = e.detail?.visitor;
      const targetId = e.detail?.visitorId || visitorObj?.id;
      if (!targetId) return;

      setVisitors(prev => prev.map(v => {
        if (v.id === targetId) {
          if (visitorObj) {
            const rawStatus = visitorObj.status;
            const status = (rawStatus === 'AUTHORIZED' || rawStatus === 'AUTORIZADO') ? 'APPROVED' : 
                           (rawStatus === 'PENDIENTE' ? 'PENDING' : 
                           (rawStatus === 'INGRESO' ? 'ENTERED' : 
                           (rawStatus === 'SALIO' ? 'EXITED' : 
                           (rawStatus === 'EXPIRADO' ? 'EXPIRED' : (rawStatus || v.status)))));
            return {
              ...v,
              ...visitorObj,
              status,
              propertyId: visitorObj.propertyNumber || visitorObj.propertyId || v.propertyId,
              expectedAt: formatFriendlyDateTime(visitorObj.expectedAt) || visitorObj.expectedAt || v.expectedAt,
              enteredAt: formatFriendlyDateTime(visitorObj.enteredAt) || visitorObj.enteredAt || v.enteredAt,
              exitedAt: formatFriendlyDateTime(visitorObj.exitedAt) || visitorObj.exitedAt || v.exitedAt,
            };
          }
        }
        return v;
      }));
    };

    const handleVisitorCreated = (e: any) => {
      const { visitor } = e.detail;

      if (isResident && user?.id) {
         if (visitor.createdByUserId !== user.id && visitor.residentId !== user.id) {
             console.log("Visitante creado por otro usuario, ignorando SSE para IDOR visual:", visitor);
             return;
         }
      }

      const mappedVisitor = {
          ...visitor,
          status: (visitor.status === 'AUTHORIZED' || visitor.status === 'AUTORIZADO') ? 'APPROVED' : (visitor.status === 'PENDIENTE' ? 'PENDING' : (visitor.status === 'INGRESO' ? 'ENTERED' : (visitor.status === 'SALIO' ? 'EXITED' : (visitor.status === 'EXPIRADO' ? 'EXPIRED' : visitor.status)))),
        propertyId: visitor.propertyNumber || visitor.propertyId,
          expectedAt: formatFriendlyDateTime(visitor.expectedAt),
          enteredAt: formatFriendlyDateTime(visitor.enteredAt),
          exitedAt: formatFriendlyDateTime(visitor.exitedAt)
        };
      setVisitors(prev => {
        if (prev.some(v => v.id === mappedVisitor.id)) return prev;
        return [mappedVisitor, ...prev];
      });
    };

    const handleVisitorDeleted = (e: any) => {
      const { visitorId } = e.detail;
      setVisitors(prev => prev.filter(v => v.id !== visitorId));
    };

    window.addEventListener('VISITOR_STATUS_CHANGED', handleVisitorStatusUpdate);
    window.addEventListener('VISITOR_UPDATED', handleVisitorUpdated);
    window.addEventListener('VISITOR_CREATED', handleVisitorCreated);
    window.addEventListener('VISITOR_DELETED', handleVisitorDeleted);

    const handlePanicAlert = (e: any) => {
      const alert = e.detail?.alert as PanicAlert;
      if (!alert) return;
      setPanicAlerts(prev => {
        if (prev.some(a => a.id === alert.id)) return prev;
        return [alert, ...prev];
      });
    };

    const handlePanicAlertUpdated = (e: any) => {
      const alert = e.detail?.alert as PanicAlert;
      if (!alert) return;
      setPanicAlerts(prev => prev.map(a => a.id === alert.id ? alert : a));
    };

    window.addEventListener('PANIC_ALERT', handlePanicAlert);
    window.addEventListener('PANIC_ALERT_UPDATED', handlePanicAlertUpdated);


    const handlePackageCreated = (e: any) => {
      const { package: pkg } = e.detail;
      if (!pkg) return;
      const mappedPkg: Package = {
        id: pkg.id,
        tenantId: pkg.tenantId || tenantId,
        propertyId: pkg.propertyId,
        recipientName: pkg.recipientName,
        trackingNumber: pkg.trackingNumber,
        company: pkg.company,
        status: pkg.status,
        receivedAt: formatFriendlyDateTime(pkg.receivedAt) || "Hoy",
        deliveredAt: formatFriendlyDateTime(pkg.deliveredAt),
        observations: pkg.observations
      };
      setPackages(prev => {
        if (prev.some(p => p.id === mappedPkg.id)) return prev;

        if (isResident && user?.residentPropertyId && mappedPkg.propertyId === user.residentPropertyId) {
          notificationService.showToast(`¡Nuevo paquete de ${mappedPkg.company} en portería!`, 'info');
        }

        return [mappedPkg, ...prev];
      });
    };

    const handlePackageStatusChanged = (e: any) => {
      const { packageId, status, deliveredAt } = e.detail;
      const formattedDeliveredAt = formatFriendlyDateTime(deliveredAt || new Date().toISOString());
      setPackages(prev => prev.map(p => 
        p.id === packageId 
          ? { ...p, status, deliveredAt: status === 'DELIVERED' ? formattedDeliveredAt : p.deliveredAt } 
          : p
      ));
    };

    const handlePackageNotified = (e: any) => {
      const { package: pkg } = e.detail;
      if (!pkg) return;
      
      setPackages(prev => prev.map(p => 
        p.id === pkg.id 
          ? { ...p, status: pkg.status } 
          : p
      ));

      if (isResident && user?.residentPropertyId && pkg.propertyId === user.residentPropertyId) {
        notificationService.showToast(`🔔 Tienes un paquete de ${pkg.company} esperándote en portería.`, 'info');
      }
    };

    window.addEventListener('PACKAGE_CREATED', handlePackageCreated);
    window.addEventListener('PACKAGE_STATUS_CHANGED', handlePackageStatusChanged);
    window.addEventListener('PACKAGE_NOTIFIED', handlePackageNotified);

    const handleZoneCreated = (e: any) => {
      const { zone } = e.detail;
      if (!zone) return;
      setCommonZones(prev => {
        if (prev.some(z => z.id === zone.id)) return prev;
        return [...prev, zone];
      });
    };

    const handleZoneUpdated = (e: any) => {
      const { zone } = e.detail;
      if (!zone) return;
      setCommonZones(prev => prev.map(z => z.id === zone.id ? zone : z));
    };

    window.addEventListener('ZONE_CREATED', handleZoneCreated);
    window.addEventListener('ZONE_UPDATED', handleZoneUpdated);

    const handleReservationCreated = (e: any) => {
      const { reservation } = e.detail;
      if (!reservation) return;
      const mapped: Reservation = {
        id: reservation.id,
        tenantId: reservation.tenantId || tenantId,
        commonZoneId: reservation.commonZoneId,
        zone: reservation.commonZoneName,
        propertyId: reservation.propertyName || reservation.propertyNumber || reservation.propertyId,
        residentName: reservation.residentName || "Residente",
        date: reservation.reservationDate || reservation.date,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        status: reservation.status,
        totalCost: reservation.totalCost,
        guestsCount: reservation.attendeesCount || reservation.guestsCount,
        observations: reservation.observations,
        adminNotes: reservation.adminNotes,
      };
      setReservations(prev => {
        if (prev.some(r => r.id === mapped.id)) return prev;
        return [mapped, ...prev];
      });
      // Invalidate query to refresh availability checks in modal
      queryClient.invalidateQueries({ queryKey: ['reservations', 'availability'] });
    };

    const handleReservationUpdated = (e: any) => {
      const { reservation } = e.detail;
      if (!reservation) return;
      setReservations(prev => prev.map(r => r.id === reservation.id ? {
        ...r,
        status: reservation.status,
        observations: reservation.observations,
        adminNotes: reservation.adminNotes,
      } : r));
      queryClient.invalidateQueries({ queryKey: ['reservations', 'availability'] });
    };

    window.addEventListener('RESERVATION_CREATED', handleReservationCreated);
    window.addEventListener('RESERVATION_UPDATED', handleReservationUpdated);

    const handleDocumentCreated = (e: any) => {
      const { document: doc } = e.detail;
      if (!doc) return;
      
      const newDoc: CommunityDocument = {
        id: doc.id,
        tenantId: doc.tenantId || tenantId,
        title: doc.title,
        category: doc.category || "REGLAMENTOS",
        fileUrl: doc.fileUrl || `/api/v1/files/download?key=${doc.storageKey}`,
        fileSize: doc.fileSize || "1.0 MB",
        fileType: doc.fileType || "PDF",
        uploadedAt: doc.createdAt ? doc.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
        downloadsCount: doc.downloadsCount || 0,
      };
      
      setDocuments(prev => {
        if (prev.some(d => d.id === newDoc.id)) return prev;
        return [newDoc, ...prev];
      });

      // Show toast if resident
      if (isResident) {
        notificationService.showToast(`📄 Nuevo documento publicado: ${newDoc.title}`, 'info');
      }
    };
    
    window.addEventListener('DOCUMENT_CREATED', handleDocumentCreated);

    const handleCommunicationCreated = (e: any) => {
      // The payload only has { id, title, audience }
      // To get the full communication, we might need to fetch it, 
      // but for now, we can invalidate queries or just append a stub.
      // Wait, we can fetch it explicitly.
      apiClient.get<any>(`/communications/${e.detail.id}`).then((c) => {
        if (!c) return;
        const newComm: Communication = {
          id: c.id,
          tenantId: c.tenantId || tenantId,
          title: c.title,
          content: c.content,
          authorName: c.authorName || 'Administración',
          createdAt: c.createdAt ? c.createdAt.split('T')[0] : 'Hoy',
          status: c.status || 'PUBLISHED',
          category: c.category || 'General',
          audience: c.audience || 'Todos',
        };
        setCommunications(prev => {
          if (prev.some(x => x.id === newComm.id)) return prev;
          return [newComm, ...prev];
        });

        if (isResident) {
          const propertyUnit = user?.propertyUnit || 'Mi Apartamento';
          const isPropietario = userProperties?.some(p => p.type?.toLowerCase().includes('propietario')) || false;
          const isArrendatario = userProperties?.some(p => p.type?.toLowerCase().includes('arrendatario') || p.type?.toLowerCase().includes('inquilino')) || false;
          
          let showToast = false;
          const aud = newComm.audience || 'Todos';
          
          if (aud === 'Todos' || aud === 'General') {
            showToast = true;
          } else if (aud === 'Propietarios' && isPropietario) {
            showToast = true;
          } else if (aud === 'Arrendatarios' && isArrendatario) {
            showToast = true;
          } else if (aud !== 'Propietarios' && aud !== 'Arrendatarios') {
            const targets = aud.split(',').map(s => s.trim());
            if (targets.some(target => propertyUnit.includes(target))) {
              showToast = true;
            }
          }

          if (showToast) {
            notificationService.showToast(`📢 Nuevo comunicado: ${newComm.title}`, 'info');
          }
        }
      }).catch(err => console.debug("Could not fetch real-time communication", err));
    };

    window.addEventListener('COMMUNICATION_CREATED', handleCommunicationCreated);

    const loadRealData = async () => {
      // 1. Paquetes (Para admin: todos. Para residente: sólo los de su propiedad)
      try {
        if (!isResident) {
          const pkgRes = await apiClient.get<any>("/access/packages", { size: 100 });
          if (isMounted && pkgRes?.content) {
            const mappedPkgs: Package[] = pkgRes.content.map((pkg: any) => ({
              id: pkg.id,
              tenantId: pkg.tenantId || tenantId,
              propertyId: pkg.propertyId, // Store the UUID
              recipientName: pkg.recipientName,
              trackingNumber: pkg.trackingNumber,
              company: pkg.company,
              status: pkg.status,
              receivedAt: formatFriendlyDateTime(pkg.receivedAt) || "Hoy",
              deliveredAt: formatFriendlyDateTime(pkg.deliveredAt),
              observations: pkg.observations,
            }));
            setPackages(mappedPkgs);
          }
        } else if (user?.residentPropertyId) {
          const myPkgsRes = await apiClient.get<any>(`/access/packages/by-property/${user.residentPropertyId}`);
          if (isMounted && Array.isArray(myPkgsRes)) {
            const mappedPkgs: Package[] = myPkgsRes.map((pkg: any) => ({
              id: pkg.id,
              tenantId: pkg.tenantId || tenantId,
              propertyId: pkg.propertyId,
              recipientName: pkg.recipientName,
              trackingNumber: pkg.trackingNumber,
              company: pkg.company,
              status: pkg.status,
              receivedAt: formatFriendlyDateTime(pkg.receivedAt) || "Hoy",
              deliveredAt: formatFriendlyDateTime(pkg.deliveredAt),
              observations: pkg.observations,
            }));
            setPackages(mappedPkgs);
          }
        }
      } catch (e) {
        console.debug("Packages endpoint unavailable:", e);
      }

      // 2. Visitas (Para admin: /access/visitors. Para residente: /access/visitors/by-property/{id})
      try {
        if (!isResident) {
          const visRes = await apiClient.get<any>("/access/visitors", { size: 100 });
          if (isMounted && visRes?.content) {
            const mappedVis: Visitor[] = visRes.content.map((v: any) => ({
              id: v.id,
              tenantId: v.tenantId || tenantId,
              propertyId: v.propertyNumber || v.propertyId,
              name: v.name,
              documentId: v.documentId,
              status: (v.status === 'AUTHORIZED' || v.status === 'AUTORIZADO') ? 'APPROVED' : (v.status === 'PENDIENTE' ? 'PENDING' : (v.status === 'ENTERED' ? 'ENTERED' : (v.status === 'EXITED' ? 'EXITED' : (v.status === 'EXPIRADO' ? 'EXPIRED' : v.status)))),
              expectedAt: formatFriendlyDateTime(v.expectedAt),
                enteredAt: formatFriendlyDateTime(v.enteredAt),
                exitedAt: formatFriendlyDateTime(v.exitedAt),
                createdAt: v.createdAt,
              vehiclePlate: v.vehiclePlate,
              observations: v.observations,
              visitPurpose: v.visitPurpose,
              groupId: v.groupId,
              groupName: v.groupName,
              qrCode: v.qrCode,
                residentName: v.residentName,
                createdByUserId: v.createdByUserId,
                propertyName: v.propertyName,
            }));
            setVisitors(mappedVis);
          }
        } else {
          // Si es residente, consultar a través del servicio propio seguro
          const myVis = await visitorService.getMyVisitors();
          if (isMounted) {
            setVisitors(myVis);
          }
        }
      } catch (e) {
        console.debug("Visitors endpoint unavailable:", e);
      }

      // X. Zonas Comunes (Público para residentes y admins)
      await fetchCommonZones();
      
      // X. Alertas de Pánico de la comunidad (solo roles autorizados; el residente no llama este endpoint)
      if (canViewCommunityPanic) {
        try {
          const activeAlerts = await panicService.getActiveAlerts();
          if (isMounted) setPanicAlerts(activeAlerts);
        } catch (e) {
          console.error('Error cargando alertas de pánico activas:', e);
        }
      }

      // 3. PQRS (Admin: /pqrs. Residente: omitir listado global)
      if (!isResident) {
        try {
          const pqrsRes = await apiClient.get<any>("/pqrs", { size: 100 });
          if (isMounted && pqrsRes?.content) {
            const mappedPqrs: RequestPQRS[] = pqrsRes.content.map((item: any) => ({
              id: item.id,
              tenantId: item.tenantId || tenantId,
              propertyId: item.propertyNumber || item.propertyId || "",
              category: item.category || "Mantenimiento",
              priority: item.priority || "MEDIUM",
              status: item.status || "PENDING",
              subject: item.subject || "Solicitud de mantenimiento",
              description: item.description,
              createdAt: item.createdAt ? item.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
              updatedAt: item.updatedAt ? item.updatedAt.split("T")[0] : new Date().toISOString().split("T")[0],
              responseNotes: item.responseNotes,
            }));
            setPqrsList(mappedPqrs);
          }
        } catch (e) {
          console.debug("PQRS endpoint unavailable:", e);
        }
      }

      // 4. Reservas (Admin: /reservations. Residente: omitir listado global)
      if (!isResident) {
        try {
          const resvRes = await apiClient.get<any>("/reservations", { size: 100 });
          if (isMounted && resvRes?.content) {
            const mappedResv: Reservation[] = resvRes.content.map((r: any) => ({
              id: r.id,
              tenantId: r.tenantId || tenantId,
              commonZoneId: r.commonZoneId,
              commonZoneName: r.commonZoneName || "Zona Común",
              zone: r.commonZoneName || "Zona Común",
              propertyId: r.propertyName || r.propertyNumber || r.propertyId,
              residentName: r.residentName || "Residente",
              date: r.reservationDate || r.date,
              startTime: r.startTime,
              endTime: r.endTime,
              status: r.status,
              totalCost: r.totalCost || 0,
              guestsCount: r.guestsCount || r.attendeesCount || 1,
              observations: r.observations,
              adminNotes: r.adminNotes,
            }));
            setReservations(mappedResv);
          }
        } catch (e) {
          console.debug("Reservations endpoint unavailable:", e);
        }
      } else {
        try {
          const propId = user?.residentPropertyId || (properties.length > 0 ? properties[0].id : null);
          if (propId) {
            const resvRes = await apiClient.get<any[]>(`/reservations/by-property/${propId}`);
            if (isMounted && Array.isArray(resvRes)) {
              const mappedResv: Reservation[] = resvRes.map((r: any) => ({
                id: r.id,
                tenantId: r.tenantId || tenantId,
                commonZoneId: r.commonZoneId,
                commonZoneName: r.commonZoneName || "Zona Común",
                zone: r.commonZoneName || "Zona Común",
                propertyId: r.propertyName || r.propertyNumber || r.propertyId,
                residentName: r.residentName || "Residente",
                date: r.date || r.reservationDate,
                startTime: r.startTime,
                endTime: r.endTime,
                status: r.status,
                totalCost: r.totalCost || 0,
                guestsCount: r.guestsCount || r.attendeesCount || 1,
                observations: r.observations,
                adminNotes: r.adminNotes,
              }));
              setReservations(mappedResv);
            }
          }
        } catch (e) {
          console.debug("Reservations endpoint unavailable for resident:", e);
        }
      }

      try {
        const commRes = await apiClient.get<any>("/communications", { size: 100 });
        if (isMounted && commRes?.content) {
          const mappedComm: Communication[] = commRes.content.map((c: any) => ({
            id: c.id,
            tenantId: c.tenantId || tenantId,
            title: c.title,
            content: c.content,
            type: c.category || "GENERAL",
            audience: c.audience || "ALL",
            status: c.status || "PUBLISHED",
            createdAt: c.createdAt ? c.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
            authorName: c.authorName || "Administración",
          }));
          setCommunications(mappedComm);
        }
      } catch (e) {
        console.warn("Backend communications endpoint unavailable:", e);
      }

      try {
        const docRes = await apiClient.get<any>("/communications/documents", { size: 100 });
        if (isMounted && docRes?.content) {
          const mappedDoc: CommunityDocument[] = docRes.content.map((d: any) => ({
            id: d.id,
            tenantId: d.tenantId || tenantId,
            title: d.title,
            category: d.category || "REGLAMENTOS",
            fileUrl: d.fileUrl || `/api/v1/files/download?key=${d.storageKey}`,
            fileSize: d.fileSize || "1.0 MB",
            fileType: d.fileType || "PDF",
            uploadedAt: d.createdAt ? d.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
            downloadsCount: d.downloadsCount || 0,
          }));
          setDocuments(mappedDoc);
        }
      } catch (e) {
        console.warn("Backend documents endpoint unavailable:", e);
      }
    };
    loadRealData();
    return () => { 
      isMounted = false; 
      window.removeEventListener('VISITOR_STATUS_CHANGED', handleVisitorStatusUpdate);
      window.removeEventListener('VISITOR_UPDATED', handleVisitorUpdated);
      window.removeEventListener('VISITOR_CREATED', handleVisitorCreated);
      window.removeEventListener('VISITOR_DELETED', handleVisitorDeleted);

      window.removeEventListener('PANIC_ALERT', handlePanicAlert);
      window.removeEventListener('PANIC_ALERT_UPDATED', handlePanicAlertUpdated);

      window.removeEventListener('PACKAGE_CREATED', handlePackageCreated);
      window.removeEventListener('PACKAGE_STATUS_CHANGED', handlePackageStatusChanged);
      window.removeEventListener('PACKAGE_NOTIFIED', handlePackageNotified);
      window.removeEventListener('ZONE_CREATED', handleZoneCreated);
      window.removeEventListener('ZONE_UPDATED', handleZoneUpdated);
      window.removeEventListener('DOCUMENT_CREATED', handleDocumentCreated);
      window.removeEventListener('COMMUNICATION_CREATED', handleCommunicationCreated);
    };
  }, [tenantId, isAuthenticated, isResident, canViewCommunityPanic, user?.residentPropertyId]);


  const createEmergencyAlert = async (alertType: AlertType, notes?: string): Promise<PanicAlert> => {
    const created = await panicService.createAlert(alertType, notes);
    return created;
  };

  const activePanicAlerts = panicAlerts.filter(a => a.status === 'ACTIVE');

  const createResident = (resident: Omit<Resident, "id">) => {
    return { ...resident, id: Date.now().toString() } as Resident;
  };
  const updateResident = (_id: string, _resident: Partial<Resident>) => {};
  const deleteResident = (_id: string) => {};

  const createProperty = async (property: Omit<PropertyUnit, "id">) => {
    return { ...property, id: Date.now().toString() } as PropertyUnit;
  };
  const updateProperty = async (_id: string, _property: Partial<PropertyUnit>) => {};
  const deleteProperty = async (_id: string) => {};
  const deleteStructure = async (_name: string) => {};

  const createPackage = async (pkg: Omit<Package, "id" | "receivedAt">) => {
    try {
      const prop = properties.find(p => p.id === pkg.propertyId || p.name === pkg.propertyId || p.path === pkg.propertyId);
      const uuidPropertyId = prop ? prop.id : pkg.propertyId;

      const payload = {
        propertyId: uuidPropertyId,
        recipientName: pkg.recipientName,
        trackingNumber: pkg.trackingNumber,
        company: pkg.company,
        observations: pkg.observations || undefined
      };

      const res = await apiClient.post<any>("/access/packages", payload);
      
      const newPkg: Package = {
        id: res.id,
        tenantId: res.tenantId || tenantId,
        propertyId: res.propertyId || pkg.propertyId,
        recipientName: res.recipientName,
        trackingNumber: res.trackingNumber,
        company: res.company,
          status: res.status,
          receivedAt: formatFriendlyDateTime(res.receivedAt) || "Hoy",
          deliveredAt: formatFriendlyDateTime(res.deliveredAt),
          observations: res.observations
      };
      setPackages(prev => {
        if (prev.some(p => p.id === newPkg.id)) return prev;
        return [newPkg, ...prev];
      });
      return newPkg;
    } catch (err) {
      console.error("Error creating package in backend:", err);
      // Fallback local
      const newPkg = { ...pkg, id: Date.now().toString(), receivedAt: "Hoy" } as Package;
      setPackages(prev => [newPkg, ...prev]);
      return newPkg;
    }
  };

  const createBatchPackages = async (packagesList: Array<Omit<Package, "id" | "receivedAt">>) => {
    try {
      const createdPkgs: Package[] = [];
      for (const pkg of packagesList) {
        const prop = properties.find(p => p.id === pkg.propertyId || p.name === pkg.propertyId || p.path === pkg.propertyId);
        const uuidPropertyId = prop ? prop.id : pkg.propertyId;

        const res = await apiClient.post<any>("/access/packages", {
          propertyId: uuidPropertyId,
          recipientName: pkg.recipientName,
          trackingNumber: pkg.trackingNumber,
          company: pkg.company,
          observations: pkg.observations || undefined
        });

        createdPkgs.push({
          id: res.id,
          tenantId: res.tenantId || tenantId,
          propertyId: res.propertyId || pkg.propertyId,
          recipientName: res.recipientName,
          trackingNumber: res.trackingNumber,
          company: res.company,
          status: res.status,
          receivedAt: formatFriendlyDateTime(res.receivedAt) || "Hoy",
          deliveredAt: formatFriendlyDateTime(res.deliveredAt),
          observations: res.observations
        });
      }
      setPackages(prev => {
        const newOnes = createdPkgs.filter(cp => !prev.some(p => p.id === cp.id));
        return [...newOnes, ...prev];
      });
      return createdPkgs;
    } catch (err) {
      console.error("Error creating batch packages in backend:", err);
      const newPkgs = packagesList.map((pkg, i) => ({ ...pkg, id: Date.now().toString() + i, receivedAt: "Hoy" } as Package));
      setPackages(prev => [...newPkgs, ...prev]);
      return newPkgs;
    }
  };

  const updatePackage = (id: string, pkg: Partial<Package>) => {
    // There is no update endpoint yet, fallback local
    setPackages(prev => prev.map(p => p.id === id ? { ...p, ...pkg } : p));
  };

  const deletePackage = (id: string) => {
    // There is no delete endpoint yet, fallback local
    setPackages(prev => prev.filter(p => p.id !== id));
  };

  const markPackageDelivered = async (id: string) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, status: "DELIVERED", deliveredAt: formatFriendlyDateTime(new Date().toISOString()) } : p));
    try {
      await apiClient.post(`/access/packages/${id}/deliver`);
    } catch (err) {
      console.warn("No se pudo marcar entrega en backend:", err);
    }
  };

  const deliverAllUnitPackages = async (propertyId: string) => {
    let count = 0;
    const pkgsToDeliver = packages.filter(p => p.propertyId === propertyId && p.status !== 'DELIVERED');
    for (const pkg of pkgsToDeliver) {
      await markPackageDelivered(pkg.id);
      count++;
    }
    return count;
  };

  const createVisitor = async (visitor: Omit<Visitor, "id">) => {
    try {
      // Intentar encontrar el propertyId original (UUID)
      const prop = properties.find(p => p.id === visitor.propertyId || p.name === visitor.propertyId || p.path === visitor.propertyId);
      const uuidPropertyId = prop ? prop.id : visitor.propertyId;

      const payload = {
        name: visitor.name,
        documentId: visitor.documentId,
        propertyId: uuidPropertyId,
        vehiclePlate: visitor.vehiclePlate || undefined,
        expectedAt: visitor.expectedAt && visitor.expectedAt.includes('Hoy') ? undefined : visitor.expectedAt,
        observations: visitor.observations || undefined,
        visitPurpose: visitor.visitPurpose || 'Visita',
      };

      // Se guarda como Pendiente o Autorizado según el endpoint
      const res = await apiClient.post<any>("/access/visitors?isPreAuthorized=false", payload);

      // Si en el formulario dijeron que ya ingresó, lo ingresamos
      if (visitor.status === 'ENTERED' && res.id) {
        await apiClient.post(`/access/visitors/${res.id}/entry`);
      }
      
      return res;
    } catch (err) {
      console.error("Error al crear visitante en backend:", err);
      // Fallback local
      const newVis = { ...visitor, id: Date.now().toString() } as Visitor;
      setVisitors(prev => [newVis, ...prev]);
      return newVis;
    }
  };

  const createGroupVisit = async (visitDetails: any, persons: any[]): Promise<Visitor[]> => {
    const groupId = `GRP-${Date.now()}`;

    // Si es residente, persistir en backend de forma segura (sin IDOR)
    if (isResident) {
      try {
        const createdPromises = persons.map(p =>
          visitorService.createMyVisitor({
            name: p.name,
            documentId: p.documentId,
            vehiclePlate: p.vehiclePlate || undefined,
            expectedAt: visitDetails.expectedAt,
              observations: visitDetails.observations || undefined,
            visitPurpose: visitDetails.visitPurpose || 'Visita',
            groupId: persons.length > 1 ? groupId : undefined,
            groupName: visitDetails.groupName || undefined,
          })
        );
        const savedVisitors = await Promise.all(createdPromises);
        setVisitors(prev => {
          const newOnes = savedVisitors.filter(sv => !prev.some(v => v.id === sv.id));
          return [...newOnes, ...prev];
        });
        return savedVisitors;
      } catch (err) {
        console.error("Error al persistir visitas en backend:", err);
      }
    }

    // Fallback local en memoria
    const createdVisitors: Visitor[] = persons.map((p, idx) => {
      const id = `${Date.now()}-${idx}`;
      return {
        id,
        tenantId,
        propertyId: visitDetails.propertyId || user?.residentPropertyId,
        name: p.name,
        documentId: p.documentId,
        vehiclePlate: p.vehiclePlate || '',
        status: 'APPROVED',
        expectedAt: visitDetails.expectedAt,
              observations: visitDetails.observations || '',
        visitPurpose: visitDetails.visitPurpose || 'Visita familiar',
        groupId: persons.length > 1 ? groupId : undefined,
        groupName: visitDetails.groupName,
        qrCode: `QR-${id.replace(/-/g, '').toUpperCase()}`,
      } as Visitor;
    });

    setVisitors(prev => [...createdVisitors, ...prev]);
    return createdVisitors;
  };

  const updateVisitor = async (id: string, visitor: Partial<Visitor>) => {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, ...visitor, expectedAt: formatFriendlyDateTime(visitor.expectedAt) || v.expectedAt } : v));
    if (isResident) {
      try {
        await visitorService.updateMyVisitor(id, {
          name: visitor.name,
          documentId: visitor.documentId,
          vehiclePlate: visitor.vehiclePlate || undefined,
          expectedAt: visitor.expectedAt,
          observations: visitor.observations || undefined,
          visitPurpose: visitor.visitPurpose || undefined,
        });
      } catch (err) {
        console.warn("Error al sincronizar actualización de visita en backend:", err);
      }
    }
  };

  const deleteVisitor = async (id: string) => {
    if (isResident) {
      // Esperar confirmacion del backend ANTES de actualizar la UI
      await visitorService.deleteMyVisitor(id);
      setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: 'CANCELLED' } : v));
    } else {
      setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: 'CANCELLED' } : v));
    }
  };
  const recordVisitorEntry = async (id: string) => {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: "ENTERED", enteredAt: new Date().toISOString() } : v));
    try {
      await apiClient.post(`/access/visitors/${id}/entry`);
    } catch (err) {
      console.warn("No se pudo registrar ingreso en backend:", err);
    }
  };
  const recordGroupEntry = (_groupId: string) => {};
  const recordVisitorExit = async (id: string) => {
    setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: "EXITED", exitedAt: new Date().toISOString() } : v));
    try {
      await apiClient.post(`/access/visitors/${id}/exit`);
    } catch (err) {
      console.warn("No se pudo registrar salida en backend:", err);
    }
  };

  const createPQRS = (req: Omit<RequestPQRS, "id" | "createdAt" | "updatedAt">) => {
    const newReq = { ...req, id: Date.now().toString(), createdAt: "Hoy", updatedAt: "Hoy" } as RequestPQRS;
    setPqrsList(prev => [newReq, ...prev]);
    return newReq;
  };
  const updatePQRS = (id: string, req: Partial<RequestPQRS>) => {
    setPqrsList(prev => prev.map(p => p.id === id ? { ...p, ...req } : p));
  };
  const deletePQRS = (id: string) => {
    setPqrsList(prev => prev.filter(p => p.id !== id));
  };
  const resolvePQRS = (id: string, notes?: string) => {
    setPqrsList(prev => prev.map(p => p.id === id ? { ...p, status: "RESOLVED", responseNotes: notes } : p));
  };

  const createReservation = async (resv: Omit<Reservation, "id">) => {
    try {
      // Find the UUID for the property
      const prop = properties.find(p => p.id === resv.propertyId || p.name === resv.propertyId || p.path === resv.propertyId);
      const uuidPropertyId = prop ? prop.id : resv.propertyId;

      // Find the UUID for the zone
      const zone = commonZones.find(z => z.id === resv.commonZoneId || z.name === resv.zone);
      const uuidZoneId = zone ? zone.id : resv.commonZoneId;

      let finalPropertyId = uuidPropertyId;

      // Fallback for demo residents with missing or invalid propertyId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!finalPropertyId || !uuidRegex.test(finalPropertyId)) {
        if (properties.length > 0) {
          finalPropertyId = properties[0].id;
        } else {
          console.error(`Invalid Property UUID: ${finalPropertyId}`);
          throw new Error("ID de inmueble inválido");
        }
      }

      if (!uuidZoneId || !uuidRegex.test(uuidZoneId)) {
        console.error(`Invalid Zone UUID: ${uuidZoneId}`);
        throw new Error("ID de zona inválido");
      }

      const payload = {
        commonZoneId: uuidZoneId,
        propertyId: finalPropertyId,
        reservationDate: resv.date,
        startTime: resv.startTime,
        endTime: resv.endTime,
        guestsCount: resv.guestsCount || resv.attendeesCount || 1,
        observations: resv.observations || resv.notes || ''
      };
      
      const response = await apiClient.post<any>("/reservations", payload);
      
      const newResv: Reservation = {
        id: response.id,
        tenantId: response.tenantId || tenantId,
        commonZoneId: response.commonZoneId,
        zone: response.commonZoneName || resv.zone,
        propertyId: response.propertyName || response.propertyNumber || resv.propertyId,
        residentName: response.residentName || resv.residentName,
        date: response.date,
        startTime: response.startTime,
        endTime: response.endTime,
        status: response.status || 'Pendiente', // Defaults to Pendiente from backend
        totalCost: response.totalCost || 0,
        guestsCount: response.attendeesCount || response.guestsCount,
        observations: response.observations,
      };

      setReservations(prev => [newResv, ...prev]);
      return newResv;
    } catch (err) {
      console.error("Error creating reservation in backend:", err);
      // Fallback local memory
      const newResv = { ...resv, status: 'PENDING', id: Date.now().toString() } as Reservation;
      setReservations(prev => [newResv, ...prev]);
      return newResv;
    }
  };
  const updateReservation = async (id: string, resv: Partial<Reservation>) => {
    try {
      // NOTA: El endpoint puede variar según el backend, pero asumiremos PUT /reservations/{id}
      await apiClient.put(`/reservations/${id}`, resv);
      setReservations(prev => prev.map(r => r.id === id ? { ...r, ...resv } : r));
    } catch (err) {
      console.error("Error al actualizar reserva en el backend:", err);
      setReservations(prev => prev.map(r => r.id === id ? { ...r, ...resv } : r));
    }
  };
  const deleteReservation = async (id: string) => {
    try {
      await apiClient.delete(`/reservations/${id}`);
      setReservations(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Error al eliminar reserva en el backend:", err);
      setReservations(prev => prev.filter(r => r.id !== id));
    }
  };
  const changeReservationStatus = async (id: string, status: Reservation["status"], notes?: string) => {
    try {
      if (status === 'Confirmada') {
        const query = notes ? `?notes=${encodeURIComponent(notes)}` : '';
        await apiClient.post(`/reservations/${id}/confirm${query}`);
      } else if (status === 'Cancelada' || status === 'Rechazada') {
        const endpoint = status === 'Rechazada' ? 'reject' : 'cancel';
        const query = notes ? `?notes=${encodeURIComponent(notes)}` : '';
        await apiClient.post(`/reservations/${id}/${endpoint}${query}`);
      }
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status, adminNotes: notes ?? r.adminNotes } : r));
    } catch (err) {
      console.error("Error al cambiar estado de reserva en el backend:", err);
      // Fallback a actualización local si el backend falla
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status, adminNotes: notes ?? r.adminNotes } : r));
    }
  };

  const createCommunication = async (comm: Omit<Communication, "id" | "createdAt">) => {
    const newComm = { ...comm, id: Date.now().toString(), createdAt: "Hoy" } as Communication;
    setCommunications(prev => [newComm, ...prev]);
    
    try {
      const saved = await apiClient.post<any>("/communications", comm);
      if (saved && saved.id) {
         setCommunications(prev => prev.map(c => c.id === newComm.id ? {
           ...c,
           id: saved.id,
           createdAt: saved.createdAt
         } : c));
      }
    } catch (e) {
      console.error("Error creating communication", e);
    }
    return newComm;
  };
  const updateCommunication = async (id: string, comm: Partial<Communication>) => {
    setCommunications(prev => prev.map(c => c.id === id ? { ...c, ...comm } : c));
    try {
      await apiClient.put(`/communications/${id}`, comm);
    } catch (e) {
      console.error("Error updating communication", e);
    }
  };
  const deleteCommunication = async (id: string) => {
    setCommunications(prev => prev.filter(c => c.id !== id));
    try {
      await apiClient.delete(`/communications/${id}`);
    } catch (e) {
      console.error("Error deleting communication", e);
    }
  };

  const createDocument = (doc: Omit<CommunityDocument, "id" | "uploadedAt" | "downloadsCount">) => {
    const newDoc = { ...doc, id: Date.now().toString(), uploadedAt: "Hoy", downloadsCount: 0 } as CommunityDocument;
    setDocuments(prev => [newDoc, ...prev]);
    // Send to backend
    apiClient.post<any>("/communications/documents", {
      title: doc.title,
      category: doc.category,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      fileUrl: doc.fileUrl || "https://example.com/dummy.pdf", // Fallback for safety
      storageKey: doc.storageKey,
      description: doc.description || ""
    }).then(res => {
      // Replace optimistic ID with real ID
      setDocuments(prev => prev.map(d => d.id === newDoc.id ? { 
        ...d, 
        id: res.id,
        uploadedAt: res.createdAt ? res.createdAt.split("T")[0] : d.uploadedAt
      } : d));
    }).catch(e => console.error("Error creating document", e));
    return newDoc;
  };

  const updateDocument = (id: string, doc: Partial<CommunityDocument>) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...doc } : d));
    apiClient.put(`/communications/documents/${id}`, doc).catch(e => console.error("Error updating document", e));
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    apiClient.delete(`/communications/documents/${id}`).catch(e => console.error("Error deleting document", e));
  };

  const incrementDocumentDownload = (id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, downloadsCount: (d.downloadsCount || 0) + 1 } : d));
    apiClient.post(`/communications/documents/${id}/download`).catch(e => console.error("Error downloading document", e));
  };

  const resetToInitialData = () => {};

  return (
    <DataContext.Provider
      value={{
        residents,
        properties,
        packages,
        visitors,
        pqrsList,
        reservations,
        commonZones,
        fetchCommonZones,
        communications,
        documents,
        createResident,
        updateResident,
        deleteResident,
        createProperty,
        updateProperty,
        deleteProperty,
        deleteStructure,
        createPackage,
        createBatchPackages,
        updatePackage,
        deletePackage,
        markPackageDelivered,
        deliverAllUnitPackages,
        createVisitor,
        createGroupVisit,
        updateVisitor,
        deleteVisitor,
        recordVisitorEntry,
        recordGroupEntry,
        recordVisitorExit,
        createPQRS,
        updatePQRS,
        deletePQRS,
        resolvePQRS,
        createReservation,
        updateReservation,
        deleteReservation,
        changeReservationStatus,
        createCommunication,
        updateCommunication,
        deleteCommunication,
        createDocument,
        updateDocument,
        deleteDocument,
        incrementDocumentDownload,
        panicAlerts,
        activePanicAlerts,
        createEmergencyAlert,
        resetToInitialData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};















