// Types for Asambleas y Encuestas en Vivo (Live Polls)

export type AssemblyType = 'ORDINARIA' | 'EXTRAORDINARIA';
export type AssemblyModality = 'PRESENCIAL' | 'VIRTUAL' | 'MIXTA';
export type AssemblyStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'ENDED';

export type PollType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
export type PollStatus = 'DRAFT' | 'SCHEDULED' | 'LIVE' | 'CLOSED';

export interface PollOption {
  id: string;
  text: string;
  votesCount: number;
  percentage: number;
}

export interface Poll {
  id: string;
  tenantId: string;
  assemblyId: string;
  assemblyTitle: string;
  question: string;
  type: PollType;
  options: PollOption[];
  status: PollStatus;
  showResultsToResidents: boolean;
  totalVotes: number;
  totalEligible: number; // e.g. 428 unidades
  participationRate: number; // e.g. 42.7%
  createdAt: string;
  openedAt?: string;
  closedAt?: string;
  durationMinutes?: number;
}

export interface Assembly {
  id: string;
  tenantId: string;
  title: string; // e.g. "Asamblea General Ordinaria 2026"
  type: AssemblyType;
  modality: AssemblyModality;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AssemblyStatus;
  totalProperties: number; // 428
  registeredAttendees: number; // 187
  quorumPercentage: number; // 43.69%
  pollsCount: number;
  description?: string;
}

export interface VoteRecord {
  pollId: string;
  propertyUnit: string; // e.g. "Torre 2 - 504"
  residentName: string;
  selectedOptionIds: string[];
  votedAt: string;
}
