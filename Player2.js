class Player2Ship {
    constructor() {
        // UFO fixed at the right edge of the screen
        this.x = width - 230;
        this.y = height / 2;
        this.size = 60;
        this.lasers = [];
        this.fireCooldown = 0;
    }

    update(hand) {
        if (hand) {
            let wrist = getMappedPoint(hand.wrist);
            let indexTip = getMappedPoint(hand.index_finger_tip);
            let thumbTip = getMappedPoint(hand.thumb_tip);

            // [Minimalist Movement] Follows only the Y-axis (up and down), extremely smooth and stable
            // Lowered lerp value (0.2 -> 0.05) to make the UFO move slower for better game balance
            this.y = lerp(this.y, wrist.y, 0.1);
            this.y = constrain(this.y, this.size / 2, height - this.size / 2);

            if (typeof isFlipped !== 'undefined' && isFlipped) {
                this.x = lerp(this.x, 230, 0.1);
            } else {
                this.x = lerp(this.x, width - 230, 0.1);
            }

            // [Minimalist Firing] Pinch fingers to fire
            let d = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
            if (d < 40 && this.fireCooldown <= 0) {
                this.fire();
                this.fireCooldown = 30;
            }
        }

        // Cooldown and laser updates
        if (this.fireCooldown > 0) this.fireCooldown--;

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].update();
            if (this.lasers[i].isOffScreen()) {
                this.lasers.splice(i, 1);
            }
        }
    }

    draw() {
        for (let laser of this.lasers) laser.draw();

        push();
        fill(150, 255, 150);
        noStroke();
        ellipse(this.x, this.y, this.size + 20, this.size - 30);
        fill(200, 250, 255, 200);
        arc(this.x, this.y - 5, this.size - 10, this.size - 10, PI, 0);
        pop();
    }

    fire() {
        // No direction needed, directly spawn laser at current position
        this.lasers.push(new Laser(this.x, this.y));
        if (typeof laserSound !== 'undefined' && laserSound.isLoaded()) {
            laserSound.play(); // Play laser sound effect
        }
    }
}

class Laser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        if (typeof isFlipped !== 'undefined' && isFlipped) {
            this.speedX = 15;
        } else {
            this.speedX = -15; // [Minimalist Trajectory] Always fly straight to the left!
        }
    }

    update() {
        this.x += this.speedX;
    }

    draw() {
        push();
        stroke(255, 50, 50);
        strokeWeight(6);
        // Draw a simple horizontal laser line
        let tailLength = (this.speedX > 0) ? -30 : 30;
        line(this.x, this.y, this.x + tailLength, this.y);
        pop();
    }

    isOffScreen() {
        if (typeof isFlipped !== 'undefined' && isFlipped) {
            return this.x > width;
        }
        return this.x < 0; // Destroy when flying out of the left side of the screen
    }
}

class Meteorite {
    constructor() {
        this.reset();
    }

    reset() {
        if (typeof isFlipped !== 'undefined' && isFlipped) {
            this.x = -random(50, 600);
            this.speed = -random(1, 2.3);
        } else {
            this.x = width + random(50, 600);
            this.speed = random(1, 2.3);
        }
        this.y = random(50, height - 50);
        this.size = random(20, 45);
    }

    update() {
        this.x -= this.speed;
        if (typeof isFlipped !== 'undefined' && isFlipped) {
            if (this.x > width + this.size) {
                this.reset();
            }
        } else {
            if (this.x < -this.size) {
                this.reset();
            }
        }
    }

    draw() {
        push();
        fill(100);
        noStroke();
        ellipse(this.x, this.y, this.size, this.size * 0.8);
        pop();
    }
}
