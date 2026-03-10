/**
 * BRASILEIRÃO ARENA 2026 - TOP-DOWN ENGINE
 * Focus: Fluid WASD Movement & AI Defenders
 */

const TEAMS = [
    { name: "Palmeiras", color: "#006400" }, { name: "Flamengo", color: "#ff0000" },
    { name: "Botafogo", color: "#ffffff" }, { name: "Corinthians", color: "#ffffff" },
    { name: "Fortaleza", color: "#001e9c" }, { name: "São Paulo", color: "#ff0000" },
    { name: "Internacional", color: "#e30613" }, { name: "Cruzeiro", color: "#003399" },
    { name: "Bahia", color: "#005baa" }, { name: "Vasco", color: "#ffffff" },
    { name: "Grêmio", color: "#00aae4" }, { name: "Atlético-MG", color: "#ffffff" },
    { name: "Fluminense", color: "#800020" }, { name: "Athletico-PR", color: "#cc0000" },
    { name: "Vitória", color: "#ff0000" }, { name: "Bragantino", color: "#ffffff" },
    { name: "Santos", color: "#ffffff" }, { name: "Coritiba", color: "#006400" },
    { name: "Mirassol", color: "#ffff00" }, { name: "Remo", color: "#000080" }
];

const STAGES = ["Oitavas de Final", "Quartas de Final", "Semifinal", "Grande Final"];

class ArenaGame {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();

        // Game State
        this.state = 'MENU';
        this.playerTeam = null;
        this.stageIdx = 0;
        this.score = 0;

        // Entities
        this.player = { x: 0, y: 0, r: 20, speed: 6 };
        this.ball = { x: 0, y: 0, r: 10, attached: true };
        this.enemies = []; // Zagueiros
        this.goals = []; // Targets
        this.particles = [];

        // Inputs (Tópico 1)
        this.keys = {};

