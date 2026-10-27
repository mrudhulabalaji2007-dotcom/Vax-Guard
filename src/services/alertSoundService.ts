// Browser-Based Web Audio Synthesizer for Cold-Chain Critical Temperature Alerts
// Zero external audio dependencies - 100% synthetic, zero-latency medical monitor alarm tones

class AlertSoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.75; // 0.0 to 1.0
  private alarmInterval: number | null = null;
  private isAlarmLooping: boolean = false;
  private listeners: Set<(state: { isPlaying: boolean; isMuted: boolean; volume: number }) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('vaxguard_sound_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('vaxguard_sound_volume');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v)) {
          this.volume = Math.max(0.1, Math.min(1.0, v));
        }
      }
    }
  }

  // Subscribe to sound state changes
  public subscribe(listener: (state: { isPlaying: boolean; isMuted: boolean; volume: number }) => void) {
    this.listeners.add(listener);
    listener({ isPlaying: this.isAlarmLooping, isMuted: this.isMuted, volume: this.volume });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = { isPlaying: this.isAlarmLooping, isMuted: this.isMuted, volume: this.volume };
    this.listeners.forEach((fn) => fn(state));
  }

  // Lazy-initialize and resume AudioContext on user interaction
  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public isPlaying(): boolean {
    return this.isAlarmLooping;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('vaxguard_sound_muted', String(muted));
    }
    if (muted) {
      this.stopAlarm();
    }
    this.notify();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0.05, Math.min(1.0, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('vaxguard_sound_volume', String(this.volume));
    }
    this.notify();
  }

  // Plays a tri-tone pulsing medical/industrial temperature excursion alarm
  // Pulse 1: 880Hz (A5), Pulse 2: 1175Hz (D6), Pulse 3: 1397Hz (F6)
  public playCriticalSpikeTone() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(this.volume * 0.5, now);

      // --- Pulse 1 (880 Hz - Urgent Warning Root) ---
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(960, now + 0.12);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(1, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.15);

      // --- Pulse 2 (1175 Hz - Excursion Peak) ---
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(1175, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(1280, now + 0.30);

      gain2.gain.setValueAtTime(0, now + 0.18);
      gain2.gain.linearRampToValueAtTime(1, now + 0.20);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.33);

      // --- Pulse 3 (1397 Hz - High Frequency Siren Strobe) ---
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1397, now + 0.36);

      gain3.gain.setValueAtTime(0, now + 0.36);
      gain3.gain.linearRampToValueAtTime(0.85, now + 0.38);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.50);

      osc3.connect(gain3);
      gain3.connect(masterGain);
      osc3.start(now + 0.36);
      osc3.stop(now + 0.51);
    } catch (err) {
      console.warn('AudioContext playback notice:', err);
    }
  }

  // Play softer informational chime (e.g. For Acknowledged or Normal warning)
  public playNoticeTone() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.setValueAtTime(this.volume * 0.35, now);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18); // A5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Starts the repeating alarm loop (every 1.5 seconds)
  public startCriticalAlarm(alertContext?: string) {
    if (this.isMuted) return;

    // Make sure AudioContext is initialized/resumed
    this.getAudioContext();

    if (!this.isAlarmLooping) {
      this.isAlarmLooping = true;
      this.notify();

      // Trigger first blast
      this.playCriticalSpikeTone();

      // Clear any prior interval
      if (this.alarmInterval !== null) {
        clearInterval(this.alarmInterval);
      }

      // Interval repeat every 1.5 seconds
      this.alarmInterval = window.setInterval(() => {
        this.playCriticalSpikeTone();
      }, 1500);

      // Auto-silence safety watchdog after 45 seconds so it doesn't ring indefinitely if unattended
      setTimeout(() => {
        if (this.isAlarmLooping) {
          this.stopAlarm();
        }
      }, 45000);
    }
  }

  // Stop and silence the alarm
  public stopAlarm() {
    if (this.alarmInterval !== null) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    if (this.isAlarmLooping) {
      this.isAlarmLooping = false;
      this.notify();
    }
  }
}

export const alertSoundService = new AlertSoundService();
