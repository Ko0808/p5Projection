// --- ml5 & video ---
let handPose;
let video;
let hands = [];

// --- rocket state ---
let pos;
let vel;
let accel;
let angle = 90;

// --- physics constants ---
const FRICTION = 0.95;
const POWER = 0.4;
const MAX_SPEED = 8;

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  handPose.detectStart(video, gotHands);

  pos = createVector(0, height / 2);
  vel = createVector(0, 0);
  accel = createVector(0, 0);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
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

  if (hands.length > 0) {
    let hand = hands[0];

    // Compute target angle from wrist → middle finger MCP.
    // +PI offsets so the rocket direction is 90° from the hand orientation.
    let wrist = hand.wrist;
    let middle = hand.middle_finger_mcp;
    let targetAngle = atan2(middle.y - wrist.y, middle.x - wrist.x) + PI;
    angle = lerpAngle(angle, targetAngle, 0.15);

    // Use index-thumb spread (px) to modulate thrust power.
    let d = dist(
      hand.index_finger_tip.x, hand.index_finger_tip.y,
      hand.thumb_tip.x, hand.thumb_tip.y
    );

    if (d > 40) {
      // Map spread (40–150 px) to power (0.1 – POWER×2.5), clamped.
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

  handleEdges();
  drawRocket(pos.x, pos.y, angle, vel.mag() > 0.5);
  drawUI();
}

// Wrap rocket position at canvas edges.
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

  // Bar track
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
