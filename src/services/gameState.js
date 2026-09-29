const config = require("../../public/config");
const initialState = () => ({
  version: 1,
  score: 0,
  current: 0,
  next: 0,
  gameOver: false,
  poops: [],
});
function validateState(state) {
  if (
    !state ||
    typeof state !== "object" ||
    state.version !== 1 ||
    !Number.isSafeInteger(state.score) ||
    state.score < 0 ||
    state.score > 100000000 ||
    ![state.current, state.next].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 3,
    ) ||
    typeof state.gameOver !== "boolean" ||
    !Array.isArray(state.poops) ||
    state.poops.length > 200
  )
    return false;
  const ids = new Set();
  for (const poop of state.poops) {
    if (
      !poop ||
      typeof poop.id !== "string" ||
      poop.id.length > 64 ||
      !poop.id ||
      ids.has(poop.id) ||
      !Number.isInteger(poop.level) ||
      poop.level < 0 ||
      poop.level >= config.levels.length ||
      !["x", "y", "vx", "vy", "angle", "angularVelocity"].every((key) =>
        Number.isFinite(poop[key]),
      ) ||
      poop.x < -100 ||
      poop.x > config.width + 100 ||
      poop.y < -200 ||
      poop.y > config.height + 100 ||
      Math.abs(poop.vx) > 100 ||
      Math.abs(poop.vy) > 100 ||
      Math.abs(poop.angularVelocity) > 10 ||
      Math.abs(poop.angle) > 1000000
    )
      return false;
    ids.add(poop.id);
  }
  return true;
}
function cleanState(s) {
  return {
    version: 1,
    score: s.score,
    current: s.current,
    next: s.next,
    gameOver: s.gameOver,
    poops: s.poops.map((p) =>
      Object.fromEntries(
        ["id", "level", "x", "y", "vx", "vy", "angle", "angularVelocity"].map(
          (k) => [k, p[k]],
        ),
      ),
    ),
  };
}
module.exports = { initialState, validateState, cleanState };
