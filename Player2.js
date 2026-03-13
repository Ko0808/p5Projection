class Player2Ship {
    constructor() {
        this.x = width * 0.75; // 初始在右半场中心
        this.y = height / 2;
        this.size = 60;
        this.lasers = [];
        this.fireCooldown = 0; // 新增：开火冷却时间，防止一帧射出太多激光
    }

    update(hand) {
        if (hand) {
            let wrist = getMappedPoint(hand.wrist);
            let indexTip = getMappedPoint(hand.index_finger_tip);
            let thumbTip = getMappedPoint(hand.thumb_tip);

            // 平滑移动飞碟到手腕位置
            this.x = lerp(this.x, wrist.x, 0.2);
            this.y = lerp(this.y, wrist.y, 0.2);

            // 限制画面边界（取消中线的强制限位）
            this.x = constrain(this.x, this.size / 2, width - this.size / 2);
            this.y = constrain(this.y, this.size / 2, height - this.size / 2);

            // 捏合手指 (Pinch) 判定开火
            let d = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
            if (d < 40 && this.fireCooldown <= 0) {
                this.fire();
                this.fireCooldown = 15; // 冷却时间 (0.5秒)
            }
        }

        if (this.fireCooldown > 0) {
            this.fireCooldown--;
        }

        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].update();
            if (this.lasers[i].isOffScreen()) {
                this.lasers.splice(i, 1);
            }
        }
    }

    draw() {
        for (let laser of this.lasers) {
            laser.draw();
        }

        push();
        fill(150, 255, 150);
        noStroke();
        ellipse(this.x, this.y, this.size + 20, this.size - 30);

        fill(200, 250, 255, 200);
        arc(this.x, this.y - 5, this.size - 10, this.size - 10, PI, 0);
        pop();
    }

    fire() {
        // 激光稍微向左偏，射向 Player 1 的区域
        this.lasers.push(new Laser(this.x, this.y));
        if (typeof laserSound !== 'undefined' && laserSound.isLoaded()) {
            laserSound.play(); // 播放激光音效
        }
    }
}

class Laser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speedX = -5; // 新增：激光向左飞
        this.speedY = 5;  // 激光向下飞
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
    }

    draw() {
        push();
        stroke(255, 50, 50);
        strokeWeight(4);
        // 调整激光线条的绘制角度
        line(this.x, this.y, this.x - this.speedX * 3, this.y - this.speedY * 3);
        pop();
    }

    isOffScreen() {
        return this.y > height || this.x < 0; // 飞出屏幕左侧或下侧就销毁
    }
}

class Meteorite {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = width + random(50, 600);
        this.y = random(50, height - 50);
        this.speed = random(1, 2.3);
        this.size = random(20, 45);
    }

    update() {
        this.x -= this.speed;
        if (this.x < -this.size) {
            this.reset();
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