        this.init();
    }

    resize() {
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    init() {
        window.onresize = () => this.resize();

        // Input Tracking (Tópico 9)
        window.onkeydown = (e) => this.keys[e.code] = true;
        window.onkeyup = (e) => this.keys[e.code] = false;

        // UI Bindings
        const grid = document.getElementById('team-grid');
        TEAMS.forEach(team => {
            const el = document.createElement('div');
            el.className = 'team-item';
            el.innerText = team.name.toUpperCase();
            el.onclick = () => this.selectTeam(team);
            grid.appendChild(el);
        });

        document.getElementById('start-btn').onclick = () => this.startPhase();
        document.getElementById('advance-btn').onclick = () => this.nextStage();

        this.loop();
    }

    selectTeam(team) {
        this.playerTeam = team;
        document.documentElement.style.setProperty('--primary', team.color);
        this.prepareIntro();
    }

    prepareIntro() {
        document.getElementById('phase-title').innerText = STAGES[this.stageIdx].toUpperCase();
        document.getElementById('p-team-card').innerText = this.playerTeam.name.toUpperCase();
        document.getElementById('team-name-tag').innerText = this.playerTeam.name.toUpperCase();
        document.getElementById('phase-tag').innerText = STAGES[this.stageIdx].substring(0, 7).toUpperCase();
        this.switchScreen('intro-screen');
    }

    switchScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const s = document.getElementById(id);
        if (s) s.classList.add('active');
        this.state = id.split('-')[0].toUpperCase();
    }

    startPhase() {
        this.switchScreen('none');
        document.getElementById('hud').classList.remove('hidden');
        this.score = 0; // Tópico 7: Reset de Placar Total
        this.updateHUD();
        this.resetWorld();
    }

    resetWorld() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Position Player
        this.player.x = cw / 2;
        this.player.y = ch / 2;

        // Spawn Enemies (Tópico 4 & 6)
        this.enemies = [];
        const enemyCount = 1 + this.stageIdx * 1.5;
        const enemySpeed = 1.6 + this.stageIdx * 0.8;

        for (let i = 0; i < enemyCount; i++) {
            this.enemies.push({
                x: Math.random() < 0.5 ? 50 : cw - 50,
                y: Math.random() * ch,
                r: 22,
                speed: enemySpeed
            });
        }

        // Spawn Goal (Tópico 3)
        this.spawnGoal();
    }

    spawnGoal() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        this.goals = [{
            x: 100 + Math.random() * (cw - 200),
            y: 100 + Math.random() * (ch - 200),
            w: 120,
            h: 80
        }];
    }

    loop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop()); // Tópico 9: 60 FPS
    }

    update() {
        if (this.state !== 'PLAYING') return;

        const cw = this.canvas.width;
        const ch = this.canvas.height;

        // Tópico 1: Movimento Real (WASD)
        let dx = 0, dy = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            const length = Math.sqrt(dx * dx + dy * dy);
            this.player.x += (dx / length) * this.player.speed;
            this.player.y += (dy / length) * this.player.speed;
        }

        // Bounds
        this.player.x = Math.max(this.player.r, Math.min(cw - this.player.r, this.player.x));
        this.player.y = Math.max(this.player.r, Math.min(ch - this.player.r, this.player.y));

        // Ball position (follows player)
        this.ball.x = this.player.x + 15;
        this.ball.y = this.player.y + 15;

        // Tópico 4: IA Zagueiros (Perseguição)
        this.enemies.forEach(e => {
            const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
            e.x += Math.cos(angle) * e.speed;
            e.y += Math.sin(angle) * e.speed;

            // Colisão Zagueiro (Tópico 4)
            const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
            if (dist < (this.player.r + e.r)) {
                this.resetWorld(); // Lose ball / reset
            }
        });

        // Tópico 3: Chute no Gol (ESPAÇO)
        if (this.keys['Space']) {
            const goal = this.goals[0];
            const distToGoal = Math.hypot(this.player.x - goal.x, this.player.y - goal.y);
            if (distToGoal < 100) {
                this.triggerGoal();
            }
            this.keys['Space'] = false; // debounce
        }

        // Particles
        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) this.particles.splice(i, 1);
        });
    }

    triggerGoal() {
        this.score++;
        this.updateHUD();

        // Tópico 8: Explosão Neon
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: this.goals[0].x,
                y: this.goals[0].y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1,
                color: this.playerTeam.color
            });
        }

        // Tópico 5: Regra 3 Gols
        if (this.score >= 3) {
            setTimeout(() => this.finishPhase(), 500);
        } else {
            this.spawnGoal();
        }
    }

    updateHUD() {
        document.getElementById('current-score').innerText = this.score;
    }

    finishPhase() {
        this.switchScreen('result-screen');
        document.getElementById('hud').classList.add('hidden');

        const next = STAGES[this.stageIdx + 1];
        if (next) {
            document.getElementById('result-text').innerText = "VITÓRIA!";
            document.getElementById('next-phase-info').innerText = "RUMO ÀS " + next.toUpperCase();
            document.getElementById('advance-btn').classList.remove('hidden');
            document.getElementById('retry-btn').classList.add('hidden');
        } else {
            this.switchScreen('finale-screen');
            document.getElementById('champ-team').innerText = this.playerTeam.name.toUpperCase();
        }
    }

    nextStage() {
        this.stageIdx++;
        this.prepareIntro();
    }

    draw() {
        const cw = this.canvas.width;
        const ch = this.canvas.height;
        this.ctx.clearRect(0, 0, cw, ch);

        if (this.state === 'MENU' || this.state === 'INTRO') return;

        // Tópico 3: Arena (Visão de cima)
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(50, 50, cw - 100, ch - 100);
        this.ctx.beginPath();
        this.ctx.arc(cw / 2, ch / 2, 100, 0, Math.PI * 2);
        this.ctx.stroke();

        // Goal Draw
        const goal = this.goals[0];
        if (goal) {
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#fff';
            this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
            this.ctx.fillRect(goal.x - goal.w / 2, goal.y - goal.h / 2, goal.w, goal.h);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 5;
            this.ctx.strokeRect(goal.x - goal.w / 2, goal.y - goal.h / 2, goal.w, goal.h);
            this.ctx.shadowBlur = 0;

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '900 12px Outfit';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(" CHUTE AQUI (ESPAÇO)", goal.x, goal.y + 5);
        }

        // Draw Zagueiros (Tópico 4)
        this.enemies.forEach(e => {
            this.ctx.fillStyle = '#ff3e3e';
            this.ctx.beginPath();
            this.ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });

        // Draw Player (Tópico 2)
        this.ctx.shadowBlur = 25;
        this.ctx.shadowColor = this.playerTeam.color;
        this.ctx.fillStyle = this.playerTeam.color;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Ball
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
        this.ctx.fill();

        // Goal Particles (Tópico 8)
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x, p.y, 5, 5);
        });
        this.ctx.globalAlpha = 1;
    }
}

window.onload = () => new ArenaGame();
