class Player2Ship {
    constructor() {
        this.x = width / 2;
        this.y = height / 2;
        this.size = 60;
        this.lasers = []; // Store fired lasers
    }

    update() {
        // Ship follows mouse cursor
        this.x = mouseX;
        this.y = mouseY;

        // Iterate backwards to prevent index shifting when removing elements
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].update();

            // Remove laser if it goes off-screen to free up memory
            if (this.lasers[i].isOffScreen()) {
                this.lasers.splice(i, 1);
            }
        }
    }

    draw() {
        // Draw lasers first (underneath the ship)
        for (let laser of this.lasers) {
            laser.draw();
        }

        // Draw ship placeholder (can be replaced with an image later)
        push();
        fill(150, 255, 150); // Ship base color
        noStroke();
        ellipse(this.x, this.y, this.size + 20, this.size - 30);

        fill(200, 250, 255, 200); // Cockpit glass color
        arc(this.x, this.y - 5, this.size - 10, this.size - 10, PI, 0);
        pop();
    }

    fire() {
        this.lasers.push(new Laser(this.x, this.y));
    }
}

class Laser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 10;
    }

    update() {
        this.y += this.speed; // Laser moves downwards towards the general area of player 1.
    }

    draw() {
        push();
        stroke(255, 50, 50); // Red laser
        strokeWeight(4);
        line(this.x, this.y, this.x, this.y + 25);
        pop();
    }

    isOffScreen() {
        return this.y > height;
    }
}
