    // --- (1) Éxito
    function playSuccessSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        const osc = ctx.createOscillator(); 
        const gainNode = ctx.createGain(); 
        osc.type = "sine"; 
        osc.frequency.value = 800; 
        gainNode.gain.value = 1; 
        osc.connect(gainNode); 
        gainNode.connect(ctx.destination); 
        osc.start(); 
        osc.stop(ctx.currentTime + 0.25);
      } catch (e) {
        console.log("Error al reproducir sonido de éxito:", e);
      }
    }

    // --- (2) Error
    function playErrorSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        const osc = ctx.createOscillator(); 
        const gainNode = ctx.createGain(); 
        osc.type = "sawtooth"; 
        osc.frequency.setValueAtTime(300, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5); 
        gainNode.gain.value = 0.8; 
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5); 
        osc.connect(gainNode); 
        gainNode.connect(ctx.destination); 
        osc.start(); 
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
        console.log("Error al reproducir sonido de error:", e);
      }
    }

    // --- (3) Carga
    function playChimeSound() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const freqs = [880, 1320, 1760];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.1);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.9, now + i * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.6);
        });
      } catch (e) {
        console.log("Error al reproducir sonido de carga (chime):", e);
      }
    }

    // --- (4) Confirm
    function playConfirmArpeggio() {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const freqs = [523, 659, 784]; // C5, E5, G5
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.12);
          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.0001, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.8, now + i * 0.12 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.4);
        });
      } catch (e) {
        console.log("Error al reproducir sonido de confirmación:", e);
      }
    }
