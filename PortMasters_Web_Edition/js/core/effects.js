/* Juice: sound, screen shake, and the particle burst. */
"use strict";
(function () {
  const PM = (window.PM = window.PM || {});

  /* One shared audio context for the whole session. Creating one per sound
     hits the browser's context limit after a handful of actions, which is why
     the chime used to stop playing mid game. */
  let audioCtx = null;

  function triggerJuice() {
    playSound();
    shakeWindow();
    particleBurst();
  }

  function playSound() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtx;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {}
  }

  function shakeWindow() {
    document.getElementById("app").classList.add("shake");
    setTimeout(
      () => document.getElementById("app").classList.remove("shake"),
      300,
    );
  }

  function particleBurst() {
    const canvas = document.getElementById("particles-canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2,
      cy = canvas.height / 2;
    const particles = [];
    const colors = ["#FFD700", "#FFA500", "#4CAF50", "#2E5AA7", "#FFFFFF"];
    const emojis = ["✨", "⭐", "💫", "🪙", "🎋"];
    for (let i = 0; i < 35; i++) {
      particles.push({
        x: cx,
        y: cy,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 4,
        r: 5 + Math.random() * 10,
        color: PM.choice(colors),
        life: 1,
      });
    }
    const texts = [];
    for (let i = 0; i < 5; i++) {
      texts.push({
        x: cx + (Math.random() - 0.5) * 80,
        y: cy + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 6,
        vy: -2 - Math.random() * 3,
        emoji: PM.choice(emojis),
        life: 1,
      });
    }
    let step = 0;
    const animate = () => {
      if (step++ > 30) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.5;
        p.life -= 0.03;
        if (p.life > 0) {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (const t of texts) {
        t.x += t.vx;
        t.y += t.vy;
        t.life -= 0.03;
        if (t.life > 0) {
          ctx.globalAlpha = t.life;
          ctx.font = "24px sans-serif";
          ctx.fillText(t.emoji, t.x, t.y);
        }
      }
      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };
    animate();
  }

  PM.triggerJuice = triggerJuice;
})();
