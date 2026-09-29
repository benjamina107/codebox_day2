(function (root) {
  const M = typeof module !== "undefined" ? require("matter-js") : root.Matter;
  const C = typeof module !== "undefined" ? require("./config") : root.POOP;
  const { Engine, Bodies, Body, Composite, Events } = M;
  let idCounter = 0;
  class PoopGame {
    constructor(state, onChange = () => {}) {
      this.engine = Engine.create({
        enableSleeping: true,
        positionIterations: 8,
      });
      this.onChange = onChange;
      this.time = 0;
      this.dropAt = -1000;
      this.aim = C.width / 2;
      this.effects = [];
      this.chain = 0;
      this.lastMergeAt = -Infinity;
      this.pending = [];
      this.score = state.score;
      this.current = state.current;
      this.next = state.next;
      this.gameOver = state.gameOver;
      this.highestLevel = Math.max(
        state.highestLevel ?? 0,
        ...state.poops.map((p) => p.level),
      );
      Composite.add(this.engine.world, [
        Bodies.rectangle(C.width / 2, C.height + 20, C.width + 80, 40, {
          isStatic: true,
        }),
        Bodies.rectangle(-20, C.height / 2, 40, C.height * 3, {
          isStatic: true,
        }),
        Bodies.rectangle(C.width + 20, C.height / 2, 40, C.height * 3, {
          isStatic: true,
        }),
      ]);
      for (const p of state.poops) {
        const body = this.add(p.level, p.x, p.y, p.id);
        Body.setAngle(body, p.angle);
        Body.setVelocity(body, { x: p.vx, y: p.vy });
        Body.setAngularVelocity(body, p.angularVelocity);
        body.poop.placementPending = p.placementPending === true;
      }
      const queue = (event) => {
        for (const { bodyA: a, bodyB: b } of event.pairs) {
          if (a.poop && b.poop && a.poop.level === b.poop.level)
            this.pending.push([a, b]);
        }
      };
      Events.on(this.engine, "collisionStart", queue);
      Events.on(this.engine, "collisionActive", queue);
    }
    add(level, x, y, id) {
      this.highestLevel = Math.max(this.highestLevel, level);
      const body = Bodies.circle(x, y, C.levels[level].radius, {
        restitution: 0.18,
        friction: 0.35,
        frictionStatic: 0.7,
        frictionAir: 0.012,
        slop: 0.02,
        sleepThreshold: 45,
      });
      body.poop = {
        level,
        id: id || `p-${Date.now()}-${++idCounter}`,
        born: this.time,
      };
      Composite.add(this.engine.world, body);
      return body;
    }
    bodies() {
      return this.engine.world.bodies.filter((b) => b.poop);
    }
    setAim(x) {
      const radius = C.levels[this.current].radius;
      this.aim = Math.max(radius + 3, Math.min(C.width - radius - 3, x));
    }
    drop() {
      if (this.gameOver || this.time - this.dropAt < 500) return false;
      this.setAim(this.aim);
      const dropped = this.add(this.current, this.aim, 35);
      dropped.poop.placementPending = true;
      this.dropAt = this.time;
      this.current = this.next;
      this.next = Math.floor(Math.random() * 3);
      this.onChange("drop");
      return true;
    }
    step(delta) {
      if (this.gameOver) return;
      this.time += delta;
      Engine.update(this.engine, delta);
      const consumed = new Set();
      let changed = false;
      for (const [a, b] of this.pending) {
        if (consumed.has(a.id) || consumed.has(b.id)) continue;
        consumed.add(a.id);
        consumed.add(b.id);
        const level = a.poop.level;
        const x = (a.position.x + b.position.x) / 2;
        const y = (a.position.y + b.position.y) / 2;
        Composite.remove(this.engine.world, [a, b]);
        if (level + 1 < C.levels.length) {
          const r = C.levels[level + 1].radius;
          this.add(
            level + 1,
            Math.max(r, Math.min(C.width - r, x)),
            Math.min(C.height - r, y),
          );
        }
        const points = 10 * 2 ** (level + 1);
        const resultLevel = Math.min(level + 1, C.levels.length - 1);
        this.highestLevel = Math.max(this.highestLevel, resultLevel);
        this.chain = this.time - this.lastMergeAt < 1200 ? this.chain + 1 : 1;
        this.lastMergeAt = this.time;
        this.score += points;
        this.effects.push({
          x,
          y,
          points,
          start: this.time,
          color: C.levels[resultLevel].color,
          level: resultLevel,
          chain: this.chain,
          final: level === C.levels.length - 1,
          duration: resultLevel >= 6 ? 1500 : 850,
        });
        changed = true;
      }
      this.pending = [];
      this.effects = this.effects
        .filter((e) => this.time - e.start < e.duration)
        .slice(-12);
      let failedPlacement = false;
      for (const body of this.bodies()) {
        if (!body.poop.placementPending) continue;
        const aboveLine =
          body.position.y - C.levels[body.poop.level].radius < C.dangerLine;
        // Once a drop enters the pile safely, later movement cannot end the run.
        if (!aboveLine) {
          body.poop.placementPending = false;
          continue;
        }
        const settled = this.time - body.poop.born > 1500 && body.speed < 1.5;
        body.poop.settledAbove = settled
          ? (body.poop.settledAbove || 0) + delta
          : 0;
        if (body.poop.settledAbove > 300) failedPlacement = true;
      }
      if (failedPlacement) {
        this.gameOver = true;
        this.onChange("over");
      } else if (changed) this.onChange("merge");
    }
    snapshot() {
      const round = (n) => Math.round(n * 10000) / 10000;
      return {
        version: 1,
        score: this.score,
        current: this.current,
        next: this.next,
        gameOver: this.gameOver,
        highestLevel: this.highestLevel,
        poops: this.bodies().map((b) => ({
          id: b.poop.id,
          level: b.poop.level,
          x: round(b.position.x),
          y: round(b.position.y),
          vx: round(b.velocity.x),
          vy: round(b.velocity.y),
          angle: round(b.angle),
          angularVelocity: round(b.angularVelocity),
          ...(b.poop.placementPending ? { placementPending: true } : {}),
        })),
      };
    }
    destroy() {
      Events.off(this.engine);
      Composite.clear(this.engine.world, false);
      Engine.clear(this.engine);
    }
  }
  if (typeof module !== "undefined") module.exports = PoopGame;
  else root.PoopGame = PoopGame;
})(typeof window !== "undefined" ? window : globalThis);
