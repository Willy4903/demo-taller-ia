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

// ---------- Pseudo-3D road engine ----------
const SEG_LEN = 200;
const ROAD_WIDTH = 2200;
const CAMERA_HEIGHT = 1100;
const FOV = 100;
const CAMERA_DEPTH = 1 / Math.tan((FOV / 2) * Math.PI / 180);
const DRAW_DISTANCE = 220;
const FOG_DENSITY = 5;

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
    cars: [],
  });
}

function addRoad(enterN, holdN, leaveN, curve, y0, y1) {
  const startY = lastY();
  const total = enterN + holdN + leaveN;
  for (let i = 0; i < enterN; i++) {
    const t = i / enterN;
    addSegment(easeIn(0, curve, t), interpolate(startY, y1, easeInOut(0, 1, (i) / total)));
  }
  for (let i = 0; i < holdN; i++) {
    addSegment(curve, interpolate(startY, y1, easeInOut(0, 1, (enterN + i) / total)));
  }
  for (let i = 0; i < leaveN; i++) {
    const t = i / leaveN;
    addSegment(easeInOut(curve, 0, t), interpolate(startY, y1, easeInOut(0, 1, (enterN + holdN + i) / total)));
  }
}

function easeIn(a, b, t) { return a + (b - a) * t * t; }
function easeInOut(a, b, t) { return a + (b - a) * ((-Math.cos(t * Math.PI) / 2) + 0.5); }
function interpolate(a, b, t) { return a + (b - a) * t; }

const CURVE = { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 };
const HILL = { NONE: 0, LOW: 400, MEDIUM: 900, HIGH: 1500 };

