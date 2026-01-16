export class SoundManager {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.3; // Volume
    } catch (e) {
      console.warn('AudioContext not supported:', e);
    }
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioContext || !this.gainNode) return;

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(this.gainNode);
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  playPegTick() {
    // Short, high-pitched tick
    this.playTone(800, 0.05, 'square');
  }

  playLanding() {
    // Celebratory chord
    this.playTone(440, 0.1, 'sine');
    setTimeout(() => this.playTone(554, 0.1, 'sine'), 50);
    setTimeout(() => this.playTone(659, 0.2, 'sine'), 100);
  }

  cleanup() {
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

