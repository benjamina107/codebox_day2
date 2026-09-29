const { test } = require("node:test");
const assert = require("node:assert/strict");
const PoopGame = require("../public/physics");
const { initialState, validateState } = require("../src/services/gameState");
const stateWith = (poops) => ({
  ...initialState(),
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
test("two rainbows clear and award the final bonus", () => {
  const game = new PoopGame(
    stateWith([
      { level: 5, x: 102, y: 430 },
      { level: 5, x: 300, y: 430 },
    ]),
  );
  settle(game);
  assert.equal(game.bodies().length, 0);
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
  assert.equal(validateState(stateWith([{ level: 6, x: 100, y: 100 }])), false);
  assert.equal(
    validateState(
      stateWith(
        Array.from({ length: 201 }, () => ({ level: 0, x: 100, y: 100 })),
      ),
    ),
    false,
  );
});
test("overflow has a grace period, then ends and remains ended after restoring", () => {
  const { Body } = require("matter-js");
  const game = new PoopGame(stateWith([{ level: 3, x: 150, y: 100 }]));
  Body.setStatic(game.bodies()[0], true);
  settle(game, 120);
  assert.equal(game.gameOver, false);
  settle(game, 120);
  assert.equal(game.gameOver, true);
  const restored = new PoopGame(game.snapshot());
  const snapshot = restored.snapshot();
  settle(restored);
  assert.deepEqual(restored.snapshot(), snapshot);
  restored.destroy();
  game.destroy();
});