function buildTrack() {
  segments = [];
  addRoad(40, 40, 40, CURVE.NONE, 0, 0);
  addRoad(40, 60, 40, CURVE.EASY, 0, HILL.LOW);
  addRoad(40, 60, 40, -CURVE.MEDIUM, HILL.LOW, 0);
  addRoad(30, 30, 30, CURVE.NONE, 0, 0);
  checkpoints.push(segments.length);
  addRoad(40, 80, 40, CURVE.HARD, 0, HILL.MEDIUM);
  addRoad(40, 60, 40, -CURVE.HARD, HILL.MEDIUM, 0);
  addRoad(20, 20, 20, CURVE.NONE, 0, 0);
  addRoad(40, 50, 40, CURVE.MEDIUM, 0, HILL.HIGH);
  checkpoints.push(segments.length);
  addRoad(40, 50, 40, -CURVE.EASY, HILL.HIGH, HILL.LOW);
  addRoad(30, 60, 30, CURVE.HARD, HILL.LOW, 0);
  addRoad(20, 20, 20, CURVE.NONE, 0, 0);
  addRoad(30, 70, 30, -CURVE.MEDIUM, 0, HILL.MEDIUM);
  checkpoints.push(segments.length);
  addRoad(30, 70, 30, CURVE.MEDIUM, HILL.MEDIUM, 0);
  addRoad(40, 40, 40, CURVE.NONE, 0, 0);
  addRoad(20, 40, 20, CURVE.HARD, 0, 0);
  addRoad(20, 40, 20, -CURVE.HARD, 0, 0);
  addRoad(60, 60, 60, CURVE.NONE, 0, 0);
  trackLength = segments.length * SEG_LEN;

  // sprinkle simple decoration/rival cars along the track
  const rivalColors = ["#3fa7ff", "#7cff6b", "#ff8c3f", "#c86bff"];
  for (let i = 60; i < segments.length - 40; i += 45 + Math.floor(Math.random() * 40)) {
    const seg = segments[i % segments.length];
    seg.cars.push({
      offset: Math.random() * 1.4 - 0.7,
      color: rivalColors[Math.floor(Math.random() * rivalColors.length)],
      speed: 4000 + Math.random() * 2000,
    });
  }
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

// ---------- Game state ----------
let state = "start";
let position = 0;
let playerX = 0; // -1..1
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
  if (position >= trackLength) {
    position = trackLength;
    if (!raceFinished) {
      raceFinished = true;
      endGame(true);
    }
  }

  // checkpoints
  const segIndex = Math.floor(position / SEG_LEN);
  if (checkpointIndex < checkpoints.length && segIndex >= checkpoints[checkpointIndex]) {
    checkpointIndex++;
    timeLeft += 15;
    showCheckpoint();
  }

  // rival collision (very forgiving, just a slowdown)
  for (const car of playerSeg.cars) {
    if (Math.abs(playerX - car.offset) < 0.5) {
      speed *= 0.97;
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
function renderSky() {
  const grd = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  grd.addColorStop(0, "#2a1a5e");
  grd.addColorStop(1, "#ff9ecf");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H * 0.55);

  ctx.fillStyle = "#ffd93d";
  ctx.beginPath();
  ctx.arc(W * 0.8, H * 0.22, 40, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5b2e91";
  for (let i = 0; i < 6; i++) {
    const bx = (i * 160 - (position * 0.02) % 960);
    ctx.beginPath();
    ctx.moveTo(bx, H * 0.55);
    ctx.lineTo(bx + 80, H * 0.32);
    ctx.lineTo(bx + 160, H * 0.55);
    ctx.closePath();
    ctx.fill();
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

function drawCarSprite(x, y, scale, color, flip) {
  const w = 80 * scale;
  const h = 40 * scale;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.42, w * 0.45, h * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -h * 0.15, w, h * 0.35);
  ctx.fillStyle = shade(color, -30);
  ctx.fillRect(-w * 0.32, -h * 0.5, w * 0.64, h * 0.4);
  ctx.fillStyle = "#bfe9ff";
  ctx.fillRect(-w * 0.24, -h * 0.42, w * 0.48, h * 0.22);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-w / 2, h * 0.12, w * 0.18, h * 0.2);
  ctx.fillRect(w * 0.32, h * 0.12, w * 0.18, h * 0.2);
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

function renderRoad() {
  const baseSegment = findSegment(position);
  const basePercent = (position % SEG_LEN) / SEG_LEN;
  const playerSegment = findSegment(position + 0);
  const playerY = interpolate(playerSegment.p1.world.y, playerSegment.p2.world.y, basePercent);

  let x = 0;
  let dx = -(baseSegment.curve * basePercent);
  let maxY = H;

  ctx.fillStyle = "#3fae55";
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

    const grassColor = segment.color === "light" ? "#3fae55" : "#329247";
    const roadColor = segment.color === "light" ? "#6b6b7a" : "#5c5c68";
    const rumbleColor = segment.color === "light" ? "#d94a4a" : "#e8e8e8";
    const laneColor = segment.color === "light" ? "#e8e8e8" : "#6b6b7a";

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

    for (const car of segment.cars) {
      const carScale = segment.p2.screen.scale;
      if (carScale < 0.02) continue;
      const cx = segment.p2.screen.x + car.offset * segment.p2.screen.w;
      drawCarSprite(cx, segment.p2.screen.y, carScale * 2.4, car.color, false);
    }
  }
}

function renderPlayerCar() {
  const steer = keys.left ? -1 : keys.right ? 1 : 0;
  const bounce = Math.sin(performance.now() / 70) * (speed > 8000 ? 2 : 0);
  ctx.save();
  ctx.translate(W / 2 + steer * 10, H - 78 + bounce);
  ctx.rotate(steer * 0.05);
  ctx.scale(-1, 1);
  drawCarSpriteBig();
  ctx.restore();
}

function drawCarSpriteBig() {
  const w = 130;
  const h = 70;
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.beginPath();
  ctx.ellipse(0, h * 0.42, w * 0.45, h * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff3b3b";
  ctx.fillRect(-w / 2, -h * 0.1, w, h * 0.38);
  ctx.fillStyle = "#b30000";
  ctx.fillRect(-w * 0.3, -h * 0.5, w * 0.6, h * 0.42);
  ctx.fillStyle = "#bfe9ff";
  ctx.fillRect(-w * 0.22, -h * 0.42, w * 0.44, h * 0.24);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(-w / 2, h * 0.1, w * 0.2, h * 0.24);
  ctx.fillRect(w * 0.3, h * 0.1, w * 0.2, h * 0.24);
  ctx.fillStyle = "#ffd93d";
  ctx.fillRect(-w * 0.42, -h * 0.06, w * 0.1, h * 0.12);
  ctx.fillRect(w * 0.32, -h * 0.06, w * 0.1, h * 0.12);
}

function draw() {
  renderSky();
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
  finalStats.textContent = `Distancia recorrida: ${Math.min(100, Math.floor((position / trackLength) * 100))}%`;
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
draw();
