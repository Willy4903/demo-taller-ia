const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;

const speedEl = document.getElementById("speed-value");
const timeEl = document.getElementById("time-value");
const distEl = document.getElementById("dist-value");
const checkpointMsg = document.getElementById("checkpoint-msg");
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const gameOverTitle = document.getElementById("game-over-title");
const finalStats = document.getElementById("final-stats");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const positionEl = document.getElementById("position-value");

// ---------- Pseudo-3D road engine ----------
const SEG_LEN = 200;
const ROAD_WIDTH = 2200;
const CAMERA_HEIGHT = 1100;
const FOV = 100;
const CAMERA_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const DRAW_DISTANCE = 220;

let segments = [];
let trackLength = 0;
let checkpoints = [];

function lastY() {
  return segments.length === 0 ? 0 : segments[segments.length - 1].p2.world.y;
}

function addSegment(curve, y) {
  const n = segments.length;
  segments.push({
    index: n,
    p1: { world: { z: n * SEG_LEN, y: lastY() }, camera: {}, screen: {} },
    p2: { world: { z: (n + 1) * SEG_LEN, y }, camera: {}, screen: {} },
    curve,
    color: Math.floor(n / 3) % 2 ? "dark" : "light",
  });
}

function addRoad(enterN, holdN, leaveN, curve, y1) {
  const startY = lastY();
  const total = enterN + holdN + leaveN;
  for (let i = 0; i < enterN; i++) {
    addSegment(easeIn(0, curve, i / enterN), interpolate(startY, y1, easeInOut(0, 1, i / total)));
  }
  for (let i = 0; i < holdN; i++) {
    addSegment(curve, interpolate(startY, y1, easeInOut(0, 1, (enterN + i) / total)));
  }
  for (let i = 0; i < leaveN; i++) {
    addSegment(easeInOut(curve, 0, i / leaveN), interpolate(startY, y1, easeInOut(0, 1, (enterN + holdN + i) / total)));
  }
}

function easeIn(a, b, t) { return a + (b - a) * t * t; }
function easeInOut(a, b, t) { return a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5); }
function interpolate(a, b, t) { return a + (b - a) * t; }

const CURVE = { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 };
const HILL = { NONE: 0, LOW: 400, MEDIUM: 900, HIGH: 1500 };

// ---------- Worlds / themes (like classic arcade racers touring different countries) ----------
const THEMES = [
  {
    name: "París",
    skyTop: "#2a1a5e", skyBottom: "#ff9ecf", sun: "#ffd93d",
    grassLight: "#3fae55", grassDark: "#329247",
    roadLight: "#6b6b7a", roadDark: "#5c5c68",
    decoration: "paris",
  },
  {
    name: "Desierto",
    skyTop: "#8b3a2a", skyBottom: "#ffcf6b", sun: "#fff2b0",
    grassLight: "#d8b370", grassDark: "#c9a35c",
    roadLight: "#7a6a5c", roadDark: "#6b5d50",
    decoration: "desert",
  },
  {
    name: "Bosque",
    skyTop: "#1e5fae", skyBottom: "#bfe9ff", sun: "#fff6c8",
    grassLight: "#2f8f4e", grassDark: "#26773f",
    roadLight: "#5c5c68", roadDark: "#4f4f5a",
    decoration: "forest",
  },
  {
    name: "Ciudad Nocturna",
    skyTop: "#050318", skyBottom: "#241a4a", sun: "#f2f2ff",
    grassLight: "#20232e", grassDark: "#191b24",
    roadLight: "#3a3a46", roadDark: "#303039",
    decoration: "city",
  },
];

function getThemeIndex(segIndex) {
  for (let i = 0; i < checkpoints.length; i++) {
    if (segIndex < checkpoints[i]) return i;
  }
  return checkpoints.length;
}

