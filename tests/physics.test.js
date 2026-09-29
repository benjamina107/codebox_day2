const { test } = require("node:test");
const assert = require("node:assert/strict");
const PoopGame = require("../public/physics");
const config = require("../public/config");
const { initialState, validateState } = require("../src/services/gameState");
const stateWith = (poops) => ({
  ...initialState(),
  highestLevel: Math.max(0, ...poops.map((p) => p.level)),
  poops: poops.map((p, i) => ({
    id: `p${i}`,
    vx: 0,
    vy: 0,
    angle: 0,
    angularVelocity: 0,
    ...p,
  })),
});
const settle = (game, steps = 240) => {
  for (let i = 0; i < steps; i++) game.step(1000 / 60);
};
test("matching pieces merge once into the next type and award points", () => {
  const game = new PoopGame(
    stateWith([
      { level: 0, x: 178, y: 520 },
      { level: 0, x: 218, y: 520 },
    ]),
  );
  settle(game);
  assert.equal(game.bodies().length, 1);
  assert.equal(game.bodies()[0].poop.level, 1);
  assert.equal(game.score, 20);
  assert.equal(validateState(game.snapshot()), true);
  game.destroy();
});
test("different colors stay separate", () => {
  const game = new PoopGame(
    stateWith([
      { level: 0, x: 178, y: 510 },
      { level: 1, x: 230, y: 510 },
    ]),
  );
  settle(game);
  assert.equal(game.bodies().length, 2);
  assert.equal(game.score, 0);
  game.destroy();
});
test("two rainbows ascend into Crystal without changing the original tier IDs", () => {
  const game = new PoopGame(
    stateWith([
      { level: 5, x: 102, y: 430 },
      { level: 5, x: 300, y: 430 },
    ]),
  );
  settle(game);
  assert.equal(game.bodies().length, 1);
  assert.equal(game.bodies()[0].poop.level, 6);
  assert.equal(game.highestLevel, 6);
  assert.equal(game.score, 640);
  game.destroy();
});
test("save and restore preserve every position, type, velocity, angle, and preview", () => {
  const state = stateWith([
    {
      level: 2,
      x: 120,
      y: 300,
      vx: 1.2,
      vy: 3.4,
      angle: 0.21,
      angularVelocity: 0.02,
    },
    { level: 1, x: 250, y: 470 },
  ]);
  state.score = 80;
  state.next = 2;
  state.current = 1;
  const game = new PoopGame(state);
  const snapshot = game.snapshot();
  const restored = new PoopGame(snapshot);
  assert.deepEqual(restored.snapshot(), snapshot);
  assert.deepEqual(snapshot, state);
  restored.destroy();
  game.destroy();
});
test("drop cooldown and wall bounds prevent spam and off-board drops", () => {
  const game = new PoopGame(initialState());
  game.setAim(-1000);
  assert.equal(game.drop(), true);
  assert.equal(game.drop(), false);
  assert.ok(game.bodies()[0].position.x >= 22);
  settle(game, 40);
  assert.equal(game.drop(), true);
  game.destroy();
});
test("invalid and oversized states are rejected before database writes", () => {
  assert.equal(validateState(initialState()), true);
  assert.equal(validateState({ ...initialState(), score: -1 }), false);
  assert.equal(
    validateState(stateWith([{ level: 0, x: Infinity, y: 0 }])),
    false,
  );
  assert.equal(
    validateState(stateWith([{ level: config.levels.length, x: 100, y: 100 }])),
    false,
  );
  assert.equal(
    validateState(
      stateWith(
        Array.from({ length: 201 }, () => ({ level: 0, x: 100, y: 100 })),
      ),
    ),
    false,
  );
});
test("a newly placed poop stuck above the line ends the game after settling", () => {
  const { Body } = require("matter-js");
  const game = new PoopGame(initialState());
  game.drop();
  Body.setStatic(game.bodies()[0], true);
  settle(game, 90);
  assert.equal(game.gameOver, false);
  settle(game, 30);
  assert.equal(game.gameOver, true);
  const restored = new PoopGame(game.snapshot());
  const snapshot = restored.snapshot();
  settle(restored);
  assert.deepEqual(restored.snapshot(), snapshot);
  restored.destroy();
  game.destroy();
});
test("older poops moving above the line do not end the game", () => {
  const { Body } = require("matter-js");
  const game = new PoopGame(stateWith([{ level: 3, x: 150, y: 400 }]));
  const old = game.bodies()[0];
  Body.setStatic(old, true);
  settle(game);
  Body.setPosition(old, { x: 150, y: 100 });
  settle(game, 360);
  assert.equal(game.gameOver, false);
  game.destroy();
});
test("dropping onto a high pile ends the run without requiring older pieces to overflow", () => {
  const { Body } = require("matter-js");
  const state = stateWith([{ level: 3, x: 200, y: 150 }]);
  state.current = 1;
  const game = new PoopGame(state);
  Body.setStatic(game.bodies()[0], true);
  game.drop();
  settle(game);
  assert.equal(game.gameOver, true);
  assert.ok(game.bodies()[0].position.y - config.levels[3].radius >= config.dangerLine);
  game.destroy();
});
test("a safe drop stays safe when later bumped above the line", () => {
  const { Body } = require("matter-js");
  const game = new PoopGame(initialState());
  game.drop();
  settle(game);
  const dropped = game.bodies()[0];
  assert.equal(dropped.poop.placementPending, false);
  Body.setStatic(dropped, true);
  Body.setPosition(dropped, { x: 150, y: 70 });
  settle(game, 360);
  assert.equal(game.gameOver, false);
  game.destroy();
});
test("pending placement survives saving and restoring", () => {
  const { Body } = require("matter-js");
  const { cleanState } = require("../src/services/gameState");
  const game = new PoopGame(initialState());
  game.drop();
  const snapshot = game.snapshot();
  assert.equal(validateState(snapshot), true);
  assert.equal(snapshot.poops[0].placementPending, true);
  const restored = new PoopGame(cleanState(snapshot));
  assert.deepEqual(restored.snapshot(), snapshot);
  Body.setStatic(restored.bodies()[0], true);
  settle(restored);
  assert.equal(restored.gameOver, true);
  restored.destroy();
  game.destroy();
});

