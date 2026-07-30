// Cosmos Catcher — mini jogo em Canvas puro.
// Você controla a espaçonave sáfica. Colete cristais (+pontos),
// desvie de meteoros (-vida). Guarda o recorde no localStorage.
(function () {
  const canvas = document.getElementById("jogo-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("jogo-score-value");
  const bestEl = document.getElementById("jogo-best-value");
  const startBtn = document.getElementById("jogo-start");

  const W = canvas.width;
  const H = canvas.height;

  const STORAGE_KEY = "cosmos-catcher-best";
  let best = Number(localStorage.getItem(STORAGE_KEY) || 0);
  bestEl.textContent = best;

  // Paleta da bandeira sáfica — o jogo herda a identidade visual do site.
  const FLAG = ["#d54b1a", "#ff8a2a", "#ffffff", "#c05aa8", "#b3116d"];

  const state = {
    running: false,
    score: 0,
    lives: 3,
    ship: { x: W / 2, y: H - 46, w: 46, h: 30, targetX: W / 2 },
    entities: [],
    stars: [],
    spawnTimer: 0,
    lastTs: 0,
    keys: { left: false, right: false },
  };

  for (let i = 0; i < 90; i++) {
    state.stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 20 + 6,
      hue: Math.random() < 0.15 ? "#ff8a2a" : "#ffffff",
    });
  }

  function reset() {
    state.score = 0;
    state.lives = 3;
    state.entities.length = 0;
    state.ship.x = W / 2;
    state.ship.targetX = W / 2;
    scoreEl.textContent = 0;
  }

  function spawnEntity() {
    const isCrystal = Math.random() < 0.62;
    state.entities.push({
      type: isCrystal ? "crystal" : "meteor",
      x: Math.random() * (W - 40) + 20,
      y: -20,
      r: isCrystal ? 10 : 14,
      vy: isCrystal ? 110 + Math.random() * 60 : 140 + Math.random() * 90,
      rot: 0,
      spin: (Math.random() - 0.5) * 3,
    });
  }

  function drawStars(dt) {
    for (const star of state.stars) {
      star.y += star.speed * dt;
      if (star.y > H) {
        star.y = 0;
        star.x = Math.random() * W;
      }
      ctx.fillStyle = star.hue;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShip() {
    const { x, y, w, h } = state.ship;
    ctx.save();
    ctx.translate(x, y);
    // Rastro de propulsão (2 chamas nas cores da bandeira)
    const trailH = 14 + Math.sin(performance.now() / 90) * 3;
    const grad = ctx.createLinearGradient(0, h / 2, 0, h / 2 + trailH);
    grad.addColorStop(0, "#ff8a2a");
    grad.addColorStop(1, "rgba(255, 138, 42, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-8, h / 2);
    ctx.lineTo(0, h / 2 + trailH);
    ctx.lineTo(8, h / 2);
    ctx.closePath();
    ctx.fill();

    // Corpo da nave em forma de losango com faixas da bandeira
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
    ctx.clip();

    const stripes = 5;
    const colors = ["#d54b1a", "#ff8a2a", "#ffffff", "#c05aa8", "#b3116d"];
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(-w / 2, -h / 2 + (h / stripes) * i, w, h / stripes + 0.5);
    }
    ctx.restore();

    // Contorno
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w / 2, 0);
    ctx.lineTo(0, h / 2);
    ctx.lineTo(-w / 2, 0);
    ctx.closePath();
    ctx.stroke();

    // Cockpit
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCrystal(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot);
    ctx.fillStyle = "#ff8a2a";
    ctx.strokeStyle = "#ffe0c2";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -e.r);
    ctx.lineTo(e.r * 0.7, 0);
    ctx.lineTo(0, e.r);
    ctx.lineTo(-e.r * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawMeteor(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot);
    const grad = ctx.createRadialGradient(-e.r / 3, -e.r / 3, 2, 0, 0, e.r);
    grad.addColorStop(0, "#7d1f52");
    grad.addColorStop(1, "#3d0d29");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b3116d";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Cratera
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(-e.r / 2.5, -e.r / 3, e.r / 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHearts() {
    for (let i = 0; i < 3; i++) {
      const filled = i < state.lives;
      ctx.fillStyle = filled ? "#ff5aa1" : "rgba(255, 255, 255, 0.2)";
      const cx = 20 + i * 24;
      const cy = 22;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 5);
      ctx.bezierCurveTo(cx, cy - 4, cx - 12, cy - 4, cx - 6, cy + 4);
      ctx.bezierCurveTo(cx - 2, cy + 9, cx, cy + 10, cx, cy + 12);
      ctx.bezierCurveTo(cx, cy + 10, cx + 2, cy + 9, cx + 6, cy + 4);
      ctx.bezierCurveTo(cx + 12, cy - 4, cx, cy - 4, cx, cy + 5);
      ctx.fill();
    }
  }

  function gameOverScreen() {
    ctx.fillStyle = "rgba(11, 5, 16, 0.75)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe9d8";
    ctx.font = "700 34px Fraunces, Georgia, serif";
    ctx.fillText("Fim da órbita", W / 2, H / 2 - 14);
    ctx.font = "500 15px Inter, sans-serif";
    ctx.fillStyle = "#ffb890";
    ctx.fillText(`Você fez ${state.score} pontos.`, W / 2, H / 2 + 14);
    ctx.fillText("Clique em Jogar para reiniciar.", W / 2, H / 2 + 36);
  }

  function idleScreen() {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe9d8";
    ctx.font = "700 30px Fraunces, Georgia, serif";
    ctx.fillText("Cosmos Catcher", W / 2, H / 2 - 10);
    ctx.font = "500 14px Inter, sans-serif";
    ctx.fillStyle = "rgba(255, 233, 216, 0.75)";
    ctx.fillText("Colete cristais laranja, desvie dos meteoros rosa.", W / 2, H / 2 + 16);
    ctx.fillText("Setas ou toque no canvas.", W / 2, H / 2 + 36);
  }

  function update(dt) {
    if (!state.running) return;

    // Movimento da nave
    if (state.keys.left) state.ship.targetX -= 320 * dt;
    if (state.keys.right) state.ship.targetX += 320 * dt;
    state.ship.targetX = Math.max(state.ship.w / 2, Math.min(W - state.ship.w / 2, state.ship.targetX));
    state.ship.x += (state.ship.targetX - state.ship.x) * Math.min(1, dt * 12);

    // Spawn
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEntity();
      state.spawnTimer = Math.max(0.32, 0.85 - state.score * 0.006);
    }

    for (const e of state.entities) {
      e.y += e.vy * dt;
      e.rot += e.spin * dt;
    }

    // Colisões
    for (const e of state.entities) {
      const dx = e.x - state.ship.x;
      const dy = e.y - state.ship.y;
      const rr = (e.r + 16) * (e.r + 16);
      if (dx * dx + dy * dy < rr) {
        if (e.type === "crystal") {
          state.score += 10;
          scoreEl.textContent = state.score;
          e.y = H + 100;
        } else {
          state.lives -= 1;
          e.y = H + 100;
          if (state.lives <= 0) {
            state.running = false;
            if (state.score > best) {
              best = state.score;
              localStorage.setItem(STORAGE_KEY, String(best));
              bestEl.textContent = best;
            }
            startBtn.textContent = "Jogar de novo";
          }
        }
      }
    }

    // Limpeza
    state.entities = state.entities.filter((e) => e.y < H + 40);
  }

  function render(dt) {
    ctx.fillStyle = "#0b0510";
    ctx.fillRect(0, 0, W, H);
    drawStars(dt);

    for (const e of state.entities) {
      if (e.type === "crystal") drawCrystal(e);
      else drawMeteor(e);
    }

    drawShip();
    drawHearts();

    // Score em cima
    ctx.textAlign = "right";
    ctx.fillStyle = "#ffe9d8";
    ctx.font = "700 22px Fraunces, Georgia, serif";
    ctx.fillText(state.score, W - 20, 32);

    if (!state.running) {
      if (state.score > 0 || state.lives <= 0) gameOverScreen();
      else idleScreen();
    }
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - state.lastTs) / 1000 || 0);
    state.lastTs = ts;
    update(dt);
    render(dt);
    requestAnimationFrame(loop);
  }

  // Controles
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") state.keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d") state.keys.right = true;
    if (state.running && (e.key.startsWith("Arrow"))) e.preventDefault();
  });
  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") state.keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d") state.keys.right = false;
  });

  function setShipFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const scale = W / rect.width;
    state.ship.targetX = (clientX - rect.left) * scale;
  }
  canvas.addEventListener("pointerdown", (e) => {
    setShipFromClientX(e.clientX);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons !== 0 || e.pointerType === "touch") setShipFromClientX(e.clientX);
  });

  startBtn.addEventListener("click", () => {
    reset();
    state.running = true;
    startBtn.textContent = "Reiniciar";
  });

  requestAnimationFrame(loop);
})();
