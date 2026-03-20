let tutP1Pos;
let tutP1Angle = 90;
let tutP1CurrentJoyDX = 0;
let tutP1CurrentJoyDY = 0;
let tutP2Ship;
let tutorialStartFrame = 0;

function initTutorial() {
    tutP1Pos = createVector(width / 4, height / 2);
    tutP1Angle = HALF_PI;
    tutP1CurrentJoyDX = 0;
    tutP1CurrentJoyDY = 0;
    tutP2Ship = new Player2Ship();
    tutP2Ship.x = width * 0.75;
    tutorialStartFrame = frameCount;
}

function drawTutorialScene() {
    background(10, 20, 40);

    // Draw mirrored video dimly so players can see their hands
    push();
    translate(width, 0);
    scale(-1, 1);
    drawingContext.globalAlpha = 80 / 255;
    if (typeof video !== 'undefined' && video) image(video, 0, 0, width, height);
    drawingContext.globalAlpha = 1.0;
    pop();

    // Center divider
    push();
    stroke(255, 255, 255, 100);
    strokeWeight(2);
    drawingContext.setLineDash([15, 15]);
    line(width / 2, 0, width / 2, height);
    pop();

    // Hand assignments
    let p1Hand = null;
    let p2Hand = null;
    let closedHands = 0;

    if (typeof hands !== 'undefined' && hands.length > 0) {
        for (let hand of hands) {
            let mappedWrist = getMappedPoint(hand.wrist);
            if (mappedWrist.x < width / 2) {
                p1Hand = hand;
            } else {
                p2Hand = hand;
            }

            let indexTip = getMappedPoint(hand.index_finger_tip);
            let thumbTip = getMappedPoint(hand.thumb_tip);
            if (dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y) < 60) {
                closedHands++;
            }
        }
    }

    // ==========================================
    // --- Player 1 Tutorial (Left side) ---
    // ==========================================
    push();
    fill(255);
    textAlign(CENTER, TOP);
    textSize(32);
    textStyle(BOLD);
    text("PLAYER 1", width * 0.25, 50);
    textSize(20);
    textStyle(NORMAL);
    text("Move your hand to control\nthe joystick and rocket.", width * 0.25, 100);

    let controlOriginX = width * 0.25;
    let controlOriginY = height / 2 - 50;

    if (p1Hand) {
        let wrist = getMappedPoint(p1Hand.wrist);
        let dx = wrist.x - controlOriginX;
        let dy = wrist.y - controlOriginY;
        tutP1CurrentJoyDX = dx;
        tutP1CurrentJoyDY = dy;

        let targetAngle = tutP1Angle;
        if (dist(0, 0, dx, dy) > 20) {
            targetAngle = atan2(dy, dx) + HALF_PI;
        }
        // lerpAngle is defined in sketch_260227b.js
        if (typeof lerpAngle === 'function') {
            tutP1Angle = lerpAngle(tutP1Angle, targetAngle, 0.15);
        } else {
            tutP1Angle = targetAngle;
        }
    } else {
        tutP1CurrentJoyDX = lerp(tutP1CurrentJoyDX, 0, 0.2);
        tutP1CurrentJoyDY = lerp(tutP1CurrentJoyDY, 0, 0.2);
    }

    // Draw dummy joystick for P1
    let r = 80; // Larger joystick for clarity
    stroke(80);
    strokeWeight(2);
    fill(0, 0, 0, 100);
    circle(controlOriginX, controlOriginY, r * 2);

    let stickRadius = min(r, dist(0, 0, tutP1CurrentJoyDX, tutP1CurrentJoyDY) * (r / 150));
    let stickHeading = atan2(tutP1CurrentJoyDY, tutP1CurrentJoyDX);
    let sx = controlOriginX + cos(stickHeading) * stickRadius;
    let sy = controlOriginY + sin(stickHeading) * stickRadius;

    stroke(0, 200, 255, 150);
    strokeWeight(4);
    line(controlOriginX, controlOriginY, sx, sy);
    noStroke();
    fill(0, 200, 255, 200);
    circle(sx, sy, 20);

    // Draw P1 Rocket dummy representing orientation
    let rocketDrawX = controlOriginX;
    let rocketDrawY = height * 0.8;
    // drawRocket is defined in sketch_260227b.js
    if (typeof drawRocket === 'function') {
        drawRocket(rocketDrawX, rocketDrawY, tutP1Angle, dist(0, 0, tutP1CurrentJoyDX, tutP1CurrentJoyDY) > 20);
    }
    pop();

    // ==========================================
    // --- Player 2 Tutorial (Right side) ---
    // ==========================================
    push();
    fill(255);
    textAlign(CENTER, TOP);
    textSize(32);
    textStyle(BOLD);
    text("PLAYER 2", width * 0.75, 50);
    textSize(20);
    textStyle(NORMAL);
    text("Move hand Up/Down to move UFO.\nPinch fingers to fire laser.", width * 0.75, 100);
    pop();

    if (tutP2Ship) {
        // Prevent horizontal movement in tutorial by overriding after update
        let originalX = width * 0.75;
        tutP2Ship.x = originalX;
        tutP2Ship.update(p2Hand);
        tutP2Ship.x = originalX;
        tutP2Ship.draw();
    }

    // ==========================================
    // --- Exit Tutorial Logic ---
    // ==========================================
    push();
    textAlign(CENTER, BOTTOM);
    let blinkAlpha = map(sin(frameCount * 0.1), -1, 1, 100, 255);
    fill(255, 255, 0, blinkAlpha);
    textSize(36);
    textStyle(BOLD);
    text("Close your hands again to start mission!", width / 2, height - 50);

    // If enough hands are closed, move to PLAYING
    let handsRequired = (typeof hands !== 'undefined' && hands.length > 1) ? 2 : 1;
    let framesPassed = typeof frameCount !== 'undefined' ? frameCount - tutorialStartFrame : 0;

    // Require at least 2 seconds (60 frames) to pass before allowing skip
    if (framesPassed > 150 && closedHands >= handsRequired && handsRequired > 0) {
        if (typeof gameState !== 'undefined') {
            gameState = 'PLAYING';
            if (typeof respawnPlayer1 === 'function') {
                respawnPlayer1(); // Reset game variables for a fresh start
            }
        }
    }
    pop();
}
