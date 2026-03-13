// --- ml5 & video ---
let handPose;
let video;
let hands = [];

// --- sounds ---
let bgmSound;
let explosionSound;
let laserSound;

// --- player 2 & state ---
let p2Ship;
let meteorites = [];
let p1Health = 100;

// --- rocket state ---
let pos;
let vel;
let accel;
let angle = 90;

// --- physics constants ---
const FRICTION = 0.95;
const POWER = 0.1;
const MAX_SPEED = 2;

function preload() {
  handPose = ml5.handPose();
  bgmSound = loadSound('SoundEffect/bgm.mp3');
  explosionSound = loadSound('SoundEffect/explosion.mp3');
  laserSound = loadSound('SoundEffect/lazer.mp3');
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  handPose.detectStart(video, gotHands);

  pos = createVector(width / 4, height / 2);
  vel = createVector(0, 0);
  accel = createVector(0, 0);

  // Init player 2 ship
  p2Ship = new Player2Ship();

  for (let i = 0; i < 4; i++) {
    meteorites.push(new Meteorite());
  }

  frameRate(30); // 稳定帧率，双人手势识别比较吃性能
}

// Ensure audio starts on first user interaction if blocked by browser
function mousePressed() {
  userStartAudio();
  if (!bgmSound.isPlaying()) {
    bgmSound.loop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// 核心辅助函数：将摄像头的原始坐标映射到我们镜像翻转后的画布上
function getMappedPoint(keypoint) {
  // 注意这里 width 和 0 是反过来的，为了匹配 scale(-1, 1) 的镜像效果
  let mx = map(keypoint.x, 0, video.width, width, 0);
  let my = map(keypoint.y, 0, video.height, 0, height);
  return createVector(mx, my);
}

function draw() {
  background(5, 10, 25);

  // Draw mirrored video at low opacity.
  // Using globalAlpha instead of tint() for hardware-accelerated blending.
  push();
  translate(width, 0);
  scale(-1, 1);
  drawingContext.globalAlpha = 50 / 255;
  image(video, 0, 0, width, height);
  drawingContext.globalAlpha = 1.0;
  pop();

  // ==========================================
  // --- 画面分割线 ---
  // ==========================================
  push();
  stroke(0, 200, 255, 150);
  strokeWeight(2);
  drawingContext.setLineDash([15, 15]); // 虚线效果
  line(width / 2, 0, width / 2, height);
  pop();

  // ==========================================
  // --- 双手分离与分配逻辑 ---
  // ==========================================
  let p1Hand = null;
  let p2Hand = null;

  for (let hand of hands) {
    let mappedWrist = getMappedPoint(hand.wrist);
    // 判断手在屏幕左侧还是右侧
    if (mappedWrist.x < width / 2) {
      p1Hand = hand;
    } else {
      p2Hand = hand;
    }
  }

  // ==========================================
  // --- Player 1 Logic (左半场) ---
  // ==========================================
  if (p1Hand) {
    let wrist = getMappedPoint(p1Hand.wrist);
    let middle = getMappedPoint(p1Hand.middle_finger_mcp);
    let indexTip = getMappedPoint(p1Hand.index_finger_tip);
    let thumbTip = getMappedPoint(p1Hand.thumb_tip);

    let targetAngle = atan2(middle.y - wrist.y, middle.x - wrist.x) + PI;
    angle = lerpAngle(angle, targetAngle, 0.15);

    let d = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);

    if (d > 40) { // 张开手指 -> 推进
      let dynamicPower = map(d, 40, 150, 0.1, POWER * 2.5, true);
      let force = p5.Vector.fromAngle(angle - HALF_PI);
      force.mult(dynamicPower);
      accel.add(force);
    }
  }

  // Physics update
  vel.add(accel);
  vel.limit(MAX_SPEED);
  vel.mult(FRICTION);
  pos.add(vel);
  accel.mult(0);

  // ==========================================
  // --- Player 2 & Environment Update (右半场) ---
  // ==========================================
  for (let m of meteorites) {
    m.update();
    m.draw();
  }

  p2Ship.update(p2Hand); // 把分好的右手数据传给 Player 2
  p2Ship.draw();

  // Collision detection between P2 lasers and P1 rocket
  for (let i = p2Ship.lasers.length - 1; i >= 0; i--) {
    let laser = p2Ship.lasers[i];
    // Check distance between laser line and player 1 center
    if (dist(laser.x, laser.y, pos.x, pos.y) < 35) {
      p1Health -= 10;
      p2Ship.lasers.splice(i, 1); // remove laser on hit
    }
  }

  // Collision detection between Meteorites and P1 rocket
  for (let m of meteorites) {
    if (dist(m.x, m.y, pos.x, pos.y) < m.size / 2 + 15) {
      p1Health -= 5; // 陨石伤害可以调整
      explosionSound.play(); // 播放爆炸音效
      m.reset(); // 撞击后重置陨石
    }
  }

  // Draw players
  handleEdges();
  drawRocket(pos.x, pos.y, angle, vel.mag() > 0.5);
  drawUI();
}

// 边界处理：ロケットが上下や左右の端に来た場合、反対側にループする
// 画面の分割線を越えて向こう側へ移動できるようになります。
function handleEdges() {
  if (pos.x > width) pos.x = 0;
  if (pos.x < 0) pos.x = width;
  if (pos.y > height) pos.y = 0;
  if (pos.y < 0) pos.y = height;
}

// Shortest-path angle interpolation.
function lerpAngle(a, b, step) {
  let delta = b - a;
  if (delta > PI) delta -= TWO_PI;
  if (delta < -PI) delta += TWO_PI;
  return a + delta * step;
}

// ml5 callback — store latest hand results.
function gotHands(results) {
  hands = results;
}

// Draw the rocket at (x, y) with rotation a.
function drawRocket(x, y, a, isThrusting) {
  push();
  translate(x, y);
  rotate(a);
  scale(0.6);

  // Thruster flame
  if (isThrusting) {
    fill(255, 150, 0, 200);
    noStroke();
    ellipse(0, 30, random(10, 15), random(20, 40));
  }

  // Body
  fill(240);
  stroke(255);
  strokeWeight(2);
  beginShape();
  vertex(0, -35);  // nose
  vertex(-15, 15);  // bottom-left
  vertex(15, 15);  // bottom-right
  endShape(CLOSE);

  // Cockpit window
  fill(0, 150, 255);
  circle(0, -5, 10);

  pop();
}

// HUD: speed meter + direction compass (bottom-left corner).
function drawUI() {
  const panelX = 20;
  const panelY = height - 170;
  const panelW = 160;
  const panelH = 150;

  push();

  // Panel background
  noStroke();
  fill(0, 0, 0, 160);
  rect(panelX, panelY, panelW, panelH, 12);

  // --- Speed meter ---
  let speed = vel.mag();
  let speedRatio = speed / MAX_SPEED;

  fill(160);
  noStroke();
  textSize(11);
  textAlign(LEFT, TOP);
  text('SPEED', panelX + 12, panelY + 12);

  fill(255);
  textSize(20);
  text(nf(speed, 1, 1), panelX + 12, panelY + 26);

  // Player 1 Health Number
  fill(160);
  textSize(11);
  text('P1 HEALTH', panelX + 80, panelY + 12);
  fill(p1Health > 30 ? 255 : color(255, 50, 50));
  textSize(20);
  text(max(0, p1Health) + '%', panelX + 80, panelY + 26);

  // Bar track for speed

  fill(40);
  rect(panelX + 12, panelY + 52, panelW - 24, 10, 5);

  // Bar fill — green → red with speed
  let barColor = lerpColor(color(0, 220, 120), color(255, 60, 60), speedRatio);
  fill(barColor);
  rect(panelX + 12, panelY + 52, (panelW - 24) * speedRatio, 10, 5);

  // --- Direction compass ---
  let cx = panelX + panelW / 2;
  let cy = panelY + 112;
  let r = 28;

  // Compass ring
  stroke(80);
  strokeWeight(1.5);
  noFill();
  circle(cx, cy, r * 2);

  // Cardinal labels
  fill(120);
  noStroke();
  textSize(9);
  textAlign(CENTER, CENTER);
  text('N', cx, cy - r - 8);
  text('E', cx + r + 8, cy);
  text('S', cx, cy + r + 8);
  text('W', cx - r - 8, cy);

  // Direction arrow (thrust heading = angle - HALF_PI)
  let dir = angle - HALF_PI;
  let ax = cx + cos(dir) * r * 0.75;
  let ay = cy + sin(dir) * r * 0.75;

  stroke(0, 200, 255);
  strokeWeight(2);
  line(cx, cy, ax, ay);

  fill(0, 200, 255);
  noStroke();
  push();
  translate(ax, ay);
  rotate(dir);
  triangle(0, -5, -3, 4, 3, 4);
  pop();

  // Center dot
  fill(255);
  noStroke();
  circle(cx, cy, 4);

  pop();
}
