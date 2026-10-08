import type { Poll, PollOption, VoteRecord } from '../types/assembly.types';
import { livePollService } from './livePollService';
import { apiClient } from '../../../api/apiClient';

class PollService {
  private mapPoll(data: any): Poll {
    return {
      ...data,
      totalEligible: 100, // Hardcoded for now, or fetch from assembly
      participationRate: data.totalVotedCoefficient || 0,
    };
  }

  async getPolls(assemblyId?: string): Promise<Poll[]> {
    if (assemblyId) {
      const data = await apiClient.get<any[]>('/assemblies/' + assemblyId + '/polls');
      return (data || []).map((p: any) => this.mapPoll(p));
    }
    return []; // We don't fetch all polls across assemblies for now
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
    
    // Save per-property vote flag in localStorage for quick frontend checks
    localStorage.setItem('havita_voted_' + pollId + '_' + propertyId, optionId);
    
    return { success: true, poll: this.mapPoll(poll) };
  }

  hasPropertyVoted(pollId: string, propertyId: string): boolean {
    const localFlag = localStorage.getItem('havita_voted_' + pollId + '_' + propertyId);
    return !!localFlag;
  }

  getPropertyVote(pollId: string, propertyId: string): string | null {
    return localStorage.getItem('havita_voted_' + pollId + '_' + propertyId);
  }
}

export const pollService = new PollService();


