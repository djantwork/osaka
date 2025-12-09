const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayBody = document.getElementById('overlay-body');

const KEY_STATE = new Map();
['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space'].forEach((key) => KEY_STATE.set(key, false));

window.addEventListener('keydown', (e) => {
  if (KEY_STATE.has(e.code)) {
    e.preventDefault();
    KEY_STATE.set(e.code, true);
  }
  if (!game.running && e.code === 'Space') {
    game.start();
  }
});

window.addEventListener('keyup', (e) => {
  if (KEY_STATE.has(e.code)) {
    KEY_STATE.set(e.code, false);
  }
});

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resize);
resize();

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

function wrapPosition(obj) {
  if (obj.pos.x < 0) obj.pos.x += canvas.width;
  if (obj.pos.x > canvas.width) obj.pos.x -= canvas.width;
  if (obj.pos.y < 0) obj.pos.y += canvas.height;
  if (obj.pos.y > canvas.height) obj.pos.y -= canvas.height;
}

class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  clone() {
    return new Vector(this.x, this.y);
  }
  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }
  length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
  normalize() {
    const len = this.length() || 1;
    this.x /= len;
    this.y /= len;
    return this;
  }
}

class Particle {
  constructor(pos, vel, life, color, size) {
    this.pos = pos.clone();
    this.vel = vel.clone();
    this.life = life;
    this.remaining = life;
    this.color = color;
    this.size = size;
  }
  update(dt) {
    this.remaining -= dt;
    this.pos.add(this.vel.clone().scale(dt));
  }
  draw() {
    ctx.globalAlpha = Math.max(this.remaining / this.life, 0);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

class Bullet {
  constructor(pos, angle, speed, friendly = true) {
    const dir = new Vector(Math.cos(angle), Math.sin(angle));
    this.pos = pos.clone();
    this.vel = dir.scale(speed);
    this.radius = 2;
    this.life = 1.2;
    this.remaining = this.life;
    this.friendly = friendly;
  }
  update(dt) {
    this.remaining -= dt;
    this.pos.add(this.vel.clone().scale(dt));
    wrapPosition(this);
  }
  draw() {
    ctx.fillStyle = this.friendly ? '#8ee3ff' : '#ff8f8f';
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Asteroid {
  constructor(pos, size, speed = null) {
    this.pos = pos.clone();
    const angle = randRange(0, Math.PI * 2);
    const magnitude = speed ?? randRange(20, 60);
    this.vel = new Vector(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
    this.size = size; // 3 large, 2 medium, 1 small
    this.radius = this.size * 16;
    this.vertices = Array.from({ length: randRange(9, 13) }, () => randRange(0.6, 1.2));
    this.rotation = randRange(-0.5, 0.5);
    this.angle = randRange(0, Math.PI * 2);
  }
  update(dt) {
    this.pos.add(this.vel.clone().scale(dt));
    this.angle += this.rotation * dt;
    wrapPosition(this);
  }
  draw() {
    ctx.strokeStyle = '#d9d9d9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.vertices.forEach((mult, i) => {
      const theta = this.angle + (i / this.vertices.length) * Math.PI * 2;
      const r = this.radius * mult;
      const x = this.pos.x + Math.cos(theta) * r;
      const y = this.pos.y + Math.sin(theta) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }
}

class Ship {
  constructor() {
    this.pos = new Vector(canvas.width / 2, canvas.height / 2);
    this.vel = new Vector(0, 0);
    this.radius = 12;
    this.angle = -Math.PI / 2;
    this.cooldown = 0;
    this.invulnerable = 2;
    this.thrustParticles = 0;
  }
  update(dt) {
    const turnSpeed = 4;
    const thrustPower = 160;
    const friction = 0.995;

    if (KEY_STATE.get('ArrowLeft')) this.angle -= turnSpeed * dt;
    if (KEY_STATE.get('ArrowRight')) this.angle += turnSpeed * dt;

    if (KEY_STATE.get('ArrowUp')) {
      const acc = new Vector(Math.cos(this.angle), Math.sin(this.angle)).scale(thrustPower * dt);
      this.vel.add(acc);
      this.thrustParticles += dt * 60;
    } else {
      this.thrustParticles = 0;
    }

    this.vel.scale(friction);
    this.pos.add(this.vel.clone().scale(dt));
    wrapPosition(this);

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
  }
  shoot() {
    if (this.cooldown > 0) return null;
    this.cooldown = 0.25;
    const muzzle = new Vector(Math.cos(this.angle), Math.sin(this.angle)).scale(this.radius + 4);
    const bulletPos = this.pos.clone().add(muzzle);
    const bulletSpeed = 280 + this.vel.length();
    return new Bullet(bulletPos, this.angle, bulletSpeed, true);
  }
  draw() {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle + Math.PI / 2);
    ctx.strokeStyle = '#8ee3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -this.radius);
    ctx.lineTo(this.radius * 0.65, this.radius);
    ctx.lineTo(0, this.radius * 0.4);
    ctx.lineTo(-this.radius * 0.65, this.radius);
    ctx.closePath();
    ctx.stroke();

    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 8) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
    }

    ctx.restore();
  }
}

class UFO {
  constructor(level) {
    const side = Math.random() < 0.5 ? 0 : canvas.width;
    this.pos = new Vector(side, randRange(40, canvas.height - 40));
    const direction = side === 0 ? 1 : -1;
    const baseSpeed = Math.min(120, 60 + level * 8);
    this.vel = new Vector(baseSpeed * direction, randRange(-20, 20));
    this.radius = 18;
    this.cooldown = 1.5;
    this.alive = true;
  }
  update(dt, target) {
    this.pos.add(this.vel.clone().scale(dt));
    wrapPosition(this);
    this.cooldown -= dt;
    if (this.cooldown <= 0 && target) {
      this.cooldown = 1.8;
      const dir = new Vector(target.pos.x - this.pos.x, target.pos.y - this.pos.y).normalize();
      const angle = Math.atan2(dir.y, dir.x);
      return new Bullet(this.pos.clone(), angle, 180, false);
    }
    return null;
  }
  draw() {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.strokeStyle = '#f8d57a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius, this.radius * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -this.radius * 0.35, this.radius * 0.35, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
  }
}

class Game {
  constructor() {
    this.reset();
    this.lastTime = 0;
    this.running = false;
  }
  reset() {
    this.ship = new Ship();
    this.asteroids = [];
    this.bullets = [];
    this.particles = [];
    this.ufoBullets = [];
    this.ufo = null;
    this.score = 0;
    this.level = 1;
    this.lives = 3;
    this.ufoTimer = 12;
    this.spawnAsteroids();
    this.updateHUD();
    overlay.hidden = false;
    overlayTitle.textContent = 'Ready';
    overlayBody.textContent = 'Destroy all asteroids';
  }
  start() {
    if (this.running) return;
    this.running = true;
    overlay.hidden = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }
  spawnAsteroids() {
    const count = 3 + this.level;
    for (let i = 0; i < count; i++) {
      const pos = new Vector(randRange(0, canvas.width), randRange(0, canvas.height));
      if (pos.clone().add(new Vector(-this.ship.pos.x, -this.ship.pos.y)).length() < 140) {
        i -= 1;
        continue;
      }
      this.asteroids.push(new Asteroid(pos, 3));
    }
  }
  updateHUD() {
    scoreEl.textContent = this.score.toLocaleString();
    levelEl.textContent = this.level;
    livesEl.innerHTML = '';
    for (let i = 0; i < this.lives; i++) {
      const div = document.createElement('div');
      div.className = 'life-icon';
      livesEl.appendChild(div);
    }
  }
  loop(timestamp) {
    if (!this.running) return;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.04);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this.loop.bind(this));
  }
  addParticles(count, pos, color) {
    for (let i = 0; i < count; i++) {
      const angle = randRange(0, Math.PI * 2);
      const speed = randRange(40, 160);
      const vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.particles.push(new Particle(pos.clone(), vel, randRange(0.4, 1), color, randRange(1, 3)));
    }
  }
  update(dt) {
    if (!this.running) return;

    this.ship.update(dt);
    if (KEY_STATE.get('Space')) {
      const bullet = this.ship.shoot();
      if (bullet) this.bullets.push(bullet);
    }

    if (this.ship.thrustParticles > 0) {
      const amount = Math.floor(this.ship.thrustParticles);
      this.ship.thrustParticles -= amount;
      for (let i = 0; i < amount; i++) {
        const angle = this.ship.angle + Math.PI + randRange(-0.3, 0.3);
        const speed = randRange(40, 120);
        const pos = this.ship.pos.clone().add(new Vector(Math.cos(angle) * this.ship.radius * 0.8, Math.sin(angle) * this.ship.radius * 0.8));
        const vel = new Vector(Math.cos(angle) * speed, Math.sin(angle) * speed);
        this.particles.push(new Particle(pos, vel, 0.35, '#ffb347', randRange(1, 2)));
      }
    }

    for (const asteroid of this.asteroids) asteroid.update(dt);
    for (const bullet of this.bullets) bullet.update(dt);
    for (const bullet of this.ufoBullets) bullet.update(dt);

    this.particles = this.particles.filter((p) => (p.update(dt), p.remaining > 0));
    this.bullets = this.bullets.filter((b) => b.remaining > 0);
    this.ufoBullets = this.ufoBullets.filter((b) => b.remaining > 0);

    if (this.ufo) {
      const shot = this.ufo.update(dt, this.ship);
      if (shot) this.ufoBullets.push(shot);
    } else {
      this.ufoTimer -= dt;
      if (this.ufoTimer <= 0) {
        this.ufo = new UFO(this.level);
        this.ufoTimer = Math.max(10 - this.level * 0.5, 4);
      }
    }

    this.handleCollisions();

    if (this.asteroids.length === 0) {
      this.level += 1;
      this.ship.invulnerable = 2;
      this.spawnAsteroids();
      this.updateHUD();
    }
  }
  handleCollisions() {
    // bullets vs asteroids
    this.bullets.forEach((bullet) => {
      this.asteroids.forEach((asteroid, idx) => {
        if (bullet.remaining <= 0) return;
        const dist = bullet.pos.clone().add(new Vector(-asteroid.pos.x, -asteroid.pos.y)).length();
        if (dist < asteroid.radius) {
          bullet.remaining = 0;
          this.breakAsteroid(idx);
        }
      });
    });

    // ship vs asteroids
    if (this.ship.invulnerable <= 0) {
      this.asteroids.forEach((asteroid, idx) => {
        const dist = this.ship.pos.clone().add(new Vector(-asteroid.pos.x, -asteroid.pos.y)).length();
        if (dist < asteroid.radius + this.ship.radius) {
          this.killShip();
          this.breakAsteroid(idx);
        }
      });
    }

    // ship vs UFO bullets
    if (this.ship.invulnerable <= 0) {
      this.ufoBullets.forEach((bullet) => {
        const dist = this.ship.pos.clone().add(new Vector(-bullet.pos.x, -bullet.pos.y)).length();
        if (dist < bullet.radius + this.ship.radius) {
          bullet.remaining = 0;
          this.killShip();
        }
      });
    }

    // player bullets vs UFO
    if (this.ufo) {
      this.bullets.forEach((bullet) => {
        if (!bullet.friendly) return;
        const dist = this.ufo.pos.clone().add(new Vector(-bullet.pos.x, -bullet.pos.y)).length();
        if (dist < this.ufo.radius + bullet.radius) {
          bullet.remaining = 0;
          this.addParticles(30, this.ufo.pos, '#f7de8c');
          this.score += 250;
          this.ufo = null;
          this.updateHUD();
        }
      });
    }
  }
  killShip() {
    this.addParticles(40, this.ship.pos, '#8ee3ff');
    this.ship = new Ship();
    this.lives -= 1;
    this.updateHUD();
    if (this.lives <= 0) {
      this.running = false;
      overlay.hidden = false;
      overlayTitle.textContent = 'Game Over';
      overlayBody.textContent = `Final score: ${this.score.toLocaleString()}`;
    }
  }
  breakAsteroid(index) {
    const asteroid = this.asteroids[index];
    this.addParticles(20, asteroid.pos, '#d9d9d9');
    this.score += (4 - asteroid.size) * 20 + 20;
    if (asteroid.size > 1) {
      for (let i = 0; i < 2; i++) {
        const child = new Asteroid(asteroid.pos.clone(), asteroid.size - 1, randRange(70, 110));
        this.asteroids.push(child);
      }
    }
    this.asteroids.splice(index, 1);
    this.updateHUD();
  }
  draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.particles.forEach((p) => p.draw());
    this.asteroids.forEach((a) => a.draw());
    if (this.ufo) this.ufo.draw();
    this.bullets.forEach((b) => b.draw());
    this.ufoBullets.forEach((b) => b.draw());
    this.ship.draw();
  }
}

const game = new Game();
