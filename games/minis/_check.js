
(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const TILE = 40;
  const GRAV = 0.55, JUMP = -11.5, MOVE = 4.2, FRICTION = 0.82;
  const GROUND_Y = H - 80;
  const STORAGE_KEY = "superMarioLevels_v1";
  const PROGRESS_KEY = "superMarioProgress_v1";

  // ── Sprites (официальные арты из Super Mario + запасные) ──
  const imgMario = new Image();
  const imgMarioStill = new Image();
  const imgGoomba = new Image();
  const imgGoombaArt = new Image();
  const imgGoombaPx = new Image();
  const imgKoopa = new Image();
  const imgKoopaArt = new Image();
  const imgKoopaPx = new Image();
  const imgShell = new Image();
  const imgPiranha = new Image();
  const imgPiranhaArt = new Image();
  const imgBullet = new Image();
  const imgBulletArt = new Image();
  const imgSpiny = new Image();
  const imgSpinyArt = new Image();
  const imgMushroom = new Image();
  const imgStar = new Image();
  const img1up = new Image();
  const imgCoinArt = new Image();
  const imgQBlock = new Image();
  const imgBrickArt = new Image();
  imgMario.src = "mario_Big.png";
  imgMarioStill.src = "mario_art.png";
  imgGoomba.src = "mario_Goomba.png";
  imgGoombaArt.src = "art_goomba2.png"; // NSMBU Goomba
  imgGoombaPx.src = "goomba_art.png";
  imgKoopa.src = "FlappyTimeIco.gif";
  imgKoopaArt.src = "art_koopa.png"; // NSMBU Koopa Troopa
  imgKoopaPx.src = "enemy_koopa.png";
  imgShell.src = "art_shell.png";
  imgPiranha.src = "enemy_piranha.png";
  imgPiranhaArt.src = "art_piranha.png";
  imgBullet.src = "enemy_bullet.png";
  imgBulletArt.src = "art_bullet.png";
  imgSpiny.src = "enemy_spiny.png";
  imgSpinyArt.src = "art_spiny.png";
  imgMushroom.src = "art_mushroom.png";
  imgStar.src = "art_star.png";
  img1up.src = "art_1up.png";
  imgCoinArt.src = "art_coin.png";
  imgQBlock.src = "art_qblock.png";
  imgBrickArt.src = "art_brick.png";

  // ── Музыка из Super Mario (theme.mp3) ───────────────────
  const bgMusic = new Audio("theme.mp3");
  bgMusic.loop = true;
  bgMusic.volume = 0.4;
  bgMusic.preload = "auto";
  let musicStarted = false;
  let musicMuted = false;
  let sfxMuted = false;

  // ── SFX (Web Audio — монеты, гумбы, блоки, прыжок и т.д.) ──
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function sfxTone(freq, dur, type, vol, slideTo, when) {
    if (sfxMuted) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const t0 = (when != null ? when : 0) + ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    const v = vol == null ? 0.12 : vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function sfxNoise(dur, vol, freqHi) {
    if (sfxMuted) return;
    const ctx = ensureAudio();
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freqHi || 1200;
    filter.Q.value = 0.6;
    const g = ctx.createGain();
    const t0 = ctx.currentTime;
    g.gain.setValueAtTime(vol == null ? 0.18 : vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
  }

  const sfx = {
    jump() { sfxTone(320, 0.12, "square", 0.08, 520); },
    coin() {
      sfxTone(988, 0.07, "square", 0.1);
      sfxTone(1319, 0.16, "square", 0.09, null, 0.07);
    },
    bump() { sfxTone(140, 0.08, "triangle", 0.12, 90); sfxNoise(0.04, 0.06, 400); },
    brickBreak() {
      sfxNoise(0.18, 0.22, 900);
      sfxTone(180, 0.12, "sawtooth", 0.08, 60);
      sfxTone(120, 0.15, "square", 0.06, 40, 0.04);
    },
    stomp() {
      sfxTone(180, 0.06, "square", 0.1, 80);
      sfxTone(90, 0.12, "triangle", 0.12, 50, 0.04);
      sfxNoise(0.06, 0.1, 300);
    },
    kick() { sfxTone(220, 0.08, "square", 0.1, 140); sfxNoise(0.05, 0.08, 600); },
    powerup() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => sfxTone(f, 0.1, "square", 0.09, null, i * 0.08));
    },
    powerAppear() { sfxTone(400, 0.2, "square", 0.08, 700); },
    oneUp() {
      const notes = [523, 659, 784, 1047, 784, 1047];
      notes.forEach((f, i) => sfxTone(f, 0.12, "square", 0.09, null, i * 0.1));
    },
    star() {
      const notes = [784, 988, 1175, 1568];
      notes.forEach((f, i) => sfxTone(f, 0.08, "square", 0.08, null, i * 0.06));
    },
    hurt() { sfxTone(300, 0.15, "sawtooth", 0.1, 80); sfxTone(200, 0.2, "square", 0.08, 60, 0.08); },
    die() {
      sfxTone(400, 0.15, "square", 0.1, 200);
      sfxTone(300, 0.2, "square", 0.09, 120, 0.15);
      sfxTone(200, 0.35, "triangle", 0.1, 40, 0.3);
    },
    win() {
      const notes = [523, 659, 784, 1047, 784, 1047, 1319];
      notes.forEach((f, i) => sfxTone(f, 0.14, "square", 0.1, null, i * 0.11));
    },
    fire() { sfxTone(600, 0.05, "sawtooth", 0.06, 200); }, // star-kill ping
    mega() {
      // мощный «бум» + восходящие ноты
      sfxNoise(0.25, 0.28, 500);
      sfxTone(100, 0.2, "sawtooth", 0.14, 40);
      const notes = [196, 262, 330, 392, 523, 659];
      notes.forEach((f, i) => sfxTone(f, 0.12, "square", 0.1, null, 0.08 + i * 0.07));
    },
    megaStomp() {
      sfxNoise(0.14, 0.2, 700);
      sfxTone(90, 0.1, "triangle", 0.14, 40);
      sfxTone(140, 0.08, "square", 0.1, 50, 0.04);
    }
  };

  function startBgMusic() {
    if (musicMuted || musicStarted) return;
    musicStarted = true;
    const p = bgMusic.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => { musicStarted = false; });
    }
  }

  function toggleMusic() {
    musicMuted = !musicMuted;
    const btn = document.getElementById("btnMusic");
    if (musicMuted) {
      bgMusic.pause();
      sfxMuted = true;
      if (btn) btn.textContent = "🔇 Звук";
    } else {
      sfxMuted = false;
      musicStarted = true;
      ensureAudio();
      bgMusic.play().catch(() => { musicStarted = false; });
      if (btn) btn.textContent = "🔊 Звук";
    }
  }

  function unlockMusicOnce() {
    ensureAudio();
    if (!musicMuted) startBgMusic();
  }
  document.addEventListener("click", unlockMusicOnce);
  document.addEventListener("keydown", unlockMusicOnce);
  document.addEventListener("touchstart", unlockMusicOnce, { passive: true });

  const MARIO = {
    idle: [0, 0, 32, 32],
    jump: [192, 0, 32, 32],
    skid: [160, 0, 32, 32],
    move: [
      [64, 0, 32, 32],
      [128, 0, 32, 32],
      [96, 0, 32, 32]
    ]
  };
  const GOOMBA_WALK = [
    [0, 0, 16, 16],
    [16, 0, 16, 16]
  ];

  function updatePowerHud() {
    const el = document.getElementById("power");
    if (!el) return;
    if (megaTimer > 0) el.textContent = "🟣 МЕГА " + Math.ceil(megaTimer / 60) + "с";
    else if (starTimer > 0) el.textContent = "⭐ " + Math.ceil(starTimer / 60) + "с";
    else if (player && player.big) el.textContent = "🍄 БОЛЬШОЙ";
    else el.textContent = "—";
  }

  function isMega() {
    return megaTimer > 0;
  }

  function imgReady(img) {
    return !!(img && (img.complete !== false) && ((img.naturalWidth && img.naturalWidth > 0) || (img.width && img.width > 0)));
  }

  /** Рисует целую картинку (без source-rect), ноги внизу hitbox */
  function drawFullImage(img, dx, dy, dw, dh, flipX, filter) {
    if (!imgReady(img)) return false;
    ctx.save();
    if (filter) ctx.filter = filter;
    if (flipX) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, dw, dh);
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.restore();
    return true;
  }

  /** Красный (злой) Марио — та же картинка, но с красным фильтром */
  function drawRedMarioImage(dx, dy, dw, dh, flipX) {
    // сильный красный оттенок поверх спрайта
    const ok = drawFullImage(
      imgMarioStill, dx, dy, dw, dh, flipX,
      "sepia(1) hue-rotate(-50deg) saturate(6) brightness(0.85) contrast(1.15)"
    );
    if (ok) return true;
    return drawFullImage(
      imgMario, dx, dy, dw, dh, flipX,
      "sepia(1) hue-rotate(-50deg) saturate(6) brightness(0.85)"
    );
  }

  /** Запасной силуэт Марио (если картинки не загрузились) */
  function drawMarioSilhouette(px, py, f) {
    ctx.save();
    if (f < 0) {
      ctx.translate(px + 34, py);
      ctx.scale(-1, 1);
      px = 0; py = 0;
    }
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath();
    ctx.ellipse(px + 17, py + 46, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a2d0c";
    ctx.fillRect(px + 4, py + 38, 12, 8);
    ctx.fillRect(px + 18, py + 38, 12, 8);
    ctx.fillStyle = "#1e6bff";
    ctx.fillRect(px + 8, py + 22, 18, 18);
    ctx.fillStyle = "#e52521";
    ctx.fillRect(px + 6, py + 14, 22, 14);
    ctx.fillStyle = "#e52521";
    ctx.fillRect(px + 4, py + 2, 26, 12);
    ctx.fillRect(px + 4, py + 10, 10, 6);
    ctx.fillStyle = "#fccc99";
    ctx.fillRect(px + 10, py + 10, 16, 12);
    ctx.fillStyle = "#000";
    ctx.fillRect(px + 20, py + 13, 3, 4);
    ctx.fillStyle = "#5a2d0c";
    ctx.fillRect(px + 14, py + 18, 10, 2);
    ctx.restore();
  }

  function drawSprite(img, frame, dx, dy, dw, dh, flipX) {
    if (!imgReady(img)) return false;
    const [sx, sy, sw, sh] = frame;
    ctx.save();
    if (flipX) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
    } else {
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    ctx.restore();
    return true;
  }

  function marioFrame() {
    if (!player.onGround) return MARIO.jump;
    const running = Math.abs(player.vx) > 0.4;
    if (!running) return MARIO.idle;
    const i = Math.floor(anim / 5) % MARIO.move.length;
    return MARIO.move[i];
  }

  // ── Level data model ─────────────────────────────────────
  // Level object: { w, ground:[{x,w}], bricks:[{x,y,n}], questions:[{x,y}], pipes:[{x,h}], coins:[{x,y}], enemies:[{x,y,vx}], flagX }

  function emptyLevel(wTiles = 80) {
    return {
      w: wTiles * TILE,
      ground: [{ x: 0, w: wTiles * TILE }],
      bricks: [],
      questions: [],
      pipes: [],
      coins: [],
      enemies: [],
      powerups: [],
      flagX: (wTiles - 4) * TILE
    };
  }

  // 9 official levels inspired by classic Super Mario Bros progression
  const OFFICIAL = [];

  // Level 1 — easy intro (like 1-1)
  OFFICIAL[0] = {
    w: 80 * TILE,
    ground: [{ x: 0, w: 28 * TILE }, { x: 30 * TILE, w: 18 * TILE }, { x: 50 * TILE, w: 30 * TILE }],
    bricks: [
      { x: 6 * TILE, y: 7 * TILE, n: 1 },
      { x: 8 * TILE, y: 7 * TILE, n: 1 },
      { x: 10 * TILE, y: 7 * TILE, n: 1 },
      { x: 16 * TILE, y: 5 * TILE, n: 3 },
      { x: 36 * TILE, y: 7 * TILE, n: 2 },
      { x: 55 * TILE, y: 6 * TILE, n: 4 }
    ],
    questions: [
      { x: 7 * TILE, y: 7 * TILE },
      { x: 9 * TILE, y: 7 * TILE },
      { x: 8 * TILE, y: 4 * TILE },
      { x: 38 * TILE, y: 7 * TILE },
      { x: 57 * TILE, y: 4 * TILE }
    ],
    pipes: [
      { x: 12 * TILE, h: 80 },
      { x: 22 * TILE, h: 120 },
      { x: 42 * TILE, h: 100 },
      { x: 62 * TILE, h: 140 }
    ],
    coins: [
      ...Array.from({ length: 5 }, (_, i) => ({ x: 6 * TILE + i * 36, y: 6 * TILE })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 36 * TILE + i * 36, y: 6 * TILE })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 55 * TILE + i * 36, y: 5 * TILE }))
    ],
    enemies: [
      { x: 10 * TILE, y: GROUND_Y - 40, vx: -1.1 },
      { x: 18 * TILE, y: GROUND_Y - 40, vx: 1.0 },
      { x: 34 * TILE, y: GROUND_Y - 40, vx: -1.2 },
      { x: 52 * TILE, y: GROUND_Y - 40, vx: 1.1 }
    ],
    flagX: 74 * TILE
  };

  // Level 2 — more pipes & gaps
  OFFICIAL[1] = {
    w: 90 * TILE,
    ground: [
      { x: 0, w: 14 * TILE }, { x: 16 * TILE, w: 10 * TILE }, { x: 28 * TILE, w: 12 * TILE },
      { x: 42 * TILE, w: 16 * TILE }, { x: 60 * TILE, w: 30 * TILE }
    ],
    bricks: [
      { x: 5 * TILE, y: 6 * TILE, n: 4 },
      { x: 18 * TILE, y: 5 * TILE, n: 2 },
      { x: 32 * TILE, y: 7 * TILE, n: 3 },
      { x: 48 * TILE, y: 5 * TILE, n: 5 },
      { x: 68 * TILE, y: 6 * TILE, n: 3 }
    ],
    questions: [
      { x: 6 * TILE, y: 6 * TILE }, { x: 19 * TILE, y: 5 * TILE },
      { x: 33 * TILE, y: 4 * TILE }, { x: 50 * TILE, y: 5 * TILE },
      { x: 70 * TILE, y: 4 * TILE }
    ],
    pipes: [
      { x: 10 * TILE, h: 90 }, { x: 24 * TILE, h: 140 },
      { x: 36 * TILE, h: 100 }, { x: 54 * TILE, h: 160 }, { x: 76 * TILE, h: 110 }
    ],
    coins: [
      ...Array.from({ length: 6 }, (_, i) => ({ x: 5 * TILE + i * 34, y: 5 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 48 * TILE + i * 34, y: 4 * TILE })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 68 * TILE + i * 34, y: 5 * TILE }))
    ],
    enemies: [
      { x: 7 * TILE, y: GROUND_Y - 40, vx: -1.2 },
      { x: 19 * TILE, y: GROUND_Y - 40, vx: 1.2 },
      { x: 30 * TILE, y: GROUND_Y - 40, vx: -1.3 },
      { x: 46 * TILE, y: GROUND_Y - 40, vx: 1.1 },
      { x: 65 * TILE, y: GROUND_Y - 40, vx: -1.3 },
      { x: 72 * TILE, y: GROUND_Y - 40, vx: 1.2 }
    ],
    flagX: 84 * TILE
  };

  // Level 3 — staircase & high platforms
  OFFICIAL[2] = {
    w: 95 * TILE,
    ground: [
      { x: 0, w: 20 * TILE }, { x: 24 * TILE, w: 8 * TILE }, { x: 36 * TILE, w: 14 * TILE },
      { x: 54 * TILE, w: 10 * TILE }, { x: 68 * TILE, w: 27 * TILE }
    ],
    bricks: [
      // stairs up
      { x: 12 * TILE, y: GROUND_Y - TILE, n: 1 },
      { x: 13 * TILE, y: GROUND_Y - 2 * TILE, n: 1 },
      { x: 14 * TILE, y: GROUND_Y - 3 * TILE, n: 1 },
      { x: 15 * TILE, y: GROUND_Y - 4 * TILE, n: 1 },
      { x: 28 * TILE, y: 5 * TILE, n: 4 },
      { x: 40 * TILE, y: 6 * TILE, n: 3 },
      { x: 58 * TILE, y: 5 * TILE, n: 2 },
      { x: 72 * TILE, y: 6 * TILE, n: 5 },
      // end stairs to flag
      { x: 80 * TILE, y: GROUND_Y - TILE, n: 1 },
      { x: 81 * TILE, y: GROUND_Y - 2 * TILE, n: 1 },
      { x: 82 * TILE, y: GROUND_Y - 3 * TILE, n: 1 },
      { x: 83 * TILE, y: GROUND_Y - 4 * TILE, n: 1 }
    ],
    questions: [
      { x: 8 * TILE, y: 6 * TILE }, { x: 29 * TILE, y: 3 * TILE },
      { x: 41 * TILE, y: 4 * TILE }, { x: 74 * TILE, y: 4 * TILE }
    ],
    pipes: [
      { x: 18 * TILE, h: 100 }, { x: 46 * TILE, h: 130 }, { x: 64 * TILE, h: 90 }
    ],
    coins: [
      ...Array.from({ length: 4 }, (_, i) => ({ x: 12 * TILE + i * 36, y: GROUND_Y - 5 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 28 * TILE + i * 36, y: 4 * TILE })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 72 * TILE + i * 36, y: 5 * TILE }))
    ],
    enemies: [
      { x: 9 * TILE, y: GROUND_Y - 40, vx: -1.2 },
      { x: 26 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 38 * TILE, y: GROUND_Y - 40, vx: -1.2 },
      { x: 56 * TILE, y: GROUND_Y - 40, vx: 1.2 },
      { x: 70 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 76 * TILE, y: GROUND_Y - 40, vx: 1.2 }
    ],
    flagX: 90 * TILE
  };

  // Level 4 — coin heaven / floating
  OFFICIAL[3] = {
    w: 100 * TILE,
    ground: [
      { x: 0, w: 10 * TILE }, { x: 14 * TILE, w: 6 * TILE }, { x: 24 * TILE, w: 8 * TILE },
      { x: 36 * TILE, w: 6 * TILE }, { x: 46 * TILE, w: 10 * TILE }, { x: 60 * TILE, w: 8 * TILE },
      { x: 72 * TILE, w: 28 * TILE }
    ],
    bricks: [
      { x: 4 * TILE, y: 5 * TILE, n: 3 },
      { x: 16 * TILE, y: 4 * TILE, n: 2 },
      { x: 26 * TILE, y: 6 * TILE, n: 3 },
      { x: 38 * TILE, y: 4 * TILE, n: 2 },
      { x: 48 * TILE, y: 5 * TILE, n: 4 },
      { x: 62 * TILE, y: 4 * TILE, n: 3 },
      { x: 78 * TILE, y: 6 * TILE, n: 6 }
    ],
    questions: [
      { x: 5 * TILE, y: 5 * TILE }, { x: 17 * TILE, y: 4 * TILE },
      { x: 27 * TILE, y: 3 * TILE }, { x: 49 * TILE, y: 3 * TILE },
      { x: 80 * TILE, y: 4 * TILE }, { x: 82 * TILE, y: 4 * TILE }
    ],
    pipes: [
      { x: 8 * TILE, h: 80 }, { x: 50 * TILE, h: 120 }, { x: 86 * TILE, h: 100 }
    ],
    coins: [
      ...Array.from({ length: 8 }, (_, i) => ({ x: 4 * TILE + i * 32, y: 4 * TILE })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 46 * TILE + i * 32, y: 4 * TILE })),
      ...Array.from({ length: 8 }, (_, i) => ({ x: 74 * TILE + i * 32, y: 5 * TILE }))
    ],
    enemies: [
      { x: 5 * TILE, y: GROUND_Y - 40, vx: -1.2 },
      { x: 16 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 28 * TILE, y: GROUND_Y - 40, vx: -1.2 },
      { x: 48 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 64 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 76 * TILE, y: GROUND_Y - 40, vx: 1.2 },
      { x: 82 * TILE, y: GROUND_Y - 40, vx: -1.3 }
    ],
    flagX: 94 * TILE
  };

  // Level 5 — pipe maze
  OFFICIAL[4] = {
    w: 105 * TILE,
    ground: [
      { x: 0, w: 22 * TILE }, { x: 26 * TILE, w: 20 * TILE },
      { x: 50 * TILE, w: 18 * TILE }, { x: 72 * TILE, w: 33 * TILE }
    ],
    bricks: [
      { x: 6 * TILE, y: 6 * TILE, n: 2 },
      { x: 30 * TILE, y: 5 * TILE, n: 3 },
      { x: 54 * TILE, y: 6 * TILE, n: 4 },
      { x: 78 * TILE, y: 5 * TILE, n: 3 },
      { x: 90 * TILE, y: 4 * TILE, n: 2 }
    ],
    questions: [
      { x: 7 * TILE, y: 4 * TILE }, { x: 31 * TILE, y: 5 * TILE },
      { x: 56 * TILE, y: 4 * TILE }, { x: 80 * TILE, y: 3 * TILE }
    ],
    pipes: [
      { x: 4 * TILE, h: 70 }, { x: 10 * TILE, h: 110 }, { x: 16 * TILE, h: 150 },
      { x: 28 * TILE, h: 90 }, { x: 36 * TILE, h: 140 }, { x: 42 * TILE, h: 100 },
      { x: 52 * TILE, h: 80 }, { x: 60 * TILE, h: 160 }, { x: 66 * TILE, h: 120 },
      { x: 76 * TILE, h: 100 }, { x: 84 * TILE, h: 140 }, { x: 94 * TILE, h: 90 }
    ],
    coins: [
      ...Array.from({ length: 5 }, (_, i) => ({ x: 5 * TILE + i * 40, y: 5 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 30 * TILE + i * 40, y: 4 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 54 * TILE + i * 40, y: 5 * TILE })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 88 * TILE + i * 36, y: 3 * TILE }))
    ],
    enemies: [
      { x: 8 * TILE, y: GROUND_Y - 40, vx: -1.2 },
      { x: 14 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 32 * TILE, y: GROUND_Y - 40, vx: -1.3 },
      { x: 40 * TILE, y: GROUND_Y - 40, vx: 1.2 },
      { x: 56 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 64 * TILE, y: GROUND_Y - 40, vx: 1.2 },
      { x: 80 * TILE, y: GROUND_Y - 40, vx: -1.3 },
      { x: 92 * TILE, y: GROUND_Y - 40, vx: 1.3 }
    ],
    flagX: 100 * TILE
  };

  // Level 6 — hard jumps
  OFFICIAL[5] = {
    w: 110 * TILE,
    ground: [
      { x: 0, w: 8 * TILE }, { x: 11 * TILE, w: 5 * TILE }, { x: 19 * TILE, w: 5 * TILE },
      { x: 27 * TILE, w: 6 * TILE }, { x: 36 * TILE, w: 4 * TILE }, { x: 43 * TILE, w: 6 * TILE },
      { x: 52 * TILE, w: 5 * TILE }, { x: 60 * TILE, w: 8 * TILE }, { x: 72 * TILE, w: 6 * TILE },
      { x: 82 * TILE, w: 28 * TILE }
    ],
    bricks: [
      { x: 4 * TILE, y: 5 * TILE, n: 2 },
      { x: 20 * TILE, y: 4 * TILE, n: 2 },
      { x: 38 * TILE, y: 5 * TILE, n: 1 },
      { x: 54 * TILE, y: 4 * TILE, n: 2 },
      { x: 74 * TILE, y: 5 * TILE, n: 3 },
      { x: 88 * TILE, y: 6 * TILE, n: 4 }
    ],
    questions: [
      { x: 5 * TILE, y: 5 * TILE }, { x: 21 * TILE, y: 4 * TILE },
      { x: 45 * TILE, y: 4 * TILE }, { x: 75 * TILE, y: 3 * TILE },
      { x: 90 * TILE, y: 4 * TILE }
    ],
    pipes: [
      { x: 30 * TILE, h: 100 }, { x: 64 * TILE, h: 120 }, { x: 96 * TILE, h: 90 }
    ],
    coins: [
      ...Array.from({ length: 3 }, (_, i) => ({ x: 12 * TILE + i * 30, y: 5 * TILE })),
      ...Array.from({ length: 3 }, (_, i) => ({ x: 28 * TILE + i * 30, y: 5 * TILE })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 53 * TILE + i * 30, y: 3 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 86 * TILE + i * 32, y: 5 * TILE }))
    ],
    enemies: [
      { x: 4 * TILE, y: GROUND_Y - 40, vx: -1.3 },
      { x: 13 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 28 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 45 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 62 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 74 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 86 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 94 * TILE, y: GROUND_Y - 40, vx: 1.3 }
    ],
    flagX: 104 * TILE
  };

  // Level 7 — fortress style (darker bricks dense)
  OFFICIAL[6] = {
    w: 115 * TILE,
    ground: [
      { x: 0, w: 30 * TILE }, { x: 34 * TILE, w: 24 * TILE },
      { x: 62 * TILE, w: 20 * TILE }, { x: 86 * TILE, w: 29 * TILE }
    ],
    bricks: [
      { x: 4 * TILE, y: 7 * TILE, n: 8 },
      { x: 4 * TILE, y: 4 * TILE, n: 3 },
      { x: 14 * TILE, y: 5 * TILE, n: 5 },
      { x: 22 * TILE, y: 3 * TILE, n: 4 },
      { x: 36 * TILE, y: 6 * TILE, n: 6 },
      { x: 40 * TILE, y: 3 * TILE, n: 3 },
      { x: 48 * TILE, y: 5 * TILE, n: 4 },
      { x: 64 * TILE, y: 6 * TILE, n: 5 },
      { x: 70 * TILE, y: 3 * TILE, n: 4 },
      { x: 88 * TILE, y: 5 * TILE, n: 6 },
      { x: 96 * TILE, y: 3 * TILE, n: 3 },
      // end tower
      { x: 104 * TILE, y: GROUND_Y - TILE, n: 1 },
      { x: 105 * TILE, y: GROUND_Y - 2 * TILE, n: 1 },
      { x: 106 * TILE, y: GROUND_Y - 3 * TILE, n: 1 },
      { x: 107 * TILE, y: GROUND_Y - 4 * TILE, n: 1 },
      { x: 108 * TILE, y: GROUND_Y - 5 * TILE, n: 1 }
    ],
    questions: [
      { x: 6 * TILE, y: 4 * TILE }, { x: 16 * TILE, y: 5 * TILE },
      { x: 38 * TILE, y: 3 * TILE }, { x: 50 * TILE, y: 3 * TILE },
      { x: 66 * TILE, y: 3 * TILE }, { x: 90 * TILE, y: 3 * TILE },
      { x: 98 * TILE, y: 3 * TILE }
    ],
    pipes: [
      { x: 10 * TILE, h: 100 }, { x: 28 * TILE, h: 130 },
      { x: 54 * TILE, h: 110 }, { x: 78 * TILE, h: 150 }, { x: 100 * TILE, h: 90 }
    ],
    coins: [
      ...Array.from({ length: 7 }, (_, i) => ({ x: 4 * TILE + i * 34, y: 6 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 36 * TILE + i * 34, y: 5 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 64 * TILE + i * 34, y: 5 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 88 * TILE + i * 34, y: 4 * TILE }))
    ],
    enemies: [
      { x: 8 * TILE, y: GROUND_Y - 40, vx: -1.3 },
      { x: 16 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 24 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 38 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 46 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 66 * TILE, y: GROUND_Y - 40, vx: 1.3 },
      { x: 74 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 90 * TILE, y: GROUND_Y - 40, vx: 1.4 },
      { x: 98 * TILE, y: GROUND_Y - 40, vx: -1.3 }
    ],
    flagX: 110 * TILE
  };

  // Level 8 — expert
  OFFICIAL[7] = {
    w: 120 * TILE,
    ground: [
      { x: 0, w: 6 * TILE }, { x: 9 * TILE, w: 4 * TILE }, { x: 16 * TILE, w: 4 * TILE },
      { x: 23 * TILE, w: 5 * TILE }, { x: 31 * TILE, w: 3 * TILE }, { x: 37 * TILE, w: 5 * TILE },
      { x: 45 * TILE, w: 4 * TILE }, { x: 52 * TILE, w: 6 * TILE }, { x: 61 * TILE, w: 4 * TILE },
      { x: 68 * TILE, w: 5 * TILE }, { x: 76 * TILE, w: 4 * TILE }, { x: 84 * TILE, w: 8 * TILE },
      { x: 96 * TILE, w: 24 * TILE }
    ],
    bricks: [
      { x: 3 * TILE, y: 5 * TILE, n: 1 },
      { x: 11 * TILE, y: 4 * TILE, n: 1 },
      { x: 18 * TILE, y: 5 * TILE, n: 2 },
      { x: 33 * TILE, y: 4 * TILE, n: 1 },
      { x: 46 * TILE, y: 3 * TILE, n: 2 },
      { x: 54 * TILE, y: 5 * TILE, n: 2 },
      { x: 70 * TILE, y: 4 * TILE, n: 2 },
      { x: 86 * TILE, y: 5 * TILE, n: 3 },
      { x: 100 * TILE, y: 6 * TILE, n: 5 },
      { x: 108 * TILE, y: GROUND_Y - TILE, n: 1 },
      { x: 109 * TILE, y: GROUND_Y - 2 * TILE, n: 1 },
      { x: 110 * TILE, y: GROUND_Y - 3 * TILE, n: 1 },
      { x: 111 * TILE, y: GROUND_Y - 4 * TILE, n: 1 }
    ],
    questions: [
      { x: 4 * TILE, y: 5 * TILE }, { x: 19 * TILE, y: 3 * TILE },
      { x: 47 * TILE, y: 3 * TILE }, { x: 71 * TILE, y: 4 * TILE },
      { x: 102 * TILE, y: 4 * TILE }
    ],
    pipes: [
      { x: 25 * TILE, h: 110 }, { x: 56 * TILE, h: 140 },
      { x: 88 * TILE, h: 100 }, { x: 106 * TILE, h: 120 }
    ],
    coins: [
      ...Array.from({ length: 3 }, (_, i) => ({ x: 10 * TILE + i * 28, y: 3 * TILE })),
      ...Array.from({ length: 3 }, (_, i) => ({ x: 38 * TILE + i * 28, y: 4 * TILE })),
      ...Array.from({ length: 4 }, (_, i) => ({ x: 68 * TILE + i * 28, y: 3 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 98 * TILE + i * 32, y: 5 * TILE }))
    ],
    enemies: [
      { x: 3 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 11 * TILE, y: GROUND_Y - 40, vx: 1.4 },
      { x: 24 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 38 * TILE, y: GROUND_Y - 40, vx: 1.4 },
      { x: 54 * TILE, y: GROUND_Y - 40, vx: -1.5 },
      { x: 70 * TILE, y: GROUND_Y - 40, vx: 1.4 },
      { x: 86 * TILE, y: GROUND_Y - 40, vx: -1.5 },
      { x: 98 * TILE, y: GROUND_Y - 40, vx: 1.4 },
      { x: 104 * TILE, y: GROUND_Y - 40, vx: -1.4 }
    ],
    flagX: 114 * TILE
  };

  // Level 9 — final castle-ish gauntlet
  OFFICIAL[8] = {
    w: 130 * TILE,
    ground: [
      { x: 0, w: 12 * TILE }, { x: 15 * TILE, w: 8 * TILE }, { x: 26 * TILE, w: 10 * TILE },
      { x: 40 * TILE, w: 6 * TILE }, { x: 50 * TILE, w: 12 * TILE }, { x: 66 * TILE, w: 8 * TILE },
      { x: 78 * TILE, w: 10 * TILE }, { x: 92 * TILE, w: 8 * TILE }, { x: 104 * TILE, w: 26 * TILE }
    ],
    bricks: [
      { x: 4 * TILE, y: 6 * TILE, n: 4 },
      { x: 8 * TILE, y: 3 * TILE, n: 2 },
      { x: 17 * TILE, y: 5 * TILE, n: 3 },
      { x: 28 * TILE, y: 4 * TILE, n: 4 },
      { x: 32 * TILE, y: 7 * TILE, n: 2 },
      { x: 42 * TILE, y: 5 * TILE, n: 2 },
      { x: 52 * TILE, y: 6 * TILE, n: 5 },
      { x: 56 * TILE, y: 3 * TILE, n: 3 },
      { x: 68 * TILE, y: 5 * TILE, n: 3 },
      { x: 80 * TILE, y: 4 * TILE, n: 4 },
      { x: 94 * TILE, y: 6 * TILE, n: 3 },
      { x: 108 * TILE, y: 5 * TILE, n: 6 },
      // final stairs
      { x: 118 * TILE, y: GROUND_Y - TILE, n: 1 },
      { x: 119 * TILE, y: GROUND_Y - 2 * TILE, n: 1 },
      { x: 120 * TILE, y: GROUND_Y - 3 * TILE, n: 1 },
      { x: 121 * TILE, y: GROUND_Y - 4 * TILE, n: 1 },
      { x: 122 * TILE, y: GROUND_Y - 5 * TILE, n: 1 },
      { x: 123 * TILE, y: GROUND_Y - 6 * TILE, n: 1 }
    ],
    questions: [
      { x: 5 * TILE, y: 6 * TILE }, { x: 9 * TILE, y: 3 * TILE },
      { x: 18 * TILE, y: 3 * TILE }, { x: 30 * TILE, y: 4 * TILE },
      { x: 54 * TILE, y: 3 * TILE }, { x: 70 * TILE, y: 3 * TILE },
      { x: 82 * TILE, y: 4 * TILE }, { x: 110 * TILE, y: 3 * TILE },
      { x: 112 * TILE, y: 3 * TILE }
    ],
    pipes: [
      { x: 10 * TILE, h: 90 }, { x: 22 * TILE, h: 130 }, { x: 36 * TILE, h: 110 },
      { x: 48 * TILE, h: 150 }, { x: 62 * TILE, h: 100 }, { x: 74 * TILE, h: 140 },
      { x: 88 * TILE, h: 120 }, { x: 100 * TILE, h: 100 }, { x: 116 * TILE, h: 90 }
    ],
    coins: [
      ...Array.from({ length: 6 }, (_, i) => ({ x: 4 * TILE + i * 32, y: 5 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 28 * TILE + i * 32, y: 3 * TILE })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 52 * TILE + i * 32, y: 5 * TILE })),
      ...Array.from({ length: 5 }, (_, i) => ({ x: 80 * TILE + i * 32, y: 3 * TILE })),
      ...Array.from({ length: 6 }, (_, i) => ({ x: 106 * TILE + i * 32, y: 4 * TILE }))
    ],
    enemies: [
      { x: 6 * TILE, y: GROUND_Y - 40, vx: -1.4 },
      { x: 16 * TILE, y: GROUND_Y - 40, vx: 1.4 },
      { x: 28 * TILE, y: GROUND_Y - 40, vx: -1.5 },
      { x: 34 * TILE, y: GROUND_Y - 40, vx: 1.4 },
      { x: 52 * TILE, y: GROUND_Y - 40, vx: -1.5 },
      { x: 58 * TILE, y: GROUND_Y - 40, vx: 1.4 },
      { x: 70 * TILE, y: GROUND_Y - 40, vx: -1.5 },
      { x: 82 * TILE, y: GROUND_Y - 40, vx: 1.5 },
      { x: 96 * TILE, y: GROUND_Y - 40, vx: -1.5 },
      { x: 108 * TILE, y: GROUND_Y - 40, vx: 1.4 },
      { x: 114 * TILE, y: GROUND_Y - 40, vx: -1.5 }
    ],
    flagX: 124 * TILE
  };

  // Разнообразные враги + бонусы из ?-блоков
  function spiceOfficialEnemies() {
    for (let i = 0; i < OFFICIAL.length; i++) {
      const lv = OFFICIAL[i];
      const list = lv.enemies || [];
      list.forEach((e, j) => {
        if (e.kind) return;
        const roll = (j + i) % 5;
        if (roll === 1) e.kind = "koopa";
        else if (roll === 3 && i >= 2) e.kind = "spiny";
        else e.kind = "goomba";
        if (e.kind === "koopa" && e.y === GROUND_Y - 40) e.y = GROUND_Y - 48;
        if (e.kind === "spiny" && e.y === GROUND_Y - 40) e.y = GROUND_Y - 36;
      });
      const pipes = lv.pipes || [];
      for (let p = 0; p < pipes.length; p += 2) {
        const pipe = pipes[p];
        list.push({
          x: pipe.x + 14,
          y: GROUND_Y - pipe.h - 8,
          baseY: GROUND_Y - pipe.h - 8,
          kind: "piranha",
          vx: 0
        });
      }
      if (i >= 1) {
        list.push({ x: levelSpawnX(lv, 0.35), y: 140 + (i % 3) * 40, kind: "bullet", vx: -3 - i * 0.1 });
      }
      if (i >= 4) {
        list.push({ x: levelSpawnX(lv, 0.65), y: 180 + (i % 2) * 50, kind: "bullet", vx: -3.4 });
      }
      if (i >= 6) {
        list.push({ x: levelSpawnX(lv, 0.5), y: 120, kind: "bullet", vx: 3.2 });
      }
      // спини на сложных уровнях
      if (i >= 2) {
        list.push({ x: levelSpawnX(lv, 0.42), y: GROUND_Y - 36, kind: "spiny", vx: -1.0 });
      }
      if (i >= 5) {
        list.push({ x: levelSpawnX(lv, 0.7), y: GROUND_Y - 36, kind: "spiny", vx: 1.1 });
      }
      // красный марио — бегает за игроком
      list.push({
        x: levelSpawnX(lv, 0.28 + (i % 3) * 0.08),
        y: GROUND_Y - 48,
        kind: "redmario",
        vx: -2.2
      });
      if (i >= 3) {
        list.push({
          x: levelSpawnX(lv, 0.55 + (i % 2) * 0.1),
          y: GROUND_Y - 48,
          kind: "redmario",
          vx: 2.4
        });
      }
      if (i >= 7) {
        list.push({
          x: levelSpawnX(lv, 0.75),
          y: GROUND_Y - 48,
          kind: "redmario",
          vx: -2.6
        });
      }
      lv.enemies = list;

      // содержимое ?-блоков: монета / гриб / звезда / 1up / мега
      const qs = lv.questions || [];
      qs.forEach((q, qi) => {
        if (q.item) return;
        const r = (qi + i * 2) % 9;
        if (r === 0) q.item = "mushroom";
        else if (r === 1) q.item = "star";
        else if (r === 2 && i >= 3) q.item = "1up";
        else if (r === 3 && i >= 1) q.item = "mega";
        else q.item = "coin";
      });
      // на каждом уровне хотя бы один гриб и (с 2-го) звезда
      if (qs[0] && !qs.some(q => q.item === "mushroom")) qs[0].item = "mushroom";
      if (i >= 1 && qs[1] && !qs.some(q => q.item === "star")) qs[1].item = "star";
      // с 3-го уровня — мега-гриб в ?-блоке
      if (i >= 2 && qs[2] && !qs.some(q => q.item === "mega")) qs[2].item = "mega";

      // свободные бонусы на карте
      lv.powerups = lv.powerups || [];
      if (i === 0) {
        lv.powerups.push({ x: levelSpawnX(lv, 0.22), y: GROUND_Y - 80, kind: "mushroom" });
        // мега-гриб на 1 уровне — сразу можно покрушить
        lv.powerups.push({ x: levelSpawnX(lv, 0.35), y: GROUND_Y - 80, kind: "mega" });
      }
      if (i >= 2) {
        lv.powerups.push({ x: levelSpawnX(lv, 0.48), y: GROUND_Y - 120, kind: "star" });
      }
      if (i >= 4) {
        lv.powerups.push({ x: levelSpawnX(lv, 0.4), y: GROUND_Y - 90, kind: "mega" });
      }
      if (i >= 6) {
        lv.powerups.push({ x: levelSpawnX(lv, 0.6), y: GROUND_Y - 100, kind: "1up" });
      }
    }
  }
  function levelSpawnX(lv, t) {
    return Math.floor((lv.w || 80 * TILE) * t / TILE) * TILE;
  }
  spiceOfficialEnemies();

  // ── Custom levels storage ────────────────────────────────
  function loadCustomStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch { return {}; }
  }
  function saveCustomStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
  function getLevelData(idx) {
    const store = loadCustomStore();
    const key = String(idx + 1);
    if (store[key]) {
      const custom = cloneLevel(store[key]);
      // битый/пустой кастомный уровень → официальный (чтобы Марио не проваливался)
      if (custom.ground && custom.ground.length > 0 && custom.w > 0) return custom;
    }
    return cloneLevel(OFFICIAL[idx] || OFFICIAL[0]);
  }
  function cloneLevel(lv) {
    return JSON.parse(JSON.stringify(lv));
  }

  let maxUnlocked = 1;
  try {
    maxUnlocked = Math.max(1, Math.min(9, parseInt(localStorage.getItem(PROGRESS_KEY) || "1", 10) || 1));
  } catch { maxUnlocked = 1; }

  // ── Runtime world ────────────────────────────────────────
  let levelW = 3200;
  let platforms = [];
  let coins = [];
  let enemies = [];
  let powerups = [];
  let debris = [];
  let currentLevelIndex = 0;
  let currentLevelData = null;
  let editing = false;
  let editTool = "brick";
  let editorCamera = 0;
  let paintMode = null; // "place" | "erase" | null
  let hoverTile = null; // { tx, ty }
  let lastPaintKey = "";
  let starTimer = 0;
  let megaTimer = 0;

  const TOOLS = [
    { id: "brick", label: "1 Кирпич" },
    { id: "question", label: "2 ?-блок" },
    { id: "ground", label: "3 Земля" },
    { id: "pipe", label: "4 Труба" },
    { id: "coin", label: "5 Монета" },
    { id: "goomba", label: "6 Гумба" },
    { id: "koopa", label: "7 Купа" },
    { id: "piranha", label: "8 Пиранья" },
    { id: "bullet", label: "9 Пуля" },
    { id: "spiny", label: "S Спини" },
    { id: "redmario", label: "R Красный" },
    { id: "mushroom", label: "M Гриб" },
    { id: "mega", label: "G Мега" },
    { id: "star", label: "T Звезда" },
    { id: "1up", label: "U 1-UP" },
    { id: "flag", label: "0 Флаг" },
    { id: "erase", label: "X Ластик" }
  ];

  function editMsg(text) {
    const el = document.getElementById("editMsg");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("show", !!text);
  }

  function setTool(id) {
    editTool = id;
    const bar = document.getElementById("toolBar");
    if (bar) {
      bar.querySelectorAll("button").forEach(x => x.classList.toggle("active", x.dataset.tool === editTool));
    }
    const names = {
      brick: "Кирпич", question: "?-блок", ground: "Земля", pipe: "Труба",
      coin: "Монета", goomba: "Гумба", koopa: "Купа", piranha: "Пиранья",
      bullet: "Пуля", spiny: "Спини", redmario: "Красный Марио",
      mushroom: "Гриб", mega: "Мега-гриб", star: "Звезда", "1up": "1-UP",
      enemy: "Гумба", flag: "Флаг", erase: "Ластик"
    };
    editMsg("Инструмент: " + (names[id] || id) + " — кликай по полю");
  }

  function makeEnemy(e) {
    const kind = e.kind || e.type || "goomba";
    const base = {
      x: e.x,
      y: e.y != null ? e.y : GROUND_Y - 40,
      w: 40, h: 40,
      vx: e.vx != null ? e.vx : -1.2,
      alive: true,
      kind,
      phase: e.phase || 0,
      baseY: e.baseY != null ? e.baseY : (e.y != null ? e.y : GROUND_Y - 40)
    };
    if (kind === "koopa") {
      base.w = 36; base.h = 48;
      if (base.y === GROUND_Y - 40) base.y = GROUND_Y - 48;
      base.baseY = base.y;
      base.shell = false;
    } else if (kind === "spiny") {
      base.w = 36; base.h = 36;
      base.y = e.y != null ? e.y : GROUND_Y - 36;
      base.baseY = base.y;
      base.vx = e.vx != null ? e.vx : -1.0;
      base.stompless = true;
    } else if (kind === "redmario") {
      base.w = 34; base.h = 44;
      base.y = e.y != null ? e.y : GROUND_Y - 48;
      if (base.y > GROUND_Y - 44) base.y = GROUND_Y - 48;
      base.baseY = base.y;
      base.vx = e.vx != null ? e.vx : -2.2;
      base.speed = Math.abs(base.vx) || 2.2;
      base.chase = true;
      base.facing = base.vx >= 0 ? 1 : -1;
    } else if (kind === "piranha") {
      base.w = 36; base.h = 48;
      base.vx = 0;
      base.baseY = e.baseY != null ? e.baseY : (e.y != null ? e.y : GROUND_Y - 100);
      base.y = base.baseY;
      base.phase = Math.random() * Math.PI * 2;
      base.stompless = true;
    } else if (kind === "bullet") {
      base.w = 44; base.h = 28;
      base.y = e.y != null ? e.y : 200;
      base.vx = e.vx != null ? e.vx : -3.2;
      base.flying = true;
    }
    return base;
  }

  function makePowerup(p) {
    const kind = p.kind || "mushroom";
    const mega = kind === "mega";
    return {
      x: p.x,
      y: p.y != null ? p.y : GROUND_Y - 40,
      w: mega ? 36 : 32,
      h: mega ? 36 : 32,
      vx: p.vx != null ? p.vx : (kind === "star" ? 2.2 : mega ? 1.8 : 1.4),
      vy: p.vy != null ? p.vy : (kind === "star" ? -4 : 0),
      kind,
      taken: false,
      fromBlock: !!p.fromBlock
    };
  }

  function spawnPowerup(kind, x, y) {
    powerups.push(makePowerup({
      x: x,
      y: y,
      kind,
      vx: kind === "star" ? 2.4 : kind === "mega" ? 2.0 : 1.6,
      vy: kind === "star" ? -5 : -2,
      fromBlock: true
    }));
  }

  function buildFromData(data) {
    platforms = [];
    coins = [];
    enemies = [];
    powerups = [];
    debris = [];
    starTimer = 0;
    megaTimer = 0;
    currentLevelData = cloneLevel(data);
    levelW = data.w || 80 * TILE;

    for (const g of data.ground || []) {
      platforms.push({ x: g.x, y: GROUND_Y, w: g.w, h: H - GROUND_Y, type: "ground" });
    }
    for (const b of data.bricks || []) {
      for (let i = 0; i < (b.n || 1); i++) {
        platforms.push({ x: b.x + i * TILE, y: b.y, w: TILE, h: TILE, type: "brick" });
      }
    }
    for (const q of data.questions || []) {
      platforms.push({
        x: q.x, y: q.y, w: TILE, h: TILE, type: "question", hit: false,
        item: q.item || "coin"
      });
    }
    for (const p of data.pipes || []) {
      platforms.push({ x: p.x, y: GROUND_Y - p.h, w: 64, h: p.h + 4, type: "pipe" });
    }
    const fx = data.flagX != null ? data.flagX : levelW - 4 * TILE;
    platforms.push({ x: fx + 20, y: 120, w: 12, h: GROUND_Y - 120, type: "flagpole" });
    platforms.push({ x: fx, y: 100, w: 50, h: 20, type: "flag" });

    for (const c of data.coins || []) {
      coins.push({ x: c.x, y: c.y, taken: false });
    }
    for (const e of data.enemies || []) {
      enemies.push(makeEnemy(e));
    }
    for (const p of data.powerups || []) {
      powerups.push(makePowerup(p));
    }
  }

  // Rebuild editor data from live platforms (after edits)
  function snapshotFromWorld() {
    const data = {
      w: levelW,
      ground: [],
      bricks: [],
      questions: [],
      pipes: [],
      coins: [],
      enemies: [],
      powerups: [],
      flagX: levelW - 4 * TILE
    };
    for (const p of platforms) {
      if (p.type === "ground") data.ground.push({ x: p.x, w: p.w });
      else if (p.type === "brick") data.bricks.push({ x: p.x, y: p.y, n: 1 });
      else if (p.type === "question" || p.type === "used") {
        data.questions.push({ x: p.x, y: p.y, item: p.item || "coin" });
      }
      else if (p.type === "pipe") data.pipes.push({ x: p.x, h: Math.max(40, GROUND_Y - p.y) });
      else if (p.type === "flag") data.flagX = p.x;
    }
    for (const c of coins) {
      if (!c.taken && !c.pop) data.coins.push({ x: c.x, y: c.y });
    }
    for (const e of enemies) {
      if (e.alive) {
        data.enemies.push({
          x: e.x, y: e.kind === "piranha" ? e.baseY : e.y,
          vx: e.vx || -1.2, kind: e.kind || "goomba",
          baseY: e.baseY
        });
      }
    }
    for (const p of powerups) {
      if (!p.taken) data.powerups.push({ x: p.x, y: p.y, kind: p.kind, vx: p.vx });
    }
    return data;
  }

  const keys = {};
  let player, cameraX, coinCount, lives, won, dead, invuln, anim;

  function applyPlayerSize() {
    if (!player) return;
    const oldH = player.h || 44;
    const feet = player.y + oldH;
    if (isMega()) {
      // гигант — всё крушит
      player.w = 96;
      player.h = 132;
    } else if (player.big) {
      player.w = 40;
      player.h = 56;
    } else {
      player.w = 34;
      player.h = 44;
    }
    player.y = feet - player.h;
  }

  function resetPlayer(full, keepLevel) {
    if (full) {
      coinCount = 0;
      lives = 3;
      starTimer = 0;
      megaTimer = 0;
      document.getElementById("coins").textContent = "0";
      document.getElementById("lives").textContent = "3";
      if (!keepLevel) {
        buildFromData(getLevelData(currentLevelIndex));
      } else {
        buildFromData(currentLevelData || getLevelData(currentLevelIndex));
      }
    } else {
      megaTimer = 0;
      starTimer = 0;
    }
    player = {
      x: 80, y: H - 160, w: 34, h: 44,
      vx: 0, vy: 0, onGround: false, facing: 1, big: false
    };
    applyPlayerSize();
    cameraX = 0;
    editorCamera = 0;
    won = false;
    dead = false;
    invuln = 0;
    anim = 0;
    document.getElementById("levelNum").textContent = String(currentLevelIndex + 1);
    document.getElementById("status").textContent = editing ? "РЕДАКТОР" : "ДОЙДИ ДО ФЛАГА!";
    updatePowerHud();
    updateLevelBar();
  }

  function goToLevel(idx, force) {
    if (idx < 0 || idx > 8) return;
    if (!force && !editing && idx + 1 > maxUnlocked) return;
    currentLevelIndex = idx;
    document.getElementById("editSlot").value = String(idx + 1);
    resetPlayer(true);
  }

  function updateLevelBar() {
    const bar = document.getElementById("levelBar");
    bar.innerHTML = "";
    for (let i = 0; i < 9; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = String(i + 1);
      if (i === currentLevelIndex) b.classList.add("cur");
      if (i + 1 < maxUnlocked || (i + 1 === maxUnlocked && i !== currentLevelIndex)) {
        // completed if strictly less than unlocked
      }
      if (i + 1 < maxUnlocked) b.classList.add("done");
      if (!editing && i + 1 > maxUnlocked) b.classList.add("locked");
      b.addEventListener("click", () => goToLevel(i, editing));
      bar.appendChild(b);
    }
  }

  function rects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function solid(p) {
    // broken / flag не твёрдые; кирпичи мега ломает ДО resolvePlatforms
    return p.type !== "flag" && p.type !== "flagpole" && p.type !== "broken";
  }

  /** Мега-Марио ломает кирпичи и ?-блоки при касании */
  function megaCrushBlocks() {
    if (!isMega() || !player) return;
    let smashed = 0;
    for (const p of platforms) {
      if (p.type !== "brick" && p.type !== "used" && p.type !== "question") continue;
      // чуть расширенный hitbox — «проламывает» соседние клетки
      const hit = {
        x: player.x - 4,
        y: player.y + 8,
        w: player.w + 8,
        h: player.h - 8
      };
      if (!rects(hit, p)) continue;
      if (p.type === "question" && !p.hit) {
        hitBlock(p);
      }
      if (p.type === "brick" || p.type === "used") {
        p.type = "broken";
        spawnBrickDebris(p.x, p.y);
        smashed++;
        coinCount += 1;
      }
    }
    if (smashed > 0) {
      document.getElementById("coins").textContent = coinCount;
      sfx.brickBreak();
      if (smashed >= 2) sfx.megaStomp();
    }
  }

  function spawnBrickDebris(x, y) {
    for (let i = 0; i < 6; i++) {
      debris.push({
        x: x + 8 + (i % 3) * 10,
        y: y + 6 + Math.floor(i / 3) * 14,
        vx: (Math.random() - 0.5) * 7,
        vy: -3 - Math.random() * 5,
        life: 28 + Math.random() * 18,
        s: 6 + Math.random() * 6
      });
    }
  }

  function resolvePlatforms(ent) {
    ent.onGround = false;
    for (const p of platforms) {
      if (!solid(p)) continue;
      if (!rects(ent, p)) continue;
      const prevBottom = ent.y + ent.h - ent.vy;
      const prevTop = ent.y - ent.vy;
      const prevRight = ent.x + ent.w - ent.vx;
      const prevLeft = ent.x - ent.vx;

      if (ent.vy >= 0 && prevBottom <= p.y + 4) {
        ent.y = p.y - ent.h;
        ent.vy = 0;
        ent.onGround = true;
        continue;
      }
      if (ent.vy < 0 && prevTop >= p.y + p.h - 4) {
        ent.y = p.y + p.h;
        ent.vy = 0;
        if (ent === player && (p.type === "question" || p.type === "brick")) {
          hitBlock(p);
        }
        continue;
      }
      if (ent.vx > 0 && prevRight <= p.x + 2) {
        ent.x = p.x - ent.w;
        ent.vx = 0;
      } else if (ent.vx < 0 && prevLeft >= p.x + p.w - 2) {
        ent.x = p.x + p.w;
        ent.vx = 0;
      }
    }
  }

  function hitBlock(p) {
    if (p.type === "question" && !p.hit) {
      p.hit = true;
      p.type = "used";
      const item = p.item || "coin";
      if (item === "mushroom" || item === "star" || item === "1up" || item === "mega") {
        spawnPowerup(item, p.x + 4, p.y - 36);
        sfx.bump();
        sfx.powerAppear();
        document.getElementById("status").textContent =
          item === "mushroom" ? "🍄 ГРИБ!" :
          item === "star" ? "⭐ ЗВЕЗДА!" :
          item === "mega" ? "🟣 МЕГА-ГРИБ!" : "💚 1-UP!";
      } else {
        coinCount++;
        document.getElementById("coins").textContent = coinCount;
        coins.push({ x: p.x + 8, y: p.y - 30, taken: false, pop: 20 });
        sfx.coin();
      }
    } else if (p.type === "brick") {
      // Большой / мега Марио ломает кирпичи
      if (player && (player.big || isMega())) {
        p.type = "broken";
        spawnBrickDebris(p.x, p.y);
        sfx.brickBreak();
      } else {
        sfx.bump();
      }
    } else if (p.type === "used") {
      if (isMega()) {
        p.type = "broken";
        spawnBrickDebris(p.x, p.y);
        sfx.brickBreak();
      } else {
        sfx.bump();
      }
    }
  }

  function collectPowerup(p) {
    if (p.taken) return;
    p.taken = true;
    if (p.kind === "mushroom") {
      if (isMega()) {
        // уже мега — +жизнь
        lives++;
        document.getElementById("lives").textContent = lives;
        document.getElementById("status").textContent = "🍄 +жизнь!";
        sfx.oneUp();
      } else if (player.big) {
        lives++;
        document.getElementById("lives").textContent = lives;
        document.getElementById("status").textContent = "🍄 +жизнь!";
        sfx.oneUp();
      } else {
        player.big = true;
        applyPlayerSize();
        invuln = Math.max(invuln, 40);
        document.getElementById("status").textContent = "🍄 БОЛЬШОЙ МАРИО!";
        sfx.powerup();
      }
    } else if (p.kind === "mega") {
      // МЕГА-ГРИБ: гигант на ~12 сек, крушит кирпичи и врагов
      megaTimer = 720;
      player.big = true;
      applyPlayerSize();
      invuln = Math.max(invuln, 40);
      document.getElementById("status").textContent = "🟣 МЕГА МАРИО! КРУШИ ВСЁ!";
      sfx.mega();
      // экранная тряска через камеру (лёгкий kick)
      cameraX = Math.max(0, cameraX + (Math.random() - 0.5) * 8);
    } else if (p.kind === "star") {
      starTimer = 420; // ~7 сек
      invuln = Math.max(invuln, 30);
      document.getElementById("status").textContent = "⭐ НЕУЯЗВИМОСТЬ!";
      sfx.star();
    } else if (p.kind === "1up") {
      lives++;
      document.getElementById("lives").textContent = lives;
      document.getElementById("status").textContent = "💚 +1 ЖИЗНЬ!";
      sfx.oneUp();
    }
    coinCount += 1;
    document.getElementById("coins").textContent = coinCount;
    updatePowerHud();
  }

  function killPlayer() {
    if (starTimer > 0 || megaTimer > 0 || invuln > 0 || dead || won || editing) return;
    // большой марио теряет силу вместо жизни
    if (player && player.big) {
      player.big = false;
      applyPlayerSize();
      invuln = 100;
      document.getElementById("status").textContent = "Ой! Стал маленьким";
      updatePowerHud();
      sfx.hurt();
      return;
    }
    lives--;
    document.getElementById("lives").textContent = lives;
    if (lives <= 0) {
      dead = true;
      document.getElementById("status").textContent = "GAME OVER — R";
      sfx.die();
    } else {
      invuln = 90;
      player.x = Math.max(40, player.x - 120);
      player.y = H - 200;
      player.vx = 0;
      player.vy = 0;
      document.getElementById("status").textContent = "Ой! Ещё жизнь";
      sfx.hurt();
    }
    updatePowerHud();
  }

  function completeLevel() {
    won = true;
    sfx.win();
    if (currentLevelIndex + 1 >= maxUnlocked && currentLevelIndex < 8) {
      maxUnlocked = currentLevelIndex + 2;
      try { localStorage.setItem(PROGRESS_KEY, String(maxUnlocked)); } catch {}
    } else if (currentLevelIndex === 8) {
      maxUnlocked = 9;
      try { localStorage.setItem(PROGRESS_KEY, "9"); } catch {}
    }
    updateLevelBar();
    if (currentLevelIndex < 8) {
      document.getElementById("status").textContent = "ПОБЕДА! N — след. · R — заново";
    } else {
      document.getElementById("status").textContent = "ВСЕ 9 УРОВНЕЙ! 🏆 R — сначала";
    }
  }

  function update() {
    if (editing) {
      cameraX = editorCamera;
      return;
    }
    if (dead || won) return;
    anim++;

    const left = keys["ArrowLeft"] || keys["a"] || keys["A"] || keys._left;
    const right = keys["ArrowRight"] || keys["d"] || keys["D"] || keys._right;
    const jump = keys["ArrowUp"] || keys["w"] || keys["W"] || keys[" "] || keys._jump;

    const moveSpd = MOVE
      * (isMega() ? 1.35 : player.big ? 1.08 : 1)
      * (starTimer > 0 ? 1.15 : 1);
    if (left) { player.vx = -moveSpd; player.facing = -1; }
    else if (right) { player.vx = moveSpd; player.facing = 1; }
    else player.vx *= FRICTION;

    if (jump && player.onGround) {
      player.vy = JUMP * (isMega() ? 1.2 : player.big ? 1.06 : 1);
      player.onGround = false;
      sfx.jump();
      if (isMega()) sfx.megaStomp();
    }

    // осколки кирпичей
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.vy += GRAV * 0.9;
      d.x += d.vx;
      d.y += d.vy;
      d.life--;
      if (d.life <= 0 || d.y > H + 40) debris.splice(i, 1);
    }

    player.vy += GRAV * (isMega() ? 1.15 : 1);
    player.x += player.vx;
    player.y += player.vy;

    if (player.x < 0) player.x = 0;
    if (player.x > levelW - player.w) player.x = levelW - player.w;

    // сначала крушим блоки, потом коллизии (мега проходит сквозь кирпичи)
    megaCrushBlocks();
    resolvePlatforms(player);
    megaCrushBlocks();
    if (player.y > H + 50) killPlayer();

    for (const c of coins) {
      if (c.taken) continue;
      if (c.pop) {
        c.y -= 2;
        c.pop--;
        if (c.pop <= 0) c.taken = true;
        continue;
      }
      if (rects(player, { x: c.x, y: c.y, w: 20, h: 20 })) {
        c.taken = true;
        coinCount++;
        document.getElementById("coins").textContent = coinCount;
        sfx.coin();
      }
    }

    // ── power-ups: гриб, мега, звезда, 1up ──
    for (const p of powerups) {
      if (p.taken) continue;
      if (p.kind === "star") {
        p.vy += GRAV * 0.85;
        p.x += p.vx;
        p.y += p.vy;
        for (const pl of platforms) {
          if (!solid(pl)) continue;
          if (!rects(p, pl)) continue;
          if (p.vy >= 0 && p.y + p.h - p.vy <= pl.y + 6) {
            p.y = pl.y - p.h;
            p.vy = -6.5;
          } else if (p.vx > 0) { p.x = pl.x - p.w; p.vx *= -1; }
          else if (p.vx < 0) { p.x = pl.x + pl.w; p.vx *= -1; }
        }
      } else {
        // mushroom / mega / 1up — ходят и падают
        p.vy = (p.vy || 0) + GRAV;
        p.x += p.vx;
        p.y += p.vy;
        let onG = false;
        for (const pl of platforms) {
          if (!solid(pl)) continue;
          if (!rects(p, pl)) continue;
          if (p.vy >= 0 && p.y + p.h - p.vy <= pl.y + 8) {
            p.y = pl.y - p.h;
            p.vy = 0;
            onG = true;
          } else if (pl.type === "pipe" || pl.type === "brick" || pl.type === "question" || pl.type === "used") {
            if (p.vx > 0) p.x = pl.x - p.w;
            else p.x = pl.x + pl.w;
            p.vx *= -1;
          }
        }
        if (!onG && p.y > GROUND_Y) { p.y = GROUND_Y - p.h; p.vy = 0; }
      }
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      if (p.x > levelW - p.w) { p.x = levelW - p.w; p.vx = -Math.abs(p.vx); }
      if (p.y > H + 40) p.taken = true;
      if (rects(player, p)) collectPowerup(p);
    }

    if (megaTimer > 0) {
      megaTimer--;
      if (megaTimer === 0) {
        // остаётся большой Марио после меги
        player.big = true;
        applyPlayerSize();
        invuln = Math.max(invuln, 60);
        document.getElementById("status").textContent = "Мега кончилась — ты большой";
      } else if (megaTimer === 120) {
        document.getElementById("status").textContent = "Мега скоро кончится!";
      }
      // редкий топот при беге (не спамим каждый кадр)
      if (player.onGround && Math.abs(player.vx) > 2 && anim % 22 === 0) {
        sfx.megaStomp();
      }
      updatePowerHud();
    }

    if (starTimer > 0) {
      starTimer--;
      if (starTimer === 0) {
        document.getElementById("status").textContent = "Звезда кончилась";
      }
      updatePowerHud();
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      const kind = e.kind || "goomba";

      if (kind === "piranha") {
        e.phase = (e.phase || 0) + 0.03;
        const rise = (Math.sin(e.phase) + 1) * 0.5;
        e.y = e.baseY + (1 - rise) * 56;
        e._active = rise > 0.35;
      } else if (kind === "bullet") {
        e.x += e.vx;
        if (e.x < cameraX - 80) {
          e.x = cameraX + W + 40;
          e.y = 80 + Math.random() * 220;
        }
        if (e.x > cameraX + W + 120 && e.vx > 0) {
          e.x = cameraX - 60;
          e.y = 80 + Math.random() * 220;
        }
      } else if (kind === "koopa" && e.shell) {
        e.x += e.vx;
        for (const p of platforms) {
          if (!solid(p)) continue;
          if (rects(e, p) && p.type !== "ground") {
            if (e.vx > 0) e.x = p.x - e.w;
            else e.x = p.x + p.w;
            e.vx *= -1;
          }
        }
      } else if (kind === "redmario") {
        const baseSpd = e.speed || 2.2;
        const dx = player.x - e.x;
        const spd = Math.abs(dx) < 220 ? baseSpd * 1.35 : baseSpd;
        if (Math.abs(dx) > 8) {
          e.vx = dx > 0 ? spd : -spd;
          e.facing = e.vx >= 0 ? 1 : -1;
        } else {
          e.vx = 0;
        }
        e.x += e.vx;
        if (e.x < 0) { e.x = 0; e.vx = Math.abs(e.vx); e.facing = 1; }
        if (e.x > levelW - e.w) { e.x = levelW - e.w; e.vx = -Math.abs(e.vx); e.facing = -1; }
        let onPlat = false;
        for (const p of platforms) {
          if (!solid(p)) continue;
          if (e.x + e.w > p.x && e.x < p.x + p.w && Math.abs(e.y + e.h - p.y) < 8) {
            onPlat = true;
            e.y = p.y - e.h;
          }
          if (rects({ x: e.x, y: e.y, w: e.w, h: e.h }, p) && (p.type === "pipe" || p.type === "brick" || p.type === "question")) {
            if (e.vx > 0) e.x = p.x - e.w - 1;
            else e.x = p.x + p.w + 1;
            e.vx *= -1;
            e.facing = e.vx >= 0 ? 1 : -1;
          }
        }
        if (!onPlat) {
          if (e.y < GROUND_Y - e.h) e.y = Math.min(e.y + 4, GROUND_Y - e.h);
          else e.y = GROUND_Y - e.h;
        }
      } else {
        // goomba / koopa / spiny walk
        e.x += e.vx;
        let onPlat = false;
        for (const p of platforms) {
          if (!solid(p)) continue;
          if (e.x + e.w > p.x && e.x < p.x + p.w && Math.abs(e.y + e.h - p.y) < 6) {
            onPlat = true;
            if (e.x <= p.x || e.x + e.w >= p.x + p.w) e.vx *= -1;
          }
          if (rects({ x: e.x, y: e.y, w: e.w, h: e.h }, p) && p.type === "pipe") {
            e.vx *= -1;
            e.x += e.vx * 2;
          }
        }
        if (!onPlat && e.y >= H - 120) e.vx *= -1;
      }

      if (kind === "piranha" && !e._active) continue;
      if (!rects(player, e)) continue;

      // звезда / мега — убивает всех при касании
      if (starTimer > 0 || isMega()) {
        e.alive = false;
        coinCount += kind === "redmario" ? 2 : (isMega() ? 2 : 1);
        document.getElementById("coins").textContent = coinCount;
        // осколки от раздавленного врага
        spawnBrickDebris(e.x, e.y);
        if (isMega()) sfx.megaStomp();
        else { sfx.fire(); sfx.stomp(); }
        continue;
      }

      const canStomp = kind !== "piranha" && kind !== "spiny" && kind !== "bullet"
        && !(kind === "koopa" && e.shell && Math.abs(e.vx) > 2);
      if (canStomp && player.vy > 0 && player.y + player.h - e.y < 24) {
        if (kind === "koopa" && !e.shell) {
          e.shell = true;
          e.h = 28;
          e.y = GROUND_Y - 28;
          e.vx = 0;
          player.vy = JUMP * 0.55;
          sfx.stomp();
        } else if (kind === "koopa" && e.shell) {
          e.vx = player.facing * 6;
          player.vy = JUMP * 0.45;
          sfx.kick();
        } else if (kind === "redmario") {
          e.alive = false;
          player.vy = JUMP * 0.6;
          coinCount += 2;
          document.getElementById("coins").textContent = coinCount;
          sfx.stomp();
        } else {
          // goomba и прочие — топот
          e.alive = false;
          player.vy = JUMP * 0.55;
          coinCount += 1;
          document.getElementById("coins").textContent = coinCount;
          sfx.stomp();
        }
      } else {
        if (kind === "koopa" && e.shell && Math.abs(e.vx) < 0.5) {
          e.vx = player.facing * 6;
          sfx.kick();
        } else {
          killPlayer();
        }
      }
    }

    // shell hits other enemies
    for (const shell of enemies) {
      if (!shell.alive || shell.kind !== "koopa" || !shell.shell || Math.abs(shell.vx) < 2) continue;
      for (const e of enemies) {
        if (!e.alive || e === shell) continue;
        if (rects(shell, e)) {
          e.alive = false;
          coinCount += 1;
          document.getElementById("coins").textContent = coinCount;
          sfx.stomp();
        }
      }
    }

    for (const p of platforms) {
      if ((p.type === "flag" || p.type === "flagpole") && rects(player, p)) {
        completeLevel();
      }
    }

    cameraX = Math.max(0, Math.min(levelW - W, player.x - W * 0.35));
    if (invuln > 0) invuln--;
  }

  function drawCloud(x, y) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.arc(x + 22, y - 6, 22, 0, Math.PI * 2);
    ctx.arc(x + 48, y, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPowerup(p) {
    if (p.taken) return;
    const bob = Math.sin(anim * 0.25 + p.x * 0.04) * 2;
    let img = imgMushroom;
    if (p.kind === "star") img = imgStar;
    else if (p.kind === "1up") img = img1up;
    // мега-гриб: увеличенный + фиолетовый фильтр
    if (p.kind === "mega") {
      const pulse = 1 + Math.sin(anim * 0.2) * 0.08;
      const mw = p.w * pulse + 6;
      const mh = p.h * pulse + 6;
      const mx = p.x + p.w / 2 - mw / 2;
      const my = p.y + bob + p.h / 2 - mh / 2;
      const ok = drawFullImage(
        imgMushroom, mx, my, mw, mh, false,
        "hue-rotate(260deg) saturate(2.2) brightness(1.15) contrast(1.1)"
      );
      if (!ok) {
        // фиолетовая шляпка + жёлтые пятна
        ctx.fillStyle = "#7b2cbf";
        ctx.beginPath();
        ctx.ellipse(p.x + 18, p.y + 14 + bob, 18, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffd60a";
        ctx.beginPath();
        ctx.arc(p.x + 10, p.y + 12 + bob, 4, 0, Math.PI * 2);
        ctx.arc(p.x + 24, p.y + 10 + bob, 3.5, 0, Math.PI * 2);
        ctx.arc(p.x + 18, p.y + 18 + bob, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f5e6c8";
        ctx.fillRect(p.x + 10, p.y + 20 + bob, 16, 14);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Arial";
        ctx.fillText("M", p.x + 13, p.y + 18 + bob);
      }
      // aura
      ctx.strokeStyle = "rgba(180,80,255," + (0.35 + Math.sin(anim * 0.3) * 0.2) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h / 2 + bob, mw / 2 + 4, mh / 2 + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    const ok = drawFullImage(img, p.x, p.y + bob, p.w, p.h, false);
    if (!ok) {
      if (p.kind === "star") {
        ctx.fillStyle = "#ffd700";
        ctx.beginPath();
        ctx.moveTo(p.x + 16, p.y + bob);
        ctx.lineTo(p.x + 20, p.y + 12 + bob);
        ctx.lineTo(p.x + 32, p.y + 12 + bob);
        ctx.lineTo(p.x + 22, p.y + 20 + bob);
        ctx.lineTo(p.x + 26, p.y + 32 + bob);
        ctx.lineTo(p.x + 16, p.y + 24 + bob);
        ctx.lineTo(p.x + 6, p.y + 32 + bob);
        ctx.lineTo(p.x + 10, p.y + 20 + bob);
        ctx.lineTo(p.x, p.y + 12 + bob);
        ctx.lineTo(p.x + 12, p.y + 12 + bob);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = p.kind === "1up" ? "#2ecc40" : "#e52521";
        ctx.beginPath();
        ctx.ellipse(p.x + 16, p.y + 12 + bob, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f5e6c8";
        ctx.fillRect(p.x + 8, p.y + 16 + bob, 16, 14);
      }
    }
  }

  function drawEnemy(e) {
    const kind = e.kind || "goomba";
    const bob = Math.sin(anim * 0.2 + e.x * 0.05) * 1;

    if (kind === "goomba") {
      const flip = e.vx > 0;
      let ok = drawFullImage(imgGoombaArt, e.x - 2, e.y + bob - 2, e.w + 4, e.h + 4, flip);
      if (!ok) ok = drawFullImage(imgGoombaPx, e.x, e.y + bob, e.w, e.h, flip);
      if (!ok) {
        const gi = Math.floor(anim / 8 + e.x) % GOOMBA_WALK.length;
        ok = drawSprite(imgGoomba, GOOMBA_WALK[gi], e.x, e.y + bob, e.w, e.h, flip);
      }
      if (!ok) {
        ctx.fillStyle = "#8b4513";
        ctx.beginPath();
        ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2 + bob, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (kind === "koopa") {
      const flip = e.vx < 0;
      if (e.shell) {
        let ok = drawFullImage(imgShell, e.x - 2, e.y + e.h * 0.05, e.w + 4, e.h * 0.95, flip);
        if (!ok) ok = drawFullImage(imgKoopaPx, e.x, e.y + e.h * 0.15, e.w, e.h * 0.85, flip);
        if (!ok) {
          ctx.fillStyle = "#2ecc40";
          ctx.beginPath();
          ctx.ellipse(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, e.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        let ok = drawFullImage(imgKoopaArt, e.x - 4, e.y + bob - 4, e.w + 8, e.h + 6, flip);
        if (!ok) ok = drawFullImage(imgKoopaPx, e.x, e.y + bob, e.w, e.h, flip);
        if (!ok) ok = drawFullImage(imgKoopa, e.x, e.y + bob, e.w, e.h, flip);
        if (!ok) {
          ctx.fillStyle = "#2ecc40";
          ctx.beginPath();
          ctx.ellipse(e.x + e.w / 2, e.y + e.h * 0.55 + bob, e.w * 0.45, e.h * 0.38, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      return;
    }

    if (kind === "spiny") {
      const flip = e.vx > 0;
      let ok = drawFullImage(imgSpinyArt, e.x - 2, e.y + bob - 2, e.w + 4, e.h + 4, flip);
      if (!ok) ok = drawFullImage(imgSpiny, e.x, e.y + bob, e.w, e.h, flip);
      if (!ok) {
        ctx.fillStyle = "#c0392b";
        ctx.beginPath();
        ctx.ellipse(e.x + e.w / 2, e.y + e.h * 0.6 + bob, e.w * 0.45, e.h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (kind === "redmario") {
      const flip = (e.facing != null ? e.facing : (e.vx >= 0 ? 1 : -1)) < 0;
      const dw = e.w + 10;
      const dh = e.h + 10;
      const dx = e.x - 5;
      const dy = e.y - 10 + bob;
      let ok = drawRedMarioImage(dx, dy, dw, dh, flip);
      if (!ok) {
        ctx.save();
        if (flip) {
          ctx.translate(e.x + e.w, e.y + bob);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(e.x, e.y + bob);
        }
        ctx.fillStyle = "#7a0000";
        ctx.fillRect(4, 38, 12, 8);
        ctx.fillRect(18, 38, 12, 8);
        ctx.fillStyle = "#3a0000";
        ctx.fillRect(8, 22, 18, 18);
        ctx.fillStyle = "#ff1a1a";
        ctx.fillRect(6, 14, 22, 14);
        ctx.fillRect(4, 2, 26, 12);
        ctx.fillRect(4, 10, 10, 6);
        ctx.fillStyle = "#ffccaa";
        ctx.fillRect(10, 10, 16, 12);
        ctx.fillStyle = "#000";
        ctx.fillRect(20, 13, 3, 4);
        ctx.restore();
      }
      ctx.fillStyle = "#ff2222";
      ctx.font = "bold 11px Arial";
      ctx.fillText("ЗЛОЙ", e.x - 2, e.y - 4 + bob);
      return;
    }

    if (kind === "piranha") {
      let ok = drawFullImage(imgPiranhaArt, e.x - 4, e.y + bob - 2, e.w + 8, e.h + 4, false);
      if (!ok) ok = drawFullImage(imgPiranha, e.x, e.y + bob, e.w, e.h, false);
      if (!ok) {
        ctx.fillStyle = "#1a8a20";
        ctx.fillRect(e.x + e.w / 2 - 4, e.y + e.h * 0.5, 8, e.h * 0.55);
        ctx.fillStyle = "#e52521";
        ctx.beginPath();
        ctx.ellipse(e.x + e.w / 2, e.y + 16, 18, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    if (kind === "bullet") {
      const flip = e.vx > 0;
      let ok = drawFullImage(imgBulletArt, e.x - 4, e.y - 6, e.w + 8, e.h + 12, flip);
      if (!ok) ok = drawFullImage(imgBullet, e.x, e.y, e.w, e.h, flip);
      if (!ok) {
        const dir = e.vx >= 0 ? 1 : -1;
        ctx.save();
        if (dir < 0) {
          ctx.translate(e.x + e.w, e.y);
          ctx.scale(-1, 1);
        } else {
          ctx.translate(e.x, e.y);
        }
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.moveTo(8, 2);
        ctx.lineTo(e.w - 4, 4);
        ctx.lineTo(e.w - 4, e.h - 4);
        ctx.lineTo(8, e.h - 2);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(8, e.h / 2, e.h / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(10, e.h / 2 - 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(11, e.h / 2 - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawGrid() {
    if (!editing) return;
    ctx.strokeStyle = "rgba(255,255,255,.12)";
    ctx.lineWidth = 1;
    const startX = Math.floor(cameraX / TILE) * TILE;
    for (let x = startX; x < cameraX + W; x += TILE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += TILE) {
      ctx.beginPath();
      ctx.moveTo(cameraX, y);
      ctx.lineTo(cameraX + W, y);
      ctx.stroke();
    }
  }

  function draw() {
    ctx.fillStyle = "#5c94fc";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#78c850";
    for (let i = 0; i < 6; i++) {
      const hx = ((i * 280 - cameraX * 0.3) % (W + 300)) - 100;
      ctx.beginPath();
      ctx.ellipse(hx + 100, H - 60, 120, 50, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    drawCloud(100 - cameraX * 0.2, 60);
    drawCloud(400 - cameraX * 0.15, 90);
    drawCloud(700 - cameraX * 0.25, 50);

    ctx.save();
    ctx.translate(-cameraX, 0);
    drawGrid();

    for (const p of platforms) {
      if (p.type === "ground") {
        ctx.fillStyle = "#c84c0c";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = "#00a800";
        ctx.fillRect(p.x, p.y, p.w, 14);
        for (let x = p.x; x < p.x + p.w; x += 32) {
          ctx.strokeStyle = "#8b3a0a";
          ctx.strokeRect(x, p.y + 14, 32, 32);
        }
      } else if (p.type === "broken") {
        // сломанный кирпич — не рисуем
      } else if (p.type === "brick") {
        if (!drawFullImage(imgBrickArt, p.x, p.y, p.w, p.h, false)) {
          ctx.fillStyle = "#c84c0c";
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.strokeStyle = "#8b3000";
          ctx.strokeRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + 20);
          ctx.lineTo(p.x + 40, p.y + 20);
          ctx.moveTo(p.x + 20, p.y);
          ctx.lineTo(p.x + 20, p.y + 20);
          ctx.stroke();
        }
      } else if (p.type === "question") {
        if (!drawFullImage(imgQBlock, p.x, p.y, p.w, p.h, false)) {
          ctx.fillStyle = "#f0c020";
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.strokeStyle = "#804000";
          ctx.lineWidth = 2;
          ctx.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 22px Arial";
          ctx.textAlign = "center";
          ctx.fillText("?", p.x + 20, p.y + 30);
          ctx.lineWidth = 1;
        }
      } else if (p.type === "used") {
        if (!drawFullImage(imgBrickArt, p.x, p.y, p.w, p.h, false)) {
          ctx.fillStyle = "#a06020";
          ctx.fillRect(p.x, p.y, p.w, p.h);
          ctx.strokeStyle = "#804000";
          ctx.strokeRect(p.x + 2, p.y + 2, p.w - 4, p.h - 4);
        }
      } else if (p.type === "pipe") {
        ctx.fillStyle = "#00a800";
        ctx.fillRect(p.x, p.y, p.w, p.h);
        ctx.fillStyle = "#00d800";
        ctx.fillRect(p.x - 4, p.y, p.w + 8, 24);
        ctx.strokeStyle = "#006800";
        ctx.strokeRect(p.x - 4, p.y, p.w + 8, 24);
        ctx.strokeRect(p.x, p.y + 24, p.w, p.h - 24);
      } else if (p.type === "flagpole") {
        ctx.fillStyle = "#ddd";
        ctx.fillRect(p.x, p.y, p.w, p.h);
      } else if (p.type === "flag") {
        ctx.fillStyle = "#e52521";
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 50, p.y + 12);
        ctx.lineTo(p.x, p.y + 24);
        ctx.fill();
      }
    }

    for (const c of coins) {
      if (c.taken) continue;
      const bob = Math.sin(anim * 0.2 + c.x * 0.05) * 2;
      if (!drawFullImage(imgCoinArt, c.x - 2, c.y + bob - 2, 24, 28, false)) {
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.ellipse(c.x + 10, c.y + 12 + bob, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffe566";
        ctx.beginPath();
        ctx.ellipse(c.x + 8, c.y + 10 + bob, 3, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // осколки сломанных кирпичей
    for (const d of debris) {
      ctx.fillStyle = "#c84c0c";
      ctx.fillRect(d.x, d.y, d.s, d.s * 0.75);
      ctx.strokeStyle = "#8b3000";
      ctx.strokeRect(d.x, d.y, d.s, d.s * 0.75);
    }

    for (const p of powerups) {
      if (!p.taken) drawPowerup(p);
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      if ((e.kind || "goomba") === "piranha" && e._active === false) continue;
      drawEnemy(e);
    }

    // player — полная картинка Марио
    if (player && !editing && (invuln === 0 || Math.floor(anim / 4) % 2 === 0 || isMega())) {
      const px = player.x, py = player.y;
      const f = player.facing;
      const mega = isMega();
      // мигание перед концом меги
      const megaBlink = mega && megaTimer < 120 && Math.floor(anim / 5) % 2 === 0;
      if (!(megaBlink && megaTimer < 60 && Math.floor(anim / 3) % 2 === 0)) {
        const drawW = player.w + (mega ? 16 : 10);
        const drawH = player.h + (mega ? 16 : 10);
        const dx = px - (mega ? 8 : 5);
        const dy = py - (mega ? 12 : 10);
        let drawn = false;
        // мега — фиолетово-красный + пульс; звезда — радуга
        let filter = null;
        if (mega) {
          const hue = 300 + Math.sin(anim * 0.15) * 25;
          filter = "hue-rotate(" + hue + "deg) saturate(2.4) brightness(1.1) contrast(1.15)";
        } else if (starTimer > 0) {
          filter = "hue-rotate(" + ((anim * 12) % 360) + "deg) saturate(2) brightness(1.15)";
        }
        try {
          if (filter) {
            drawn = drawFullImage(imgMarioStill, dx, dy, drawW, drawH, f < 0, filter);
            if (!drawn) drawn = drawFullImage(imgMario, dx, dy, drawW, drawH, f < 0, filter);
          } else {
            drawn = drawFullImage(imgMarioStill, dx, dy, drawW, drawH, f < 0);
            if (!drawn) drawn = drawSprite(imgMario, marioFrame(), dx, dy, drawW, drawH, f < 0);
          }
        } catch (err) {
          drawn = false;
        }
        if (!drawn) drawMarioSilhouette(px, py, f);
        // aura мега-Марио
        if (mega) {
          ctx.save();
          ctx.strokeStyle = "rgba(160,60,255," + (0.4 + Math.sin(anim * 0.25) * 0.25) + ")";
          ctx.lineWidth = 4;
          ctx.strokeRect(px - 6, py - 8, player.w + 12, player.h + 12);
          ctx.fillStyle = "rgba(200,100,255,0.12)";
          ctx.fillRect(px - 10, py - 12, player.w + 20, player.h + 16);
          ctx.restore();
        }
      }
    }

    // spawn marker in editor
    if (editing) {
      ctx.fillStyle = "rgba(229,37,33,.45)";
      ctx.fillRect(80, H - 160, 34, 44);
      ctx.strokeStyle = "#fff";
      ctx.strokeRect(80, H - 160, 34, 44);
      ctx.fillStyle = "#fff";
      ctx.font = "12px Arial";
      ctx.fillText("START", 78, H - 165);

      // hover tile preview
      if (hoverTile) {
        const { tx, ty } = hoverTile;
        ctx.save();
        ctx.globalAlpha = 0.55;
        if (editTool === "ground") {
          ctx.fillStyle = "#00a800";
          ctx.fillRect(tx, GROUND_Y, TILE, H - GROUND_Y);
          ctx.strokeStyle = "#fff";
          ctx.globalAlpha = 1;
          ctx.strokeRect(tx, GROUND_Y, TILE, 14);
        } else if (editTool === "pipe") {
          const h = Math.max(60, Math.min(GROUND_Y - 40, GROUND_Y - ty));
          ctx.fillStyle = "#00d800";
          ctx.fillRect(tx, GROUND_Y - h, 64, h);
        } else if (editTool === "flag") {
          ctx.fillStyle = "#e52521";
          ctx.fillRect(tx, 100, 50, 24);
          ctx.fillStyle = "#ddd";
          ctx.fillRect(tx + 20, 120, 12, GROUND_Y - 120);
        } else if (editTool === "erase") {
          ctx.strokeStyle = "#ff4444";
          ctx.lineWidth = 3;
          ctx.globalAlpha = 1;
          ctx.strokeRect(tx + 2, ty + 2, TILE - 4, TILE - 4);
          ctx.beginPath();
          ctx.moveTo(tx + 6, ty + 6);
          ctx.lineTo(tx + TILE - 6, ty + TILE - 6);
          ctx.moveTo(tx + TILE - 6, ty + 6);
          ctx.lineTo(tx + 6, ty + TILE - 6);
          ctx.stroke();
        } else if (editTool === "coin") {
          ctx.fillStyle = "#ffcc00";
          ctx.beginPath();
          ctx.ellipse(tx + 20, ty + 20, 10, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (editTool === "goomba" || editTool === "enemy") {
          ctx.fillStyle = "#8b4513";
          ctx.fillRect(tx, Math.min(ty, GROUND_Y - 40), 40, 40);
        } else if (editTool === "koopa") {
          ctx.fillStyle = "#2ecc40";
          ctx.fillRect(tx, Math.min(ty, GROUND_Y - 48), 36, 48);
        } else if (editTool === "spiny") {
          ctx.fillStyle = "#c0392b";
          ctx.fillRect(tx, Math.min(ty, GROUND_Y - 36), 36, 36);
        } else if (editTool === "piranha") {
          ctx.fillStyle = "#e52521";
          ctx.beginPath();
          ctx.ellipse(tx + 18, ty + 16, 16, 14, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (editTool === "bullet") {
          ctx.fillStyle = "#222";
          ctx.fillRect(tx, ty, 44, 28);
        } else if (editTool === "redmario") {
          ctx.fillStyle = "#c00";
          ctx.fillRect(tx, Math.min(ty, GROUND_Y - 48), 34, 44);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 10px Arial";
          ctx.fillText("R", tx + 12, Math.min(ty, GROUND_Y - 48) + 26);
        } else if (editTool === "mushroom" || editTool === "1up" || editTool === "mega") {
          ctx.fillStyle = editTool === "1up" ? "#2ecc40" : editTool === "mega" ? "#7b2cbf" : "#e52521";
          ctx.beginPath();
          ctx.ellipse(tx + 16, ty + 14, editTool === "mega" ? 16 : 14, editTool === "mega" ? 12 : 10, 0, 0, Math.PI * 2);
          ctx.fill();
          if (editTool === "mega") {
            ctx.fillStyle = "#ffd60a";
            ctx.beginPath();
            ctx.arc(tx + 12, ty + 12, 3, 0, Math.PI * 2);
            ctx.arc(tx + 22, ty + 14, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (editTool === "star") {
          ctx.fillStyle = "#ffd700";
          ctx.fillRect(tx + 8, ty + 8, 24, 24);
        } else {
          ctx.fillStyle = editTool === "question" ? "#f0c020" : "#c84c0c";
          if (ty < GROUND_Y) ctx.fillRect(tx, ty, TILE, TILE);
        }
        ctx.restore();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        if (editTool === "ground") ctx.strokeRect(tx, GROUND_Y, TILE, H - GROUND_Y);
        else if (editTool !== "pipe" && editTool !== "flag") ctx.strokeRect(tx, ty, TILE, TILE);
      }
    }

    ctx.restore();

    if (editing) {
      ctx.fillStyle = "rgba(0,0,0,.45)";
      ctx.fillRect(0, 0, W, 28);
      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "left";
      const ht = hoverTile ? ` · клетка ${hoverTile.tx / TILE},${hoverTile.ty / TILE}` : "";
      ctx.fillText("РЕДАКТОР · " + editTool + " · cam=" + Math.floor(cameraX) + ht, 10, 18);
    }

    if (!editing && (won || dead)) {
      ctx.fillStyle = "rgba(0,0,0,.5)";
      ctx.fillRect(0, H / 2 - 50, W, 100);
      ctx.fillStyle = "#ffcc00";
      ctx.font = "bold 36px Impact, Arial";
      ctx.textAlign = "center";
      ctx.fillText(won ? (currentLevelIndex === 8 ? "ЧЕМПИОН!" : "УРОВЕНЬ ПРОЙДЕН!") : "GAME OVER", W / 2, H / 2);
      ctx.fillStyle = "#fff";
      ctx.font = "18px Arial";
      ctx.fillText(won && currentLevelIndex < 8 ? "N — следующий · R — заново" : "R — начать заново", W / 2, H / 2 + 36);
    }
  }

  // ── Editor actions ───────────────────────────────────────
  function worldFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(1, rect.width);
    const scaleY = canvas.height / Math.max(1, rect.height);
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const wx = mx + cameraX;
    const wy = my;
    const tx = Math.floor(wx / TILE) * TILE;
    const ty = Math.floor(wy / TILE) * TILE;
    return { wx, wy, tx, ty, mx, my };
  }

  function hasGroundAt(tx) {
    return platforms.some(p => p.type === "ground" && tx >= p.x && tx < p.x + p.w);
  }

  function eraseGroundAt(tx) {
    const next = [];
    for (const p of platforms) {
      if (p.type !== "ground") { next.push(p); continue; }
      if (tx + TILE <= p.x || tx >= p.x + p.w) { next.push(p); continue; }
      const leftW = tx - p.x;
      const rightX = tx + TILE;
      const rightW = p.x + p.w - rightX;
      if (leftW > 0) next.push({ x: p.x, y: p.y, w: leftW, h: p.h, type: "ground" });
      if (rightW > 0) next.push({ x: rightX, y: p.y, w: rightW, h: p.h, type: "ground" });
    }
    platforms = next;
  }

  function placeGroundAt(tx) {
    if (hasGroundAt(tx)) return false;
    let left = null, right = null;
    for (const p of platforms) {
      if (p.type !== "ground") continue;
      if (p.x + p.w === tx) left = p;
      if (p.x === tx + TILE) right = p;
    }
    if (left && right) {
      left.w = right.x + right.w - left.x;
      platforms = platforms.filter(p => p !== right);
    } else if (left) {
      left.w += TILE;
    } else if (right) {
      right.w += TILE;
      right.x = tx;
    } else {
      platforms.push({ x: tx, y: GROUND_Y, w: TILE, h: H - GROUND_Y, type: "ground" });
    }
    return true;
  }

  function removeBlocksAt(tx, ty) {
    platforms = platforms.filter(p => {
      if (p.type === "brick" || p.type === "question" || p.type === "used") {
        return !(p.x === tx && p.y === ty);
      }
      return true;
    });
  }

  function placeAt(tx, ty, force) {
    if (tx < 0 || ty < 0 || ty >= H) return;
    if (tx >= levelW) return;
    const key = editTool + ":" + tx + ":" + ty;
    if (!force && key === lastPaintKey && paintMode === "place") return;
    lastPaintKey = key;

    if (editTool === "erase") {
      eraseAt(tx, ty);
      return;
    }
    if (editTool === "ground") {
      placeGroundAt(tx);
      return;
    }
    if (editTool === "flag") {
      platforms = platforms.filter(p => p.type !== "flag" && p.type !== "flagpole");
      platforms.push({ x: tx + 20, y: 120, w: 12, h: GROUND_Y - 120, type: "flagpole" });
      platforms.push({ x: tx, y: 100, w: 50, h: 20, type: "flag" });
      return;
    }
    if (editTool === "coin") {
      coins = coins.filter(c => !(Math.floor(c.x / TILE) * TILE === tx && Math.floor(c.y / TILE) * TILE === ty));
      coins.push({ x: tx + 10, y: ty + 8, taken: false });
      return;
    }
    if (editTool === "goomba" || editTool === "koopa" || editTool === "piranha" || editTool === "bullet" || editTool === "redmario" || editTool === "spiny" || editTool === "enemy") {
      const kind = editTool === "enemy" ? "goomba" : editTool;
      enemies = enemies.filter(e => !(Math.floor(e.x / TILE) * TILE === tx && Math.abs((e.y || 0) - ty) < TILE));
      if (kind === "piranha") {
        enemies.push(makeEnemy({ x: tx + 4, y: ty, kind: "piranha", baseY: ty, vx: 0 }));
      } else if (kind === "bullet") {
        enemies.push(makeEnemy({ x: tx, y: ty, kind: "bullet", vx: -3.2 }));
      } else if (kind === "koopa") {
        enemies.push(makeEnemy({ x: tx, y: Math.min(ty, GROUND_Y - 48), kind: "koopa", vx: -1.1 }));
      } else if (kind === "spiny") {
        enemies.push(makeEnemy({ x: tx, y: Math.min(ty, GROUND_Y - 36), kind: "spiny", vx: -1.0 }));
      } else if (kind === "redmario") {
        enemies.push(makeEnemy({ x: tx, y: Math.min(ty, GROUND_Y - 48), kind: "redmario", vx: -2.2 }));
      } else {
        enemies.push(makeEnemy({ x: tx, y: Math.min(ty, GROUND_Y - 40), kind: "goomba", vx: -1.2 }));
      }
      return;
    }
    if (editTool === "mushroom" || editTool === "star" || editTool === "1up" || editTool === "mega") {
      powerups = powerups.filter(p => !(Math.floor(p.x / TILE) * TILE === tx && Math.floor(p.y / TILE) * TILE === ty));
      powerups.push(makePowerup({
        x: tx + 4, y: Math.min(ty, GROUND_Y - 36), kind: editTool,
        vx: editTool === "star" ? 2.2 : editTool === "mega" ? 1.8 : 1.4
      }));
      return;
    }
    if (editTool === "pipe") {
      platforms = platforms.filter(p => !(p.type === "pipe" && Math.abs(p.x - tx) < 40));
      const h = Math.max(60, Math.min(GROUND_Y - 40, GROUND_Y - ty));
      platforms.push({ x: tx, y: GROUND_Y - h, w: 64, h: h + 4, type: "pipe" });
      return;
    }
    if (editTool === "brick" || editTool === "question") {
      if (ty >= GROUND_Y) return;
      removeBlocksAt(tx, ty);
      // ?-блок: ПКМ-цикл не нужен; чередуем содержимое по позиции
      const itemRoll = ((tx / TILE) + (ty / TILE)) % 5;
      const item = editTool === "question"
        ? (itemRoll === 0 ? "mushroom" : itemRoll === 1 ? "star" : itemRoll === 2 ? "1up" : itemRoll === 3 ? "mega" : "coin")
        : "coin";
      platforms.push({ x: tx, y: ty, w: TILE, h: TILE, type: editTool, hit: false, item });
    }
  }

  function eraseAt(tx, ty) {
    const key = "erase:" + tx + ":" + ty;
    if (key === lastPaintKey && paintMode === "erase") return;
    lastPaintKey = key;

    // coins
    const beforeCoins = coins.length;
    coins = coins.filter(c => !(Math.floor(c.x / TILE) * TILE === tx && Math.floor(c.y / TILE) * TILE === ty));
    if (coins.length !== beforeCoins) return;

    // powerups
    const beforePu = powerups.length;
    powerups = powerups.filter(p => !(Math.floor(p.x / TILE) * TILE === tx && Math.floor(p.y / TILE) * TILE === ty));
    if (powerups.length !== beforePu) return;

    // enemies
    const beforeEn = enemies.length;
    enemies = enemies.filter(e => !(Math.floor(e.x / TILE) * TILE === tx && Math.floor(e.y / TILE) * TILE === ty));
    if (enemies.length !== beforeEn) return;

    // blocks at exact tile
    const beforeP = platforms.length;
    removeBlocksAt(tx, ty);
    if (platforms.length !== beforeP) return;

    // pipes
    const beforePipe = platforms.length;
    platforms = platforms.filter(p => {
      if (p.type !== "pipe") return true;
      return !(tx + TILE > p.x && tx < p.x + p.w && ty + TILE > p.y && ty < p.y + p.h);
    });
    if (platforms.length !== beforePipe) return;

    // flag
    const flagHit = platforms.some(p =>
      (p.type === "flag" || p.type === "flagpole") &&
      tx + TILE > p.x - 10 && tx < p.x + 60 && ty < 220
    );
    if (flagHit) {
      platforms = platforms.filter(p => p.type !== "flag" && p.type !== "flagpole");
      return;
    }

    // ground only if clicking near ground row
    if (ty >= GROUND_Y - TILE) {
      eraseGroundAt(tx);
    }
  }

  function panEditor(dx) {
    const maxCam = Math.max(0, levelW - W);
    editorCamera = Math.max(0, Math.min(maxCam, editorCamera + dx));
    cameraX = editorCamera;
  }

  function setEditing(on) {
    editing = !!on;
    paintMode = null;
    lastPaintKey = "";
    hoverTile = null;

    const panel = document.getElementById("editorPanel");
    if (panel) {
      panel.classList.toggle("open", editing);
      panel.style.display = editing ? "flex" : "none";
    }
    canvas.classList.toggle("editing", editing);

    const btn = document.getElementById("btnEditor");
    if (btn) btn.textContent = editing ? "▶ Играть" : "✏️ Редактор";

    const hint = document.getElementById("hintText");
    if (hint) {
      hint.innerHTML = editing
        ? "РЕДАКТОР: выбери инструмент сверху → кликай по жёлтому полю · ЛКМ поставить · ПКМ стереть · Esc выход"
        : "A/D или ←/→ — бег · W / ↑ / Пробел — прыжок · R — заново · N — след. уровень · 1–9 — уровень<br>Прыгай на врагов сверху, собирай монеты, добеги до флага!";
    }

    if (editing) {
      currentLevelData = snapshotFromWorld();
      document.getElementById("status").textContent = "РЕДАКТОР";
      document.getElementById("editWidth").value = String(Math.round(levelW / TILE));
      editorCamera = cameraX || 0;
      setTool(editTool || "brick");
      editMsg("Редактор включён — выбери инструмент и кликай по полю");
      try { canvas.focus(); } catch {}
    } else {
      editMsg("");
      document.getElementById("status").textContent = "ДОЙДИ ДО ФЛАГА!";
      if (player) {
        player.x = 80;
        player.y = H - 160;
        player.vx = 0;
        player.vy = 0;
      }
      won = false;
      dead = false;
    }
    updateLevelBar();
  }

  // tool bar UI
  const toolBar = document.getElementById("toolBar");
  for (const t of TOOLS) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = t.label;
    b.dataset.tool = t.id;
    if (t.id === editTool) b.classList.add("active");
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setTool(t.id);
    });
    toolBar.appendChild(b);
  }

  document.getElementById("btnEditor").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(!editing);
  });

  document.getElementById("btnMusic").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMusic();
  });

  document.getElementById("btnSaveLevel").addEventListener("click", () => {
    try {
      const slot = document.getElementById("editSlot").value;
      const data = snapshotFromWorld();
      data.w = levelW;
      const store = loadCustomStore();
      store[slot] = data;
      saveCustomStore(store);
      currentLevelIndex = parseInt(slot, 10) - 1;
      document.getElementById("status").textContent = "Сохранено в слот " + slot;
      editMsg("Уровень сохранён в слот " + slot);
    } catch (err) {
      editMsg("Ошибка сохранения: " + err.message);
    }
  });

  document.getElementById("btnLoadLevel").addEventListener("click", () => {
    const slot = parseInt(document.getElementById("editSlot").value, 10) - 1;
    currentLevelIndex = slot;
    buildFromData(getLevelData(slot));
    document.getElementById("editWidth").value = String(Math.round(levelW / TILE));
    document.getElementById("status").textContent = "Загружен слот " + (slot + 1);
    editMsg("Загружен слот " + (slot + 1));
    updateLevelBar();
  });

  document.getElementById("btnClearLevel").addEventListener("click", () => {
    if (!confirm("Очистить уровень?")) return;
    const tiles = Math.max(40, Math.round(levelW / TILE) || 80);
    buildFromData(emptyLevel(tiles));
    document.getElementById("status").textContent = "Очищено";
    editMsg("Уровень очищен — поставь землю и объекты");
  });

  document.getElementById("btnTestPlay").addEventListener("click", () => {
    currentLevelData = snapshotFromWorld();
    setEditing(false);
    coinCount = 0;
    lives = 3;
    document.getElementById("coins").textContent = "0";
    document.getElementById("lives").textContent = "3";
    buildFromData(currentLevelData);
    resetPlayer(false);
    document.getElementById("status").textContent = "ТЕСТ УРОВНЯ";
  });

  document.getElementById("btnResetOfficial").addEventListener("click", () => {
    const slot = parseInt(document.getElementById("editSlot").value, 10) - 1;
    const store = loadCustomStore();
    delete store[String(slot + 1)];
    saveCustomStore(store);
    currentLevelIndex = slot;
    buildFromData(cloneLevel(OFFICIAL[slot]));
    document.getElementById("editWidth").value = String(Math.round(levelW / TILE));
    document.getElementById("status").textContent = "Официальный уровень " + (slot + 1);
    editMsg("Вернули официальный уровень " + (slot + 1));
    updateLevelBar();
  });

  document.getElementById("btnApplyWidth").addEventListener("click", () => {
    const tiles = Math.max(40, Math.min(200, parseInt(document.getElementById("editWidth").value, 10) || 80));
    levelW = tiles * TILE;
    document.getElementById("editWidth").value = String(tiles);
    editMsg("Ширина: " + tiles + " тайлов (" + levelW + " px)");
  });

  document.getElementById("editSlot").addEventListener("change", () => {
    const slot = parseInt(document.getElementById("editSlot").value, 10) - 1;
    currentLevelIndex = slot;
    buildFromData(getLevelData(slot));
    document.getElementById("editWidth").value = String(Math.round(levelW / TILE));
    updateLevelBar();
  });

  document.getElementById("btnPanLeft").addEventListener("click", () => panEditor(-TILE * 4));
  document.getElementById("btnPanRight").addEventListener("click", () => panEditor(TILE * 4));

  canvas.addEventListener("contextmenu", (e) => {
    if (editing) e.preventDefault();
  });

  function applyPointerPaint(e) {
    if (!editing) return;
    const { tx, ty } = worldFromEvent(e);
    hoverTile = { tx, ty };
    if (paintMode === "place") placeAt(tx, ty, false);
    else if (paintMode === "erase") eraseAt(tx, ty);
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (!editing) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    const { tx, ty } = worldFromEvent(e);
    hoverTile = { tx, ty };
    lastPaintKey = "";
    if (e.button === 2 || e.button === 1 || editTool === "erase") {
      paintMode = "erase";
      eraseAt(tx, ty);
    } else {
      paintMode = "place";
      placeAt(tx, ty, true);
    }
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!editing) return;
    const { tx, ty } = worldFromEvent(e);
    hoverTile = { tx, ty };
    if (paintMode) applyPointerPaint(e);
  });

  function endPaint(e) {
    paintMode = null;
    lastPaintKey = "";
    if (e && e.pointerId != null) {
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    }
  }
  canvas.addEventListener("pointerup", endPaint);
  canvas.addEventListener("pointercancel", endPaint);
  canvas.addEventListener("pointerleave", () => {
    if (!paintMode) hoverTile = null;
  });

  canvas.addEventListener("wheel", (e) => {
    if (!editing) return;
    e.preventDefault();
    panEditor(e.deltaY * 0.9 + e.deltaX);
  }, { passive: false });

  document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();

    if (e.key === "Escape" && editing) {
      setEditing(false);
      return;
    }

    if (editing) {
      const toolKeys = {
        "1": "brick", "2": "question", "3": "ground", "4": "pipe",
        "5": "coin", "6": "goomba", "7": "koopa", "8": "piranha",
        "9": "bullet", "0": "flag",
        "r": "redmario", "R": "redmario",
        "s": "spiny", "S": "spiny",
        "m": "mushroom", "M": "mushroom",
        "g": "mega", "G": "mega",
        "t": "star", "T": "star",
        "u": "1up", "U": "1up",
        "x": "erase", "X": "erase"
      };
      if (toolKeys[e.key]) {
        setTool(toolKeys[e.key]);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") panEditor(-TILE * 2);
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") panEditor(TILE * 2);
      return;
    }

    if (e.key === "r" || e.key === "R") resetPlayer(true);
    if ((e.key === "n" || e.key === "N") && won && currentLevelIndex < 8) {
      goToLevel(currentLevelIndex + 1, true);
    }
    if (e.key >= "1" && e.key <= "9") {
      goToLevel(parseInt(e.key, 10) - 1, false);
    }
    if ((e.key === "e" || e.key === "E") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setEditing(!editing);
    }
  });
  document.addEventListener("keyup", (e) => { keys[e.key] = false; });

  function bindHold(id, key) {
    const el = document.getElementById(id);
    if (!el) return;
    const on = (e) => { e.preventDefault(); keys[key] = true; };
    const off = (e) => { e.preventDefault(); keys[key] = false; };
    el.addEventListener("mousedown", on);
    el.addEventListener("mouseup", off);
    el.addEventListener("mouseleave", off);
    el.addEventListener("touchstart", on, { passive: false });
    el.addEventListener("touchend", off);
  }
  bindHold("btnLeft", "_left");
  bindHold("btnRight", "_right");
  bindHold("btnUp", "_jump");
  bindHold("btnJump", "_jump");

  // start
  try {
    goToLevel(0, true);
  } catch (err) {
    console.error("Mario level load error", err);
    buildFromData(cloneLevel(OFFICIAL[0]));
    resetPlayer(false);
  }
  if (!player) {
    player = { x: 80, y: H - 160, w: 34, h: 44, vx: 0, vy: 0, onGround: false, facing: 1 };
  }
  function loop() {
    try {
      update();
      draw();
    } catch (err) {
      console.error("Mario frame error", err);
      // не останавливаем игру — хотя бы силуэт Марио
      if (player && ctx) {
        ctx.fillStyle = "#5c94fc";
        ctx.fillRect(0, 0, W, H);
        drawMarioSilhouette(player.x - cameraX, player.y, player.facing || 1);
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  canvas.focus();
  canvas.addEventListener("click", () => canvas.focus());
})();
