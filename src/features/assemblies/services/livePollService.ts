import type { Poll } from '../types/assembly.types';

type PollListener = (poll: Poll) => void;
type GlobalLiveListener = (livePoll: Poll | null) => void;

class LivePollService {
  private pollListeners: Map<string, Set<PollListener>> = new Map();
  private globalListeners: Set<GlobalLiveListener> = new Set();

  constructor() {
    window.addEventListener('POLL_CREATED', (e: any) => this.broadcast(e.detail as Poll));
    window.addEventListener('POLL_UPDATED', (e: any) => this.broadcast(e.detail as Poll));
  }

  subscribe(pollId: string, listener: PollListener): () => void {
    if (!this.pollListeners.has(pollId)) {
      this.pollListeners.set(pollId, new Set());
    }
    this.pollListeners.get(pollId)!.add(listener);

    return () => {
      this.pollListeners.get(pollId)?.delete(listener);
    };
  }

  subscribeToLivePoll(listener: GlobalLiveListener): () => void {
    this.globalListeners.add(listener);
    return () => {
      this.globalListeners.delete(listener);
    };
  }

  broadcast(poll: Poll): void {
    // Notify poll-specific listeners
    const specific = this.pollListeners.get(poll.id);
    if (specific) {
      specific.forEach((listener) => {
        try {
          listener({ ...poll });
        } catch (e) {
          console.error('Error notifying poll listener:', e);
        }
      });
    }

    // Notify global listeners
    this.globalListeners.forEach((listener) => {
      try {
        listener(poll.status === 'LIVE' ? { ...poll } : null);
      } catch (e) {
        console.error('Error notifying global listener:', e);
      }
    });
  }
}

export const livePollService = new LivePollService();
