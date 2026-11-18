/**
 * Web Audio API based ringtone and ringback generator.
 * Self-contained: works across modern browsers without external audio files.
 */
class IntercomAudioTone {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private isRunning = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.ctx || this.ctx.state === 'closed') {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    } catch (e) {
      console.warn('[IntercomAudioTone] AudioContext not available', e);
      return null;
    }
  }

  /**
   * Outgoing ringback tone: heard by the caller (portería) while the phone is ringing.
   * Dual-tone 440 Hz + 480 Hz for 1.2s, followed by 2.8s silence.
   */
  startOutgoingRingback() {
    this.stop();
    this.isRunning = true;

    const playPulse = () => {
      if (!this.isRunning) return;
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.setValueAtTime(0.08, now + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.4);
      osc2.stop(now + 1.4);
    };

    playPulse();
    this.intervalId = setInterval(playPulse, 4000);
  }

  /**
   * Incoming ringtone: heard by the resident receiving the call.
   * Intercom chime: two bright pulses (523 Hz - C5, 659 Hz - E5) every 2.5s.
   */
  startIncomingRingtone() {
    this.stop();
    this.isRunning = true;

    const playChime = () => {
      if (!this.isRunning) return;
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Pulse 1
      const osc1 = ctx.createOscillator();
      const osc1b = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1b.frequency.setValueAtTime(659.25, now); // E5

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.15, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc1.connect(gain1);
      osc1b.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1b.start(now);
      osc1.stop(now + 0.5);
      osc1b.stop(now + 0.5);

      // Pulse 2 (0.2s later)
      const osc2 = ctx.createOscillator();
      const osc2b = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.frequency.setValueAtTime(659.25, now + 0.2); // E5
      osc2b.frequency.setValueAtTime(783.99, now + 0.2); // G5

      gain2.gain.setValueAtTime(0, now + 0.2);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.23);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc2.connect(gain2);
      osc2b.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.2);
      osc2b.start(now + 0.2);
      osc2.stop(now + 0.8);
      osc2b.stop(now + 0.8);
    };

    playChime();
    this.intervalId = setInterval(playChime, 2500);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close();
      } catch {}
      this.ctx = null;
    }
  }
}

export const ringtoneAudio = new IntercomAudioTone();
