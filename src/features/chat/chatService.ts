import { apiClient } from '../../api/apiClient';
import { activeUnitStore } from '../resident/unit/activeUnitStore';
import type {
  ChatAgent, ChatConversation, ChatEventEntry, ChatMessagesPage, ChatResidentOption, ChatSendResult, InboxFilter, Page,
} from './chatTypes';

/** Fase 3 — API del chat. El backend decide comunidad, unidad y permisos; el cliente solo elige entre lo suyo. */

export interface MessagesQuery {
  before?: number;
  after?: number;
  size?: number;
}

const q = (m?: MessagesQuery) => ({ before: m?.before, after: m?.after, size: m?.size });

export const residentChatService = {
  list: () => apiClient.get<ChatConversation[]>('/chat/me/conversations'),
  /** La unidad del envío es la activa de la pestaña (X-Property-Id); el backend la valida contra las del residente. */
  send: (body: string, clientMessageId: string, unitId?: string | null) =>
    apiClient.post<ChatSendResult>('/chat/me/messages', { body, clientMessageId },
      { unitId: unitId ?? activeUnitStore.getActiveUnitId() }),
  messages: (conversationId: string, m?: MessagesQuery) =>
    apiClient.get<ChatMessagesPage>(`/chat/me/conversations/${conversationId}/messages`, q(m)),
  read: (conversationId: string, upToSeq: number) =>
    apiClient.post<ChatConversation>(`/chat/me/conversations/${conversationId}/read`, { upToSeq }),
};

export const staffChatService = {
  inbox: (filter: InboxFilter, search: string, page = 0, size = 30) =>
    apiClient.get<Page<ChatConversation>>('/chat/inbox/conversations', { filter, q: search || undefined, page, size }),
  get: (id: string) => apiClient.get<ChatConversation>(`/chat/inbox/conversations/${id}`),
  start: (propertyId: string, residentUserId: string) =>
    apiClient.post<ChatConversation>('/chat/inbox/conversations', { propertyId, residentUserId }),
  messages: (id: string, m?: MessagesQuery) =>
    apiClient.get<ChatMessagesPage>(`/chat/inbox/conversations/${id}/messages`, q(m)),
  events: (id: string) => apiClient.get<ChatEventEntry[]>(`/chat/inbox/conversations/${id}/events`),
  send: (id: string, body: string, clientMessageId: string) =>
    apiClient.post<ChatSendResult>(`/chat/inbox/conversations/${id}/messages`, { body, clientMessageId }),
  claim: (id: string) => apiClient.post<ChatConversation>(`/chat/inbox/conversations/${id}/claim`),
  release: (id: string) => apiClient.post<ChatConversation>(`/chat/inbox/conversations/${id}/release`),
  transfer: (id: string, toUserId: string) =>
    apiClient.post<ChatConversation>(`/chat/inbox/conversations/${id}/transfer`, { toUserId }),
  close: (id: string) => apiClient.post<ChatConversation>(`/chat/inbox/conversations/${id}/close`),
  read: (id: string, upToSeq: number) =>
    apiClient.post<ChatConversation>(`/chat/inbox/conversations/${id}/read`, { upToSeq }),
  agents: () => apiClient.get<ChatAgent[]>('/chat/inbox/agents'),
  residents: (search: string) =>
    apiClient.get<ChatResidentOption[]>('/chat/inbox/residents', { q: search || undefined }),
};
