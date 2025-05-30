class Game {
    constructor(canvasId, width, height) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = width;
        this.canvas.height = height;
        this.width = width;
        this.height = height;
        this.score = 0;
        this.ballsDestroyed = 0;
        this.ballSpeed = 2;
        this.gameOver = false;
        this.gameStarted = false;
        this.playerName = '';
        this.balls = [];
        this.bullets = [];
        this.triangle = { x: 50, y: height / 2, size: 20 };
        this.spawnInterval = 2000;
        this.lastSpawn = Date.now();
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.highScores = JSON.parse(localStorage.getItem('highScores')) || [];
        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameStarted && !this.gameOver) {
                const rect = this.canvas.getBoundingClientRect();
                this.triangle.y = e.clientY - rect.top;
                if (this.triangle.y < this.triangle.size) this.triangle.y = this.triangle.size;
                if (this.triangle.y > this.height - this.triangle.size) this.triangle.y = this.height - this.triangle.size;
            }
        });

        this.canvas.addEventListener('click', () => {
            if (!this.gameStarted) {
                this.playerName = prompt('Enter your name:') || 'Guest';
                this.gameStarted = true;
                this.lastSpawn = Date.now();
                this.playSound(440, 0.1);
            } else if (!this.gameOver) {
                this.bullets.push({ x: this.triangle.x + this.triangle.size / 2, y: this.triangle.y, speed: 5 });
                this.playSound(880, 0.1);
            } else {
                this.restartGame();
            }
        });
    }

    playSound(frequency, duration) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playGameOverSound() {
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(220, now);
        oscillator.frequency.linearRampToValueAtTime(110, now + 0.5);
        gainNode.gain.setValueAtTime(0.5, now);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start();
        oscillator.stop(now + 0.5);
    }

    saveHighScore() {
        this.highScores.push({ name: this.playerName, score: this.score });
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 5);
        localStorage.setItem('highScores', JSON.stringify(this.highScores));
    }

    spawnBall() {
        this.balls.push({
            x: this.width,
            y: Math.random() * (this.height - 40) + 20,
            radius: 10,
            speed: this.ballSpeed
        });
    }

    drawTriangle() {
        this.ctx.beginPath();
        this.ctx.moveTo(this.triangle.x - this.triangle.size / 2, this.triangle.y - this.triangle.size / 2);
        this.ctx.lineTo(this.triangle.x + this.triangle.size / 2, this.triangle.y);
        this.ctx.lineTo(this.triangle.x - this.triangle.size / 2, this.triangle.y + this.triangle.size / 2);
        this.ctx.closePath();
        this.ctx.fillStyle = 'blue';
        this.ctx.fill();
    }

    drawBall(ball) {
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
        this.ctx.closePath();
    }

    drawBullet(bullet) {
        this.ctx.beginPath();
        this.ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
        this.ctx.closePath();
    }

    checkCollision(ball, bullet) {
        const dx = ball.x - bullet.x;
        const dy = ball.y - bullet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < ball.radius + 3;
    }

    checkTriangleCollision(ball) {
        const dx = ball.x - this.triangle.x;
        const dy = ball.y - this.triangle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < ball.radius + this.triangle.size / 2;
    }

    update() {
        if (!this.gameStarted || this.gameOver) return;

        // Spawn balls
        if (Date.now() - this.lastSpawn > this.spawnInterval) {
            this.spawnBall();
            this.lastSpawn = Date.now();
            this.spawnInterval = Math.max(1000, this.spawnInterval - 50);
        }

        // Update balls
        this.balls = this.balls.filter(ball => ball.x + ball.radius > 0);
        this.balls.forEach(ball => {
            ball.x -= ball.speed;
            if (this.checkTriangleCollision(ball)) {
                this.gameOver = true;
                this.saveHighScore();
                this.playGameOverSound();
            }
        });

        // Update bullets
        this.bullets = this.bullets.filter(bullet => bullet.x < this.width);
        this.bullets.forEach(bullet => bullet.x += bullet.speed);

        // Check collisions
        const newBalls = [];
        this.balls.forEach(ball => {
            let hit = false;
            this.bullets = this.bullets.filter(bullet => {
                if (this.checkCollision(ball, bullet)) {
                    hit = true;
                    this.score += 1;
                    this.ballsDestroyed += 1;
                    this.playSound(660, 0.1); // Hit sound
                    if (this.ballsDestroyed % 10 === 0) {
                        this.score += 10;
                        this.ballSpeed += 0.5;
                        this.balls.forEach(b => b.speed = this.ballSpeed);
                    }
                    return false;
                }
                return true;
            });
            if (!hit) newBalls.push(ball);
        });
        this.balls = newBalls;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.width, this.height);

        if (!this.gameStarted) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Click to Start', this.width / 2, this.height / 2);
            this.ctx.textAlign = 'left';
            return;
        }

        this.drawTriangle();
        this.balls.forEach(ball => this.drawBall(ball));
        this.bullets.forEach(bullet => this.drawBullet(bullet));

        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);
        this.ctx.fillText(`Player: ${this.playerName || 'Guest'}`, 10, 60);

        if (this.gameOver) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '30px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Game Over! Score: ${this.score}`, this.width / 2, this.height / 2 - 60);
            this.ctx.font = '20px Arial';
            this.ctx.fillText('High Scores:', this.width / 2, this.height / 2 - 20);
            this.highScores.forEach((score, i) => {
                this.ctx.fillText(`${i + 1}. ${score.name}: ${score.score}`, this.width / 2, this.height / 2 + i * 30);
            });
            this.ctx.fillText('Click to restart', this.width / 2, this.height / 2 + 150);
            this.ctx.textAlign = 'left';
        }
    }

    restartGame() {
        this.score = 0;
        this.ballsDestroyed = 0;
        this.ballSpeed = 2;
        this.gameOver = false;
        this.gameStarted = false;
        this.balls = [];
        this.bullets = [];
        this.spawnInterval = 2000;
        this.lastSpawn = Date.now();
        this.playerName = '';
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}