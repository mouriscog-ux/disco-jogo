/**
 * SÉRIE A NEON STRIKE 2026
 * Pure Canvas API Gameplay
 */

const CLUBS = [
    { name: "Palmeiras", color: "#00ff88" }, { name: "Flamengo", color: "#ff0000" },
    { name: "Botafogo", color: "#ffffff" }, { name: "Santos", color: "#00aae4" },
    { name: "Remo", color: "#000080" }, { name: "Fortaleza", color: "#001e9c" },
    { name: "São Paulo", color: "#ff0000" }, { name: "Internacional", color: "#e30613" },
    { name: "Cruzeiro", color: "#003399" }, { name: "Bahia", color: "#005baa" },
    { name: "Corinthians", color: "#ffffff" }, { name: "Vasco", color: "#ffffff" },
    { name: "Grêmio", color: "#00aae4" }, { name: "Atlético-MG", color: "#ffffff" },
    { name: "Fluminense", color: "#800020" }, { name: "Athletico-PR", color: "#cc0000" },
    { name: "Vitória", color: "#ff0000" }, { name: "Bragantino", color: "#ffffff" },
    { name: "Curitiba", color: "#006400" }, { name: "Mirassol", color: "#ffff00" }
];

const STAGES = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"];

class NeonStrike {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Game State
        this.gameState = 'MENU';
        this.playerTeam = null;
        this.cpuTeam = null;
        this.difficulty = 'normal';
        this.stageIdx = 0;
        this.score = { p: 0, c: 0 };
        this.paused = true;

        // Objects
        this.puck = { x: 0, y: 0, vx: 0, vy: 0, radius: 15, speed: 7 };
        this.player = { x: 0, y: 0, w: 120, h: 20 };
        this.cpu = { x: 0, y: 0, w: 120, h: 20 };