function buildTrack() {
  segments = [];
  checkpoints = [];
  addRoad(40, 40, 40, CURVE.NONE, 0);
  addRoad(40, 60, 40, CURVE.EASY, HILL.LOW);
  addRoad(40, 60, 40, -CURVE.MEDIUM, 0);
  addRoad(30, 30, 30, CURVE.NONE, 0);
  checkpoints.push(segments.length);
  addRoad(40, 80, 40, CURVE.HARD, HILL.MEDIUM);
  addRoad(40, 60, 40, -CURVE.HARD, 0);
  addRoad(20, 20, 20, CURVE.NONE, 0);
  addRoad(40, 50, 40, CURVE.MEDIUM, HILL.HIGH);
  checkpoints.push(segments.length);
  addRoad(40, 50, 40, -CURVE.EASY, HILL.LOW);
  addRoad(30, 60, 30, CURVE.HARD, 0);
  addRoad(20, 20, 20, CURVE.NONE, 0);
  addRoad(30, 70, 30, -CURVE.MEDIUM, HILL.MEDIUM);
  checkpoints.push(segments.length);
  addRoad(30, 70, 30, CURVE.MEDIUM, 0);
  addRoad(40, 40, 40, CURVE.NONE, 0);
  addRoad(20, 40, 20, CURVE.HARD, 0);
  addRoad(20, 40, 20, -CURVE.HARD, 0);
  addRoad(60, 60, 60, CURVE.NONE, 0);
  trackLength = segments.length * SEG_LEN;
}

function findSegment(z) {
  return segments[Math.floor(z / SEG_LEN) % segments.length];
}

function project(p, cameraX, cameraY, cameraZ) {
  p.camera.x = (p.world.x || 0) - cameraX;
  p.camera.y = (p.world.y || 0) - cameraY;
  p.camera.z = (p.world.z || 0) - cameraZ;
  const clampedZ = Math.max(p.camera.z, 1);
  p.screen.scale = CAMERA_DEPTH / clampedZ;
  p.screen.x = Math.round(W / 2 + (p.screen.scale * p.camera.x * W) / 2);
  p.screen.y = Math.round(H / 2 - (p.screen.scale * p.camera.y * H) / 2);
  p.screen.w = Math.round((p.screen.scale * ROAD_WIDTH * W) / 2);
}

// ---------- Rival cars (8-car grid including the player) ----------
const NUM_RIVALS = 7;
const RIVAL_PALETTES = [
  { body: "#3fa7ff", dark: "#1c5fb0", name: "#7fd0ff" },
  { body: "#7cff6b", dark: "#3aa62c", name: "#c9ffb8" },
  { body: "#ff8c3f", dark: "#c95a12", name: "#ffd7b0" },
  { body: "#c86bff", dark: "#7f2fc9", name: "#e6c2ff" },
  { body: "#ffe45e", dark: "#c9a318", name: "#fff3ae" },
  { body: "#4be0d0", dark: "#1f9e91", name: "#b6fff5" },
  { body: "#ff5e8a", dark: "#c9214f", name: "#ffc0d3" },
];

let rivals = [];

function initRivals() {
  rivals = [];
  for (let i = 0; i < NUM_RIVALS; i++) {
    const z = ((i + 1) / (NUM_RIVALS + 1)) * trackLength + (Math.random() * 600 - 300);
    rivals.push({
      z: ((z % trackLength) + trackLength) % trackLength,
      offset: [-0.8, -0.35, 0.35, 0.8, -0.55, 0.55, 0][i],
      palette: RIVAL_PALETTES[i % RIVAL_PALETTES.length],
      baseSpeed: MAX_SPEED * (0.5 + Math.random() * 0.25),
      wobbleSeed: Math.random() * 1000,
    });
  }
}

function updateRivals(dt) {
  for (const r of rivals) {
    r.z = (r.z + r.baseSpeed * dt) % trackLength;
    if (r.z < 0) r.z += trackLength;
  }
}

function buildRivalMap() {
  const map = new Map();
  for (const r of rivals) {
    const idx = Math.floor(r.z / SEG_LEN) % segments.length;
    if (!map.has(idx)) map.set(idx, []);
    map.get(idx).push(r);
  }
  return map;
}

function playerRacePosition() {
  let ahead = 0;
  for (const r of rivals) {
    if (r.z > position) ahead++;
  }
  return ahead + 1;
}

// ---------- Game state ----------
let state = "start";
let position = 0;
let playerX = 0; // -1..1 within road, can exceed onto grass
let speed = 0;
const MAX_SPEED = 14000;
const ACCEL = 9000;
const BRAKE = 12000;
const DECEL = 4000;
const OFFROAD_DECEL = 9000;
const OFFROAD_LIMIT = MAX_SPEED * 0.4;
const CENTRIFUGAL = 0.3;

let timeLeft = 60;
let raceFinished = false;
let raceFailed = false;
let checkpointIndex = 0;
let lastFrame = null;

const keys = { left: false, right: false, gas: false, brake: false, turbo: false };
let turboFuel = 100;

