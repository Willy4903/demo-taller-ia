const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;
const H = canvas.height;
const GROUND_Y = H - 80;

const scoreEl = document.getElementById("score-value");
const livesEl = document.getElementById("lives");
const startScreen = document.getElementById("start-screen");
const gameOverScreen = document.getElementById("game-over-screen");
const gameOverTitle = document.getElementById("game-over-title");
const finalScoreEl = document.getElementById("final-score");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

let state = "start"; // start | playing | over
let score = 0;
let lives = 3;
let speed = 5;
let frame = 0;

const dino = {
  x: 90,
  y: GROUND_Y - 60,
  w: 60,
  h: 60,
  vy: 0,
  jumping: false,
  emoji: "🦕",
};

const GRAVITY = 0.9;
const JUMP_FORCE = -16;

let obstacles = [];
let stars = [];
let clouds = [];

function resetGame() {
  score = 0;
  lives = 3;
  speed = 5;
  frame = 0;
  dino.y = GROUND_Y - dino.h;
  dino.vy = 0;
  dino.jumping = false;
  obstacles = [];
  stars = [];
  clouds = [];
  for (let i = 0; i < 4; i++) {
    clouds.push({ x: Math.random() * W, y: 30 + Math.random() * 80, size: 30 + Math.random() * 20 });
  }
  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = score;
  livesEl.textContent = "❤️".repeat(Math.max(lives, 0)) + "🖤".repeat(3 - Math.max(lives, 0));
}

function jump() {
  if (state !== "playing") return;
  if (!dino.jumping) {
    dino.vy = JUMP_FORCE;
    dino.jumping = true;
  }
}

function spawnObstacle() {
  const kinds = ["🌵", "🪨", "🌲"];
  obstacles.push({
    x: W + 20,
    y: GROUND_Y - 45,
    w: 40,
    h: 45,
    emoji: kinds[Math.floor(Math.random() * kinds.length)],
  });
}

function spawnStar() {
  stars.push({
    x: W + 20,
    y: GROUND_Y - 90 - Math.random() * 90,
    w: 36,
    h: 36,
    collected: false,
  });
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w * 0.6 &&
    a.x + a.w * 0.6 > b.x &&
    a.y < b.y + b.h * 0.6 &&
    a.y + a.h * 0.6 > b.y
  );
}

function update() {
  frame++;

  // dino physics
  dino.vy += GRAVITY;
  dino.y += dino.vy;
  if (dino.y >= GROUND_Y - dino.h) {
    dino.y = GROUND_Y - dino.h;
    dino.vy = 0;
    dino.jumping = false;
  }

  // speed ramps up slowly
  speed = 5 + Math.min(score * 0.08, 6);

  // spawn logic
  if (frame % Math.max(70 - Math.floor(speed * 3), 40) === 0) {
    spawnObstacle();
  }
  if (frame % 90 === 0) {
    spawnStar();
  }

  // move & clean obstacles
  obstacles.forEach((o) => (o.x -= speed));
  obstacles = obstacles.filter((o) => o.x + o.w > -20);

  stars.forEach((s) => (s.x -= speed));
  stars = stars.filter((s) => s.x + s.w > -20 && !s.collected);

  clouds.forEach((c) => {
    c.x -= speed * 0.2;
    if (c.x < -50) c.x = W + 50;
  });

  // collisions
  const dinoBox = { x: dino.x, y: dino.y, w: dino.w, h: dino.h };
  for (const o of obstacles) {
    if (!o.hit && rectsOverlap(dinoBox, o)) {
      o.hit = true;
      lives--;
      updateHUD();
      if (lives <= 0) {
        endGame(false);
        return;
      }
    }
  }
  for (const s of stars) {
    if (!s.collected && rectsOverlap(dinoBox, s)) {
      s.collected = true;
      score++;
      updateHUD();
      if (score >= 20) {
        endGame(true);
        return;
      }
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  // sky gradient handled by CSS background; draw sun
  ctx.font = "50px sans-serif";
  ctx.fillText("☀️", W - 90, 70);

  // clouds
  ctx.font = "36px sans-serif";
  clouds.forEach((c) => ctx.fillText("☁️", c.x, c.y));

  // ground
  ctx.fillStyle = "#c9a15a";
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = "#8fd45c";
  ctx.fillRect(0, GROUND_Y, W, 12);

  // stars
  ctx.font = "34px sans-serif";
  stars.forEach((s) => ctx.fillText("⭐", s.x, s.y));

  // obstacles
  ctx.font = "40px sans-serif";
  obstacles.forEach((o) => ctx.fillText(o.emoji, o.x, o.y + o.h));

  // dino
  ctx.font = "50px sans-serif";
  ctx.fillText(dino.emoji, dino.x, dino.y + dino.h);
}

let loopId = null;
function loop() {
  if (state === "playing") {
    update();
    draw();
    loopId = requestAnimationFrame(loop);
  }
}

function startGame() {
  resetGame();
  state = "playing";
  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  loop();
}

function endGame(won) {
  state = "over";
  cancelAnimationFrame(loopId);
  gameOverTitle.textContent = won ? "🎉 ¡Ganaste todas las estrellas! 🎉" : "🦕 ¡Sigue intentando! 🦕";
  finalScoreEl.textContent = `Estrellas recogidas: ${score}`;
  gameOverScreen.classList.remove("hidden");
}

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    jump();
  }
});
canvas.addEventListener("mousedown", jump);
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  jump();
});

draw();
