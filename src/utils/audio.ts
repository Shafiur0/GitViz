let audioCtx: AudioContext | null = null;

export const playClickSound = (): void => {
  try {
    // Lazy initialize to bypass browser autoplay restrictions
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const filterNode = audioCtx.createBiquadFilter();

    osc.type = 'triangle';
    // Slightly randomize frequency to sound like real keys
    const frequency = 800 + Math.random() * 400;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Apply bandpass filter to shape the keyclick texture
    filterNode.type = 'bandpass';
    filterNode.frequency.value = 1000;
    filterNode.Q.value = 1.5;

    // Fast volume envelope decay for click sound
    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);

    osc.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
  } catch (err) {
    console.warn('Audio click could not be played:', err);
  }
};
