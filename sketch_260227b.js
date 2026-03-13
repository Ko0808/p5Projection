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

// --- scene transition state ---
let isTransitioning = false;
let isFlipped = false;
let orbitAngle = 0;
let orbitRadius = 0;
let orbitTargetAngle = 0;

// --- physics constants ---
const FRICTION = 0.95;
const POWER = 0.2;
let MAX_SPEED = 2; // Will be updated dynamically in draw()

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

  frameRate(30); // Stable frame rate, dual-hand gesture recognition is computationally expensive
}

// Ensure audio starts on first user interaction if blocked by browser
function mousePressed() {
  userStartAudio();
  if (!bgmSound.isPlaying()) {
    bgmSound.setLoop(true);
    bgmSound.loop();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Core helper function: Maps the raw camera coordinates to our mirrored canvas
function getMappedPoint(keypoint) {
  // Note that width and 0 are flipped here to match the mirrored effect of scale(-1, 1)
  let mx = map(keypoint.x, 0, video.width, width, 0);
  let my = map(keypoint.y, 0, video.height, 0, height);
  return createVector(mx, my);
}

function draw() {
  // Healthに比例して最高速度を動的に変更する（完全に止まらないように最低速度0.2を保証）
  MAX_SPEED = 4 * max(0.1, p1Health / 100);

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
  // --- Screen Divider ---
  // ==========================================
  push();
  stroke(0, 200, 255, 150);
  strokeWeight(2);
  drawingContext.setLineDash([15, 15]); // Dashed line effect
  line(width / 2, 0, width / 2, height);
  pop();

  // ==========================================
  // --- Edge Decorative Orbs ---
  // ==========================================
  push();
  noStroke();
  if (isFlipped) {
    // Left side orb is now P2 zone (greenish)
    fill(150, 255, 150, 30);
    ellipse(-100, height / 2, width * 0.4, height * 0.8);
    // Right side orb is now P1 zone (blueish)
    fill(0, 150, 255, 30);
    ellipse(width + 170, height / 2, width * 0.4, height * 0.8);
  } else {
    // Left side orb (P1 zone) - blueish
    fill(0, 150, 255, 30);
    ellipse(-100, height / 2, width * 0.4, height * 0.8);
    // Right side orb (P2 zone) - greenish
    fill(150, 255, 150, 30);
    ellipse(width + 170, height / 2, width * 0.4, height * 0.8);
  }
  pop();

  // ==========================================
  // --- Hand Separation and Assignment Logic ---
  // ==========================================
  let p1Hand = null;
  let p2Hand = null;

  for (let hand of hands) {
    let mappedWrist = getMappedPoint(hand.wrist);
    // Determine if the hand is on the left or right side of the screen
    if (mappedWrist.x < width / 2) {
      p1Hand = hand;
    } else {
      p2Hand = hand;
    }
  }

  // ==========================================
  // --- Player 1 Logic (Left Half) ---
  // ==========================================
  if (!isTransitioning) {
    if (p1Hand) {
      let wrist = getMappedPoint(p1Hand.wrist);
      let middle = getMappedPoint(p1Hand.middle_finger_mcp);
      let indexTip = getMappedPoint(p1Hand.index_finger_tip);
      let thumbTip = getMappedPoint(p1Hand.thumb_tip);

      let targetAngle = atan2(middle.y - wrist.y, middle.x - wrist.x) + PI;
      if (isFlipped) {
        targetAngle += PI; // シーン反転時は進行方向を180度反転させる
      }
      angle = lerpAngle(angle, targetAngle, 0.15);

      let d = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);

      if (d > 40) { // Open fingers -> Thrust
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

    // Check transition trigger (Right -> Left OR Left -> Right)
    if (!isFlipped && pos.x > width - 100) {
      // Trigger orbit around RIGHT orb
      isTransitioning = true;
      let centerX = width + 170;
      let centerY = height / 2;
      orbitRadius = dist(pos.x, pos.y, centerX, centerY);
      orbitAngle = atan2(pos.y - centerY, pos.x - centerX);
      if (orbitAngle < 0) orbitAngle += TWO_PI;
      orbitTargetAngle = orbitAngle + radians(330); // 315度 (7/8周) 回ったところで自然に放出する
    } else if (isFlipped && pos.x < 100) {
      // 一気にリセット (アニメーションなし)
      isFlipped = false;
      pos.x = 150;
      pos.y = height / 2;
      angle = HALF_PI; // Face entirely right
      vel.set(0, 0);
      p1Health = 100; // HP回復
      for (let m of meteorites) {
        m.reset();
      }
    }
  } else {
    // =====================================
    // ▼ ここからが円を回る「Orbit Animation」
    // =====================================
    // Rotation logic relies purely on the P1 side (Right orb)
    let centerX = width + 170;
    let centerY = height / 2;

    orbitAngle += 0.05;

    // 三角関数（cos と sin）を使って、中心点からの円周上の座標を計算
    pos.x = centerX + cos(orbitAngle) * orbitRadius;
    pos.y = centerY + sin(orbitAngle) * orbitRadius;

    // Point tangentially based on orbit direction
    // ロケットの機首（0度=上）を円の進行方向（時計回りの接線方向）へ向ける
    angle = orbitAngle + Math.PI;

    // Check completion condition
    let finishedTrans = (orbitAngle >= orbitTargetAngle);

    if (finishedTrans) {
      // 1周終わったらフラグを戻し、シーンを切り替える
      isTransitioning = false;
      isFlipped = true;

      // 座標や角度は強制上書きせず、現在の状態を維持して放出する
      // 円運動の勢い（接線方向の速度）を与えてスムーズに復帰させる
      vel = p5.Vector.fromAngle(angle - HALF_PI).mult(MAX_SPEED * 2);
      p1Health = 100; // HP回復

      for (let m of meteorites) {
        m.reset();
      }
    }
  }

  // ==========================================
  // --- Player 2 & Environment Update (Right Half) ---
  // ==========================================
  for (let m of meteorites) {
    m.update();
    m.draw();
  }

  p2Ship.update(p2Hand); // Pass the assigned right-hand data to Player 2
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
      p1Health -= 5; // Meteorite damage can be adjusted
      explosionSound.play(); // Play explosion sound
      m.reset(); // Reset meteorite after impact
    }
  }

  // Draw players
  handleEdges();
  drawRocket(pos.x, pos.y, angle, vel.mag() > 0.5);
  drawUI();
}

// Boundary handling: When the rocket reaches the edges, it loops to the opposite side
// It can cross the screen divider and move to the other side.
function handleEdges() {
  if (isTransitioning) return; // アニメーション中は壁の判定を無効化する

  // 左右（X軸）はループを廃止し、見えない壁にする（バグ防止）
  if (pos.x > width) {
    pos.x = width;
    vel.x = 0;
  }
  if (pos.x < 0) {
    pos.x = 0;
    vel.x = 0;
  }

  // 上下（Y軸）は今まで通りループさせる
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