function resetGame() {
  buildTrack();
  initRivals();
  position = 0;
  playerX = 0;
  speed = 0;
  timeLeft = 60;
  raceFinished = false;
  raceFailed = false;
  checkpointIndex = 0;
  turboFuel = 100;
  updateHUD();
}

function updateHUD() {
  speedEl.textContent = String(Math.floor(speed / 60)).padStart(3, "0");
  timeEl.textContent = Math.max(0, Math.ceil(timeLeft));
  distEl.textContent = Math.min(100, Math.floor((position / trackLength) * 100)) + "%";
  if (positionEl) positionEl.textContent = `${playerRacePosition()}/${NUM_RIVALS + 1}`;
}

function showCheckpoint() {
  checkpointMsg.classList.remove("hidden");
  checkpointMsg.style.animation = "none";
  void checkpointMsg.offsetWidth;
  checkpointMsg.style.animation = "";
  setTimeout(() => checkpointMsg.classList.add("hidden"), 1000);
}

function update(dt) {
  const playerSeg = findSegment(position);
  const speedPercent = speed / MAX_SPEED;

  if (keys.turbo && turboFuel > 0) {
    speed += ACCEL * 2.2 * dt;
    turboFuel -= dt * 40;
  } else if (keys.gas) {
    speed += ACCEL * dt;
    turboFuel = Math.min(100, turboFuel + dt * 8);
  } else {
    speed -= DECEL * dt;
  }
  if (keys.brake) speed -= BRAKE * dt;

  const offRoad = Math.abs(playerX) > 1;
  if (offRoad && speed > OFFROAD_LIMIT) {
    speed -= OFFROAD_DECEL * dt;
  }

  speed = Math.max(0, Math.min(MAX_SPEED, speed));

  const dx = dt * 2 * speedPercent;
  if (keys.left) playerX -= dx;
  if (keys.right) playerX += dx;

  playerX -= dx * speedPercent * (playerSeg.curve * CENTRIFUGAL) / 5;
  playerX = Math.max(-2, Math.min(2, playerX));

  position += speed * dt;
  updateRivals(dt);

  if (position >= trackLength) {
    position = trackLength;
    if (!raceFinished) {
      raceFinished = true;
      endGame(true);
    }
  }

  const segIndex = Math.floor(position / SEG_LEN);
  if (checkpointIndex < checkpoints.length && segIndex >= checkpoints[checkpointIndex]) {
    checkpointIndex++;
    timeLeft += 15;
    showCheckpoint();
  }

  for (const r of rivals) {
    const dz = Math.abs(r.z - position);
    if (dz < SEG_LEN * 1.2 && Math.abs(playerX - r.offset) < 0.5) {
      speed *= 0.96;
    }
  }

  timeLeft -= dt;
  if (timeLeft <= 0 && !raceFinished && !raceFailed) {
    timeLeft = 0;
    raceFailed = true;
    endGame(false);
  }

  updateHUD();
}

// ---------- Rendering ----------
function renderSky(theme) {
  const grd = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  grd.addColorStop(0, theme.skyTop);
  grd.addColorStop(1, theme.skyBottom);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H * 0.55);

  ctx.fillStyle = theme.sun;
  ctx.beginPath();
  ctx.arc(W * 0.8, H * 0.22, 40, 0, Math.PI * 2);
  ctx.fill();

  const parallax = (position * 0.03) % 1000;
  ctx.save();
  ctx.translate(-parallax, 0);
  for (let rep = 0; rep < 3; rep++) {
    drawDecoration(theme.decoration, rep * 1000);
  }
  ctx.restore();

  if (theme.decoration === "city") {
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137) % W;
      const sy = (i * 71) % (H * 0.3);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
}

