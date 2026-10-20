/**
 * Sound notification helper using standard browser Web Audio API.
 * Synthesizes a gentle, pleasant notification chime without external assets.
 */
export const playValidationChime = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number, peakVolume = 0.12) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peakVolume, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    };

    // Ascending melodic chord (C5 -> E5 -> G5) for an uplifting notification
    playTone(523.25, now, 0.28, 0.12); // C5
    playTone(659.25, now + 0.1, 0.35, 0.14); // E5
    playTone(783.99, now + 0.22, 0.5, 0.15); // G5
  } catch {
    // Gracefully ignore browsers blocking audio autoplay
  }
};
