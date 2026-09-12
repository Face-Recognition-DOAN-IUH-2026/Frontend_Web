/**
 * Web Audio API Dual-Tone Fire Alarm Siren
 * Bộ tạo âm thanh còi báo cháy khẩn cấp mô phỏng hệ thống báo động PCCC thực tế
 * Tần số luân chuyển giữa 770Hz và 960Hz.
 */

class FireAlarmAudioController {
  private ctx: AudioContext | null = null;
  private intervalId: any = null;
  private isPlaying: boolean = false;
  private isMuted: boolean = false;

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public start() {
    if (this.isPlaying || this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    this.isPlaying = true;
    let highTone = true;

    const playBeep = () => {
      if (!this.ctx || !this.isPlaying || this.isMuted) return;

      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(highTone ? 960 : 770, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.4);

        highTone = !highTone;
      } catch (err) {
        console.warn("[FireAlarmAudio] Error playing tone:", err);
      }
    };

    playBeep();
    this.intervalId = setInterval(playBeep, 450);
  }

  public stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stop();
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }
}

export const fireAlarmAudio = new FireAlarmAudioController();