function drawDecoration(type, xOffset) {
  if (type === "paris") {
    ctx.fillStyle = "#4a2f7a";
    for (let i = 0; i < 5; i++) {
      const bx = xOffset + i * 200;
      ctx.fillRect(bx, H * 0.4, 60, H * 0.15);
    }
    const tx = xOffset + 420;
    ctx.strokeStyle = "#2f2050";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tx - 30, H * 0.55);
    ctx.lineTo(tx, H * 0.28);
    ctx.lineTo(tx + 30, H * 0.55);
    ctx.moveTo(tx - 18, H * 0.48);
    ctx.lineTo(tx + 18, H * 0.48);
    ctx.moveTo(tx - 9, H * 0.4);
    ctx.lineTo(tx + 9, H * 0.4);
    ctx.stroke();
  } else if (type === "desert") {
    ctx.fillStyle = "#a0522d";
    for (let i = 0; i < 4; i++) {
      const bx = xOffset + i * 260 + 60;
      ctx.beginPath();
      ctx.moveTo(bx - 70, H * 0.55);
      ctx.lineTo(bx - 30, H * 0.38);
      ctx.lineTo(bx + 30, H * 0.38);
      ctx.lineTo(bx + 70, H * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#2f6b3a";
    for (let i = 0; i < 6; i++) {
      const cx = xOffset + i * 170 + 30;
      ctx.fillRect(cx, H * 0.46, 8, H * 0.09);
      ctx.fillRect(cx - 10, H * 0.48, 8, H * 0.05);
      ctx.fillRect(cx + 10, H * 0.48, 8, H * 0.05);
    }
  } else if (type === "forest") {
    ctx.fillStyle = "#6b7a8c";
    for (let i = 0; i < 4; i++) {
      const bx = xOffset + i * 300;
      ctx.beginPath();
      ctx.moveTo(bx, H * 0.55);
      ctx.lineTo(bx + 90, H * 0.3);
      ctx.lineTo(bx + 180, H * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "#1f5c33";
    for (let i = 0; i < 10; i++) {
      const tx = xOffset + i * 100 + 20;
      ctx.beginPath();
      ctx.moveTo(tx, H * 0.55);
      ctx.lineTo(tx + 14, H * 0.4);
      ctx.lineTo(tx + 28, H * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  } else if (type === "city") {
    ctx.fillStyle = "#141428";
    for (let i = 0; i < 8; i++) {
      const bx = xOffset + i * 130;
      const bh = H * (0.18 + (i % 3) * 0.08);
      ctx.fillRect(bx, H * 0.55 - bh, 70, bh);
      ctx.fillStyle = "#ffcf6b";
      for (let w = 0; w < 4; w++) {
        for (let hh = 0; hh < 3; hh++) {
          if ((i + w + hh) % 3 !== 0) {
            ctx.fillRect(bx + 8 + w * 15, H * 0.55 - bh + 10 + hh * 18, 6, 8);
          }
        }
      }
      ctx.fillStyle = "#141428";
    }
  }
}

function polygon(x1, y1, w1, x2, y2, w2, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1 - w1, y1);
  ctx.lineTo(x2 - w2, y2);
  ctx.lineTo(x2 + w2, y2);
  ctx.lineTo(x1 + w1, y1);
  ctx.closePath();
  ctx.fill();
}

// ---------- Realistic-ish sports car sprite (rear 3/4 view) ----------
function drawCarRear(x, y, scale, palette, opts) {
  opts = opts || {};
  const w = 100 * scale;
  const h = 58 * scale;
  ctx.save();
  ctx.translate(x, y);

  // ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.46, w * 0.46, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // rear wheels peeking out
  ctx.fillStyle = "#161616";
  ctx.beginPath();
  ctx.ellipse(-w * 0.46, h * 0.28, w * 0.09, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.46, h * 0.28, w * 0.09, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();

  // body silhouette (rounded, tapered toward the roof)
  const bodyGrad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.42);
  bodyGrad.addColorStop(0, shade(palette.body, 35));
  bodyGrad.addColorStop(0.45, palette.body);
  bodyGrad.addColorStop(1, palette.dark);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, -h * 0.5);
  ctx.quadraticCurveTo(-w * 0.42, -h * 0.46, -w * 0.46, -h * 0.2);
  ctx.lineTo(-w * 0.5, h * 0.1);
  ctx.quadraticCurveTo(-w * 0.5, h * 0.42, -w * 0.42, h * 0.42);
  ctx.lineTo(w * 0.42, h * 0.42);
  ctx.quadraticCurveTo(w * 0.5, h * 0.42, w * 0.5, h * 0.1);
  ctx.lineTo(w * 0.46, -h * 0.2);
  ctx.quadraticCurveTo(w * 0.42, -h * 0.46, w * 0.3, -h * 0.5);
  ctx.closePath();
  ctx.fill();

  // roof highlight strip
  ctx.fillStyle = shade(palette.body, 55);
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, -h * 0.5);
  ctx.quadraticCurveTo(0, -h * 0.56, w * 0.3, -h * 0.5);
  ctx.lineTo(w * 0.26, -h * 0.44);
  ctx.quadraticCurveTo(0, -h * 0.5, -w * 0.26, -h * 0.44);
  ctx.closePath();
  ctx.fill();

  // rear windshield
  const glassGrad = ctx.createLinearGradient(0, -h * 0.42, 0, -h * 0.08);
  glassGrad.addColorStop(0, "#0d1a2b");
  glassGrad.addColorStop(1, "#4a6a8a");
  ctx.fillStyle = glassGrad;
  ctx.beginPath();
  ctx.moveTo(-w * 0.24, -h * 0.42);
  ctx.lineTo(w * 0.24, -h * 0.42);
  ctx.lineTo(w * 0.2, -h * 0.1);
  ctx.lineTo(-w * 0.2, -h * 0.1);
  ctx.closePath();
  ctx.fill();

  // side mirrors
  ctx.fillStyle = shade(palette.body, -10);
  ctx.fillRect(-w * 0.52, -h * 0.18, w * 0.06, h * 0.08);
  ctx.fillRect(w * 0.46, -h * 0.18, w * 0.06, h * 0.08);

  // trunk badge + center line
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(1, scale);
  ctx.beginPath();
  ctx.moveTo(0, -h * 0.08);
  ctx.lineTo(0, h * 0.3);
  ctx.stroke();

  // taillights
  ctx.fillStyle = "#ff2d2d";
  ctx.beginPath();
  ctx.moveTo(-w * 0.4, h * 0.02);
  ctx.quadraticCurveTo(-w * 0.46, h * 0.1, -w * 0.4, h * 0.2);
  ctx.lineTo(-w * 0.24, h * 0.2);
  ctx.lineTo(-w * 0.24, h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w * 0.4, h * 0.02);
  ctx.quadraticCurveTo(w * 0.46, h * 0.1, w * 0.4, h * 0.2);
  ctx.lineTo(w * 0.24, h * 0.2);
  ctx.lineTo(w * 0.24, h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffb0b0";
  ctx.fillRect(-w * 0.38, h * 0.06, w * 0.1, h * 0.03);
  ctx.fillRect(w * 0.28, h * 0.06, w * 0.1, h * 0.03);

  // rear bumper + exhausts
  ctx.fillStyle = shade(palette.dark, -20);
  ctx.fillRect(-w * 0.42, h * 0.34, w * 0.84, h * 0.1);
  ctx.fillStyle = "#2b2b2b";
  ctx.beginPath();
  ctx.ellipse(-w * 0.18, h * 0.42, w * 0.045, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.18, h * 0.42, w * 0.045, h * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();

  // license plate
  ctx.fillStyle = "#f2f2f2";
  ctx.fillRect(-w * 0.12, h * 0.28, w * 0.24, h * 0.08);

  // spoiler for sportier cars
  if (opts.spoiler) {
    ctx.fillStyle = shade(palette.dark, -10);
    ctx.fillRect(-w * 0.42, -h * 0.62, w * 0.1, h * 0.14);
    ctx.fillRect(w * 0.32, -h * 0.62, w * 0.1, h * 0.14);
    ctx.fillRect(-w * 0.44, -h * 0.66, w * 0.88, h * 0.08);
  }

  ctx.restore();
}

function shade(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

const PLAYER_PALETTE = { body: "#ff3b3b", dark: "#8f0000", name: "#ffb0b0" };

function renderRoad() {
  const baseSegment = findSegment(position);
  const basePercent = (position % SEG_LEN) / SEG_LEN;
  const playerY = interpolate(baseSegment.p1.world.y, baseSegment.p2.world.y, basePercent);
  const theme = THEMES[getThemeIndex(baseSegment.index)] || THEMES[THEMES.length - 1];
  const rivalMap = buildRivalMap();

  let x = 0;
  let dx = -(baseSegment.curve * basePercent);
  let maxY = H;

  ctx.fillStyle = theme.grassLight;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  const cameraHeight = CAMERA_HEIGHT + playerY;

  for (let n = 0; n < DRAW_DISTANCE; n++) {
    const segment = segments[(baseSegment.index + n) % segments.length];
    const looped = segment.index < baseSegment.index;
    const segZOffset = looped ? trackLength : 0;

    project(segment.p1, playerX * ROAD_WIDTH - x, cameraHeight, position - segZOffset);
    project(segment.p2, playerX * ROAD_WIDTH - (x + dx), cameraHeight, position - segZOffset);

    x += dx;
    dx += segment.curve;

    if (segment.p1.camera.z <= CAMERA_DEPTH || segment.p2.screen.y >= maxY) continue;

    const grassColor = segment.color === "light" ? theme.grassLight : theme.grassDark;
    const roadColor = segment.color === "light" ? theme.roadLight : theme.roadDark;
    const rumbleColor = segment.color === "light" ? "#d94a4a" : "#e8e8e8";
    const laneColor = segment.color === "light" ? "#e8e8e8" : theme.roadLight;

    polygon(W / 2, segment.p1.screen.y, W, W / 2, segment.p2.screen.y, W, grassColor);
    polygon(segment.p1.screen.x, segment.p1.screen.y, segment.p1.screen.w * 1.15,
            segment.p2.screen.x, segment.p2.screen.y, segment.p2.screen.w * 1.15, rumbleColor);
    polygon(segment.p1.screen.x, segment.p1.screen.y, segment.p1.screen.w,
            segment.p2.screen.x, segment.p2.screen.y, segment.p2.screen.w, roadColor);

    if (segment.color === "light") {
      polygon(segment.p1.screen.x, segment.p1.screen.y, segment.p1.screen.w * 0.03,
              segment.p2.screen.x, segment.p2.screen.y, segment.p2.screen.w * 0.03, laneColor);
    }

    maxY = segment.p2.screen.y;

    const carsHere = rivalMap.get(segment.index);
    if (carsHere) {
      for (const car of carsHere) {
        const carScale = segment.p2.screen.scale;
        if (carScale < 0.015) continue;
        const cx = segment.p2.screen.x + car.offset * segment.p2.screen.w;
        drawCarRear(cx, segment.p2.screen.y, carScale * 2.6, car.palette, { spoiler: true });
      }
    }
  }
}

function renderPlayerCar() {
  const steer = keys.left ? -1 : keys.right ? 1 : 0;
  const bounce = Math.sin(performance.now() / 70) * (speed > 8000 ? 2 : 0);
  ctx.save();
  ctx.translate(W / 2 + steer * 10, H - 82 + bounce);
  ctx.rotate(steer * 0.05);
  drawCarRear(0, 0, 2.3, PLAYER_PALETTE, { spoiler: true });
  ctx.restore();
}

function draw() {
  const baseSegment = findSegment(position);
  const theme = THEMES[getThemeIndex(baseSegment.index)] || THEMES[THEMES.length - 1];
  renderSky(theme);
  renderRoad();
  renderPlayerCar();
}

// ---------- Loop ----------
let rafId = null;
function loop(ts) {
  if (state !== "playing") return;
  if (!lastFrame) lastFrame = ts;
  const dt = Math.min((ts - lastFrame) / 1000, 0.05);
  lastFrame = ts;
  update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

function startGame() {
  resetGame();
  state = "playing";
  lastFrame = null;
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  rafId = requestAnimationFrame(loop);
}

function endGame(won) {
  state = "over";
  cancelAnimationFrame(rafId);
  gameOverTitle.textContent = won ? "🏁 ¡Meta! ¡Ganaste la carrera! 🏆" : "⏱️ ¡Se acabó el tiempo! ⏱️";
  const place = playerRacePosition();
  finalStats.textContent = `Posición: ${place}/${NUM_RIVALS + 1} · Distancia recorrida: ${Math.min(100, Math.floor((position / trackLength) * 100))}%`;
  gameOverScreen.classList.remove("hidden");
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = true;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = true;
  if (e.code === "ArrowUp" || e.code === "KeyW") keys.gas = true;
  if (e.code === "ArrowDown" || e.code === "KeyS") keys.brake = true;
  if (e.code === "Space") { e.preventDefault(); keys.turbo = true; }
});
window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") keys.left = false;
  if (e.code === "ArrowRight" || e.code === "KeyD") keys.right = false;
  if (e.code === "ArrowUp" || e.code === "KeyW") keys.gas = false;
  if (e.code === "ArrowDown" || e.code === "KeyS") keys.brake = false;
  if (e.code === "Space") keys.turbo = false;
});

function bindHold(id, key) {
  const el = document.getElementById(id);
  const on = (e) => { e.preventDefault(); keys[key] = true; };
  const off = (e) => { e.preventDefault(); keys[key] = false; };
  el.addEventListener("touchstart", on);
  el.addEventListener("touchend", off);
  el.addEventListener("mousedown", on);
  el.addEventListener("mouseup", off);
  el.addEventListener("mouseleave", off);
}
bindHold("btn-left", "left");
bindHold("btn-right", "right");
bindHold("btn-gas", "gas");
bindHold("btn-turbo", "turbo");

buildTrack();
initRivals();
draw();
