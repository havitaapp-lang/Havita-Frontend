import type { Poll, PollOption, VoteRecord } from '../types/assembly.types';
import { livePollService } from './livePollService';
import { apiClient } from '../../../api/apiClient';

/** Fase 2 / E3 (D5): una unidad del residente frente a una pregunta (GET /assemblies/polls/{id}/my-voting-units). */
export interface MyVotingUnit {
  propertyId: string;
  label: string;
  number: string;
  relations: string[];
  status: 'VOTED' | 'PENDING' | 'NOT_ELIGIBLE' | 'CLOSED';
  hasVoted: boolean;
  canVote: boolean;
  reasonCode?: string | null;
  reasonMessage?: string | null;
}

class PollService {
  private mapPoll(data: any): Poll {
    const rawCoef = Number(data.totalVotedCoefficient || 0);
    const participationRate = rawCoef > 0 && rawCoef <= 1.0 
      ? Number((rawCoef * 100).toFixed(1)) 
      : Number(rawCoef.toFixed(1));

    let formattedCreatedAt = data.createdAt;
    if (data.createdAt) {
      try {
        const d = new Date(data.createdAt);
        if (!isNaN(d.getTime())) {
          formattedCreatedAt = d.toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        }
      } catch {
        // fallback
      }
    }

    return {
      ...data,
      totalEligible: 100, // Hardcoded for now, or fetch from assembly
      participationRate: participationRate || 0,
      createdAt: formattedCreatedAt || data.createdAt || '',
      rawCreatedAt: data.createdAt,
    };
  }

  async getPolls(assemblyId?: string): Promise<Poll[]> {
    try {
      if (assemblyId) {
        const data = await apiClient.get<any[]>('/assemblies/' + assemblyId + '/polls');
        return (data || []).map((p: any) => this.mapPoll(p));
      }
      const data = await apiClient.get<any[]>('/assemblies/polls');
      return (data || []).map((p: any) => this.mapPoll(p));
    } catch (err) {
      console.warn("Could not fetch polls from backend:", err);
      return [];
    }
  }

  async getPollById(id: string): Promise<Poll | null> {
    const data = await apiClient.get<any>('/assemblies/polls/' + id);
    return data ? this.mapPoll(data) : null;
  }

  async getActiveLivePoll(): Promise<Poll | null> {
    try {
      const assemblies = await apiClient.get<any>('/assemblies');
      if (!assemblies || !Array.isArray(assemblies.content)) return null;
      
      const activeAssembly = assemblies.content.find((a: any) => a.status === 'IN_PROGRESS');
      if (!activeAssembly) return null;
      
      const data = await apiClient.get<any[]>('/assemblies/' + activeAssembly.id + '/polls');
      if (Array.isArray(data)) {
        const live = data.find((p) => p.status === 'LIVE');
        return live ? this.mapPoll(live) : null;
      }
    } catch (e) {
      console.warn("Could not get active live poll:", e);
    }
    return null;
  }

  async createPoll(data: {
    assemblyId: string;
    assemblyTitle: string;
    question: string;
    type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
    options: string[];
    showResultsToResidents: boolean;
    publishImmediately: boolean;
    durationMinutes?: number;
  }): Promise<Poll> {
    const req = {
      assemblyId: data.assemblyId,
      question: data.question,
      type: data.type,
      showResultsToResidents: data.showResultsToResidents,
      durationMinutes: data.durationMinutes,
      options: data.options
    };
    const newPoll = await apiClient.post<any>('/assemblies/polls', req);
    if (data.publishImmediately) {
      const published = await this.publishPoll(newPoll.id);
      return published || this.mapPoll(newPoll);
    }
    return this.mapPoll(newPoll);
  }

  async publishPoll(id: string): Promise<Poll | null> {
    const data = await apiClient.post<any>('/assemblies/polls/' + id + '/open', {});
    return data ? this.mapPoll(data) : null;
  }

  async closePoll(id: string): Promise<Poll | null> {
    const data = await apiClient.post<any>('/assemblies/polls/' + id + '/close', {});
    return data ? this.mapPoll(data) : null;
  }

  async submitVote(
    pollId: string,
    optionId: string,
    propertyId: string, // Changed to UUID propertyId
    residentName: string
  ): Promise<{ success: boolean; poll: Poll }> {
    const req = {
      propertyId: propertyId,
      optionIds: [optionId]
    };
    const poll = await apiClient.post<any>('/assemblies/polls/' + pollId + '/vote', req);
    // Fase 2 / E5: sin marca en localStorage; el estado de voto de cada unidad se lee siempre del backend.
    return { success: true, poll: this.mapPoll(poll) };
  }

  /** Fase 2 / E3: estado de voto de cada unidad del residente, según el backend (la fuente de verdad). */
  async getMyVotingUnits(pollId: string): Promise<MyVotingUnit[]> {
    const data = await apiClient.get<MyVotingUnit[]>('/assemblies/polls/' + pollId + '/my-voting-units');
    return Array.isArray(data) ? data : [];
  }

}

/** Fase 2 / E5: clave de React Query del estado de voto de las unidades del residente en una pregunta. */
export const myVotingUnitsKey = (pollId: string) => ['myVotingUnits', pollId] as const;

export const pollService = new PollService();


