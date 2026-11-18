/** Fase 3 — chat interno residente ↔ portería (solo texto). Contrato de /api/v1/chat. */

export type ChatStatus = 'PENDING' | 'ACTIVE' | 'CLOSED';
export type ChatAuthorRole = 'RESIDENT' | 'STAFF';

export interface ChatConversation {
  id: string;
  status: ChatStatus;
  propertyId: string;
  unitLabel: string | null;
  residentUserId: string;
  residentName: string;
  /** Solo en la vista de portería (el residente no recibe datos del personal). */
  assignedToUserId: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  /** Alguien de portería la atiende (ACTIVE). */
  attended: boolean;
  lastMessageSeq: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageAuthorRole: ChatAuthorRole | null;
  /** No leídos de quien consulta. */
  unread: number;
  /** Hasta qué mensaje ha leído quien consulta. */
  readSeq: number;
  createdAt: string;
  closedAt: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  seq: number;
  authorRole: ChatAuthorRole;
  authorUserId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
  clientMessageId: string | null;
  /** Solo en el cliente: envío optimista pendiente o fallido. */
  localState?: 'sending' | 'failed';
}

export interface ChatMessagesPage {
  messages: ChatMessage[];
  hasMore: boolean;
  conversation: ChatConversation;
}

export interface ChatSendResult {
  conversation: ChatConversation;
  message: ChatMessage;
  duplicate: boolean;
}

export interface ChatEventEntry {
  type: 'CREATED' | 'CLAIMED' | 'RELEASED' | 'TRANSFERRED' | 'AUTO_RELEASED' | 'CLOSED' | 'REOPENED';
  actorName: string | null;
  fromName: string | null;
  toName: string | null;
  at: string;
}

export interface ChatAgent {
  userId: string;
  name: string;
}

export interface ChatResidentOption {
  residentUserId: string;
  residentName: string;
  propertyId: string;
  unitLabel: string | null;
  conversationId: string | null;
}

export type InboxFilter = 'OPEN' | 'PENDING' | 'ACTIVE' | 'MINE' | 'CLOSED' | 'ALL';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

/** Evento SSE del chat (CHAT_MESSAGE / CHAT_CONVERSATION_UPDATED). */
export interface ChatSsePayload {
  conversation: ChatConversation;
  message?: ChatMessage;
}

export const CHAT_MAX_LENGTH = 1000;
export const CHAT_EVENT_MESSAGE = 'CHAT_MESSAGE';
export const CHAT_EVENT_CONVERSATION = 'CHAT_CONVERSATION_UPDATED';