for (let level = 6; level < config.levels.length; level++) {
  test(`${config.levels[level].name} merges into the next rarity or clears at Cosmic`, () => {
    const r = config.levels[level].radius;
    const game = new PoopGame(
      stateWith([
        { level, x: 200 - r * 0.8, y: 380 },
        { level, x: 200 + r * 0.8, y: 380 },
      ]),
    );
    settle(game, 6);
    if (level === config.levels.length - 1)
      assert.equal(game.bodies().length, 0);
    else {
      assert.equal(game.bodies().length, 1);
      assert.equal(game.bodies()[0].poop.level, level + 1);
    }
    assert.equal(game.score, 10 * 2 ** (level + 1));
    assert.equal(
      game.highestLevel,
      Math.min(level + 1, config.levels.length - 1),
    );
    assert.equal(validateState(game.snapshot()), true);
    const restored = new PoopGame(game.snapshot());
    assert.deepEqual(restored.snapshot(), game.snapshot());
    restored.destroy();
    game.destroy();
  });
}
test("legacy saves without rarity metadata preserve all six original pieces", () => {
  const legacy = stateWith(
    config.levels.slice(0, 6).map((_, level) => ({ level, x: 150, y: 250 })),
  );
  delete legacy.highestLevel;
  assert.equal(validateState(legacy), true);
  const restored = new PoopGame(legacy);
  assert.deepEqual(restored.snapshot().poops, legacy.poops);
  assert.equal(restored.highestLevel, 5);
  assert.equal(validateState(restored.snapshot()), true);
  restored.destroy();
});
test("one piece cannot merge twice in a collision batch", () => {
  const game = new PoopGame(
    stateWith([175, 200, 225].map((x) => ({ level: 0, x, y: 400 }))),
  );
  settle(game, 2);
  assert.equal(game.bodies().length, 2);
  assert.equal(game.score, 20);
  game.destroy();
});