        this.init();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    init() {
        window.onresize = () => this.resize();

        // UI Bindings
        const grid = document.getElementById('team-grid');
        CLUBS.forEach(team => {
            const el = document.createElement('div');
            el.className = 'team-item';
            el.innerText = team.name.toUpperCase();
            el.onclick = () => this.selectTeam(team);
            grid.appendChild(el);
        });

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.difficulty = btn.dataset.diff;
            };
        });

        document.getElementById('start-btn').onclick = () => this.startPhase();
        document.getElementById('advance-btn').onclick = () => this.nextStage();

        // Controls
        this.canvas.onmousemove = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.player.x = (e.clientX - rect.left) - this.player.w / 2;
        };

        this.loop();
    }

    selectTeam(team) {
        this.playerTeam = team;
        document.documentElement.style.setProperty('--neon-main', team.color);
        this.prepareMatch();
    }

    prepareMatch() {
        this.cpuTeam = CLUBS[Math.floor(Math.random() * CLUBS.length)];
        while (this.cpuTeam.name === this.playerTeam.name) this.cpuTeam = CLUBS[Math.floor(Math.random() * CLUBS.length)];

        document.getElementById('phase-title').innerText = STAGES[this.stageIdx].toUpperCase();
        document.getElementById('p-card').innerText = this.playerTeam.name.toUpperCase();
        document.getElementById('c-card').innerText = this.cpuTeam.name.toUpperCase();

        document.getElementById('p-tag').innerText = this.playerTeam.name.substring(0, 3).toUpperCase();
        document.getElementById('c-tag').innerText = this.cpuTeam.name.substring(0, 3).toUpperCase();

        this.switchScreen('intro-screen');
    }

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const s = document.getElementById(id);
        if (s) s.classList.add('active');
        this.gameState = id.split('-')[0].toUpperCase();
    }

    startPhase() {
        this.switchScreen('none');
        document.getElementById('hud').classList.remove('hidden');
        this.score = { p: 0, c: 0 };
        this.updateHUD();
        this.resetPositions();
        this.paused = false;
    }

    resetPositions() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        this.puck = {
            x: cw / 2, y: ch / 2,
            vx: (Math.random() > 0.5 ? 1 : -1) * 5,
            vy: (Math.random() > 0.5 ? 1 : -1) * 5,
            radius: 15, speed: 7
        };
        this.player.y = ch - 50;
        this.cpu.y = 50;
    }

    loop() {
        if (!this.paused) {
            this.update();
        }
        this.draw();
        requestAnimationFrame(() => this.loop());
    }

    update() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Puck Physics
        this.puck.x += this.puck.vx;
        this.puck.y += this.puck.vy;

        // Wall Bounces
        if (this.puck.x < this.puck.radius || this.puck.x > cw - this.puck.radius) {
            this.puck.vx *= -1;
            this.puck.x = this.puck.x < this.puck.radius ? this.puck.radius : cw - this.puck.radius;
        }

        // Goals (Tópico 5)
        if (this.puck.y < 0) {
            this.goal('p');
        } else if (this.puck.y > ch) {
            this.goal('c');
        }

        // CPU AI (Tópico 8)
        let aiTarget = this.puck.x - this.cpu.w / 2;
        let aiSpeed = { 'normal': 3, 'hard': 7, 'super-hard': 20 }[this.difficulty];

        if (this.difficulty === 'super-hard') {
            // Predict x if vy is negative (coming to ai)
            if (this.puck.vy < 0) aiTarget = this.puck.x - this.cpu.w / 2;
        }

        if (this.cpu.x < aiTarget) this.cpu.x += aiSpeed;
        if (this.cpu.x > aiTarget) this.cpu.x -= aiSpeed;

        // Paddle Collisions (Tópico 4)
        this.checkPaddleCollision(this.player, true);
        this.checkPaddleCollision(this.cpu, false);
    }

    checkPaddleCollision(p, isPlayer) {
        if (this.puck.x > p.x && this.puck.x < p.x + p.w) {
            const side = isPlayer ? this.player.y : this.cpu.y + p.h;
            const threshold = isPlayer ? this.puck.y + this.puck.radius : this.puck.y - this.puck.radius;

            let hit = false;
            if (isPlayer && this.puck.vy > 0 && threshold >= side && this.puck.y < side + 20) hit = true;
            if (!isPlayer && this.puck.vy < 0 && threshold <= side && this.puck.y > side - 20) hit = true;

            if (hit) {
                // Angle based on impact pos
                const impact = (this.puck.x - (p.x + p.w / 2)) / (p.w / 2);
                this.puck.vy *= -1.1; // Speed increase (Tópico 3)
                this.puck.vx = impact * 10;
                this.puck.y = isPlayer ? p.y - this.puck.radius : p.y + p.h + this.puck.radius;
            }
        }
    }

    goal(who) {
        this.score[who]++;
        this.updateHUD();
        this.flashScreen(who === 'p' ? this.playerTeam.color : '#ff0000');
        this.paused = true;

        // Final Rule: 3 goals (Tópico 5)
        if (this.score.p >= 3 || this.score.c >= 3) {
            setTimeout(() => this.finishMatch(), 500);
        } else {
            setTimeout(() => {
                this.resetPositions();
                this.paused = false;
            }, 1000);
        }
    }

    flashScreen(color) {
        const el = document.getElementById('flash-effect');
        el.style.backgroundColor = color;
        el.style.opacity = '0.5';
        setTimeout(() => el.style.opacity = '0', 200);
    }

    updateHUD() {
        document.getElementById('p-score').innerText = this.score.p;
        document.getElementById('c-score').innerText = this.score.c;
    }

    finishMatch() {
        this.switchScreen('result-screen');
        document.getElementById('hud').classList.add('hidden');
        if (this.score.p >= 3) {
            document.getElementById('result-msg').innerText = "CONTRATO ASSINADO!";
            const next = STAGES[this.stageIdx + 1] || "CAMPEÃO";
            document.getElementById('sub-msg').innerText = "RUMO ÀS " + next.toUpperCase();
            document.getElementById('advance-btn').classList.remove('hidden');
            document.getElementById('retry-btn').classList.add('hidden');
        } else {
            document.getElementById('result-msg').innerText = "DISPENSADO DO CLUBE!";
            document.getElementById('sub-msg').innerText = "TENTE NOVAMENTE";
            document.getElementById('advance-btn').classList.add('hidden');
            document.getElementById('retry-btn').classList.remove('hidden');
        }
    }

    nextStage() {
        this.stageIdx++;
        if (this.stageIdx >= STAGES.length) {
            this.switchScreen('finale-screen');
            document.getElementById('winner-name').innerText = this.playerTeam.name.toUpperCase();
        } else {
            this.score = { p: 0, c: 0 }; // Tópico 7: Reset Obrigatório
            this.prepareMatch();
        }
    }

    draw() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        this.ctx.clearRect(0, 0, cw, ch);

        if (this.gameState === 'MENU' || this.gameState === 'INTRO') return;

        // Arena Borders (Tópico 1)
        this.ctx.strokeStyle = this.playerTeam.color;
        this.ctx.lineWidth = 10;
        this.ctx.strokeRect(0, 0, cw, ch);

        // Center Line
        this.ctx.setLineDash([20, 20]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, ch / 2);
        this.ctx.lineTo(cw, ch / 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Paddles
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = this.playerTeam.color;
        this.ctx.fillStyle = this.playerTeam.color;
        this.ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);

        this.ctx.shadowColor = '#fff';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(this.cpu.x, this.cpu.y, this.cpu.w, this.cpu.h);

        // Puck (Tópico 3)
        this.ctx.beginPath();
        this.ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#fff';
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }
}

window.onload = () => new NeonStrike();
