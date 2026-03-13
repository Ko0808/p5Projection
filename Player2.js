class Player2Ship {
    constructor() {
        this.x = width * 0.75;
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

            // ==========================================
            // 核心优化 1：虚拟摇杆 (速度控制取代位置控制)
            // ==========================================

            // 设定右半场中心为摇杆的“物理死区（中心锚点）”
            let anchor = createVector(width * 0.75, height / 2);

            // 计算手腕偏离锚点的向量距离和方向
            let offset = p5.Vector.sub(wrist, anchor);
            let distance = offset.mag();

            // 死区设定：手在中心 40 像素内不移动，防止轻微抖动导致飞船乱飘
            if (distance > 40) {
                // 将手的偏离距离映射为飞船速度 (距离越远，速度越快，最高 12)
                let maxSpeed = 12;
                let currentSpeed = map(distance, 40, 250, 1, maxSpeed, true);

                // 提取方向并乘以当前速度
                offset.normalize();
                offset.mult(currentSpeed);

                // 累加到飞船坐标上 (持续移动)
                this.x += offset.x;
                this.y += offset.y;
            }

            // 限制画面边界（取消中线的强制限位）
            this.x = constrain(this.x, this.size / 2, width - this.size / 2);
            this.y = constrain(this.y, this.size / 2, height - this.size / 2);

            // ==========================================
            // 核心优化 2：动态捏合阈值 (防远近失效)
            // ==========================================

            // 取食指根部到手腕的距离，作为这只手当前在画面中的"基础大小"
            let indexBase = getMappedPoint(hand.index_finger_mcp);
            let handSize = dist(wrist.x, wrist.y, indexBase.x, indexBase.y);

            // 捏合阈值设为手掌大小的 60%
            let pinchThreshold = handSize * 0.6;
            let d = dist(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);

            if (d < pinchThreshold && this.fireCooldown <= 0) {
                this.fire();
                this.fireCooldown = 15;
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
        // 激光向左下方发射
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
        this.speedX = -5; // 激光向左飞
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
