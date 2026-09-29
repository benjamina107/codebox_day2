"use strict";
const $ = (id) => document.getElementById(id);
const C = window.POOP;
const canvas = $("board");
const ctx = canvas.getContext("2d");
const sprites = C.levels.map((level) => {
  const image = new Image();
  image.src = level.image;
  return image;
});
let player = null;
let current = null;
let game = null;
let paused = false;
let games = [];
let best = 0;
let savePromise = null;
let savedSnapshot = "";
let saveBlocked = false;
let nameMode = "create";
let deleteTarget = null;
let lastFrame = 0;
let accumulator = 0;
let toastTimer;
const draftKey = (id) => `shitty-draft:${player.id}:${id}`;

async function api(path, method = "GET", data) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    keepalive: method === "PATCH",
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 204) return null;
  const result = await response
    .json()
    .catch(() => ({ error: "The server returned an unexpected response." }));
  if (!response.ok) {
    const error = new Error(result.error || "Something went wrong. Try again.");
    error.status = response.status;
    throw error;
  }
  return result;
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 6000);
}
function setStatus(text, error = false) {
  $("save-status").textContent = text;
  $("save-status").classList.toggle("error", error);
}
function safeDraft() {
  if (!game || !current || !player || saveBlocked) return;
  try {
    localStorage.setItem(
      draftKey(current.id),
      JSON.stringify({ revision: current.revision, state: game.snapshot() }),
    );
  } catch {
    /* Cloud saves still work if browser storage is unavailable. */
  }
}
function removeDraft(id) {
  try {
    localStorage.removeItem(draftKey(id));
  } catch {}
}
async function save() {
  while (savePromise) await savePromise;
  if (!game || !current) return true;
  if (saveBlocked)
    throw new Error("Reload this page to resume the latest pile.");
  const state = game.snapshot();
  const snapshot = JSON.stringify(state);
  if (snapshot === savedSnapshot) {
    setStatus("Saved");
    return true;
  }
  const record = current;
  safeDraft();
  setStatus("Saving…");
  savePromise = (async () => {
    try {
      const { game: updated } = await api(`/games/${record.id}`, "PATCH", {
        state,
        revision: record.revision,
      });
      if (current?.id === record.id) {
        current = updated;
        savedSnapshot = snapshot;
        if (JSON.stringify(game.snapshot()) === snapshot)
          removeDraft(record.id);
        else safeDraft();
        setStatus("Saved");
      }
      return true;
    } catch (error) {
      setStatus(
        error.status === 409 ? "Changed in another tab" : "Save pending",
        true,
      );
      if ([401, 404, 409].includes(error.status)) {
        saveBlocked = true;
        paused = true;
        updateOverlay();
        toast(error.message);
      }
      throw error;
    } finally {
      savePromise = null;
    }
  })();
  return savePromise;
}
function setPlayer(nextPlayer) {
  player = nextPlayer;
  $("player-button").hidden = !player;
  $("enter-form").hidden = !!player;
  $("welcome").hidden = !player;
  if (player) {
    $("player-name").textContent = player.username;
    $("welcome-text").textContent = player.username;
    $("account-title").textContent = player.username;
  }
}
function showHome() {
  document.body.classList.remove("playing");
  $("home").hidden = false;
  $("play").hidden = true;
  paused = true;
  window.scrollTo({ top: 0, behavior: "instant" });
}
function updateHud() {
  if (!game) return;
  best = Math.max(best, game.score);
  $("score").textContent = game.score.toLocaleString();
  $("best-score").textContent = best.toLocaleString();
  $("next-image").src = C.levels[game.next].image;
  $("next-image").alt = `Next: ${C.levels[game.next].name}`;
  $("game-name").textContent = current.name;
  updateOverlay();
}
function updateOverlay() {
  if (!game) return;
  $("board-overlay").hidden = (!paused && !game.gameOver) || $("play").hidden;
  $("pause-button").textContent = paused ? "Resume" : "Pause";
  if (saveBlocked) {
    $("overlay-title").textContent = "Game updated";
    $("overlay-copy").textContent =
      "Reload to continue from the latest saved pile.";
    $("overlay-button").textContent = "Reload";
  } else if (game.gameOver) {
    $("overlay-title").textContent = "Game over";
    $("overlay-copy").textContent = `${game.score.toLocaleString()} points`;
    $("overlay-button").textContent = "New game";
  } else {
    $("overlay-title").textContent = "Paused";
    $("overlay-copy").textContent = "";
    $("overlay-button").textContent = "Resume";
  }
}
function start(record) {
  document.body.classList.add("playing");
  if (game) game.destroy();
  current = record;
  let state = record.state;
  savedSnapshot = JSON.stringify(state);
  try {
    const draft = JSON.parse(
      localStorage.getItem(draftKey(record.id)) || "null",
    );
    if (
      draft &&
      draft.revision === record.revision &&
      draft.state?.version === 1
    ) {
      state = draft.state;
      if (JSON.stringify(state) !== savedSnapshot) toast("Progress restored.");
    } else if (draft) removeDraft(record.id);
  } catch {
    removeDraft(record.id);
  }
  saveBlocked = false;
  paused = false;
  game = new window.PoopGame(state, (type) => {
    updateHud();
    safeDraft();
    if (type === "over") save().catch((error) => toast(error.message));
  });
  $("home").hidden = true;
  $("play").hidden = false;
  updateHud();
  setStatus(JSON.stringify(state) === savedSnapshot ? "Saved" : "Save pending");
  accumulator = 0;
  window.scrollTo({ top: 0, behavior: "instant" });
}
async function loadGames() {
  const result = await api("/games");
  games = result.games;
  best = Math.max(best, ...games.map((g) => g.score), 0);
  return games;
}
async function resumeLatest() {
  if (current && game) {
    document.body.classList.add("playing");
    $("home").hidden = true;
    $("play").hidden = false;
    paused = false;
    updateHud();
    return;
  }
  await loadGames();
  if (games.length) start((await api(`/games/${games[0].id}`)).game);
  else start((await api("/games", "POST", { name: "My first pile" })).game);
}
function openDialog(id) {
  const dialog = $(id);
  dialog.wasPaused = paused;
  if (game && !$("play").hidden) paused = true;
  dialog.showModal();
}
function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}
for (const dialog of document.querySelectorAll("dialog")) {
  dialog.addEventListener("close", () => {
    if (game && !$("play").hidden) {
      paused = dialog.wasPaused;
      updateOverlay();
    }
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      closeDialog(dialog);
  });
}
for (const button of document.querySelectorAll("[data-close]"))
  button.addEventListener("click", () => closeDialog(button.closest("dialog")));
function action(button, fn) {
  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    try {
      await fn();
    } catch (error) {
      toast(error.message);
    } finally {
      button.disabled = false;
    }
  });
}
$("enter-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("enter-error").textContent = "";
  $("enter-button").disabled = true;
  try {
    const { player: nextPlayer } = await api("/auth/enter", "POST", {
      username: $("username").value,
    });
    setPlayer(nextPlayer);
    best = 0;
    await resumeLatest();
  } catch (error) {
    $("enter-error").textContent = error.message;
  } finally {
    $("enter-button").disabled = false;
  }
});
action($("resume-button"), resumeLatest);
action($("player-button"), () => openDialog("account-dialog"));
$("pause-button").addEventListener("click", () => {
  if (!game || game.gameOver || saveBlocked) return;
  paused = !paused;
  updateOverlay();
  if (paused) save().catch((e) => toast(e.message));
});
$("overlay-button").addEventListener("click", () => {
  if (saveBlocked) return location.reload();
  if (game.gameOver) return openName("create");
  paused = false;
  updateOverlay();
});
action($("save-button"), async () => {
  const wasPaused = paused;
  paused = true;
  updateOverlay();
  try {
    await save();
    showHome();
    toast("Saved.");
  } catch (e) {
    paused = wasPaused;
    updateOverlay();
    throw e;
  }
});
action($("logout-button"), async () => {
  const wasPaused = paused;
  paused = true;
  try {
    await save();
    await api("/auth/logout", "POST", {});
    closeDialog($("account-dialog"));
    game?.destroy();
    game = null;
    current = null;
    best = 0;
    setPlayer(null);
    showHome();
    $("username").value = "";
    toast("Saved and signed out.");
  } catch (error) {
    paused = wasPaused;
    throw error;
  }
});
function openName(mode) {
  nameMode = mode;
  $("name-title").textContent = mode === "create" ? "New game" : "Rename game";
  $("name-submit").textContent = mode === "create" ? "Play" : "Save";
  $("pile-name").value =
    mode === "create" ? `Pile ${games.length + 1}` : current.name;
  $("name-error").textContent = "";
  openDialog("name-dialog");
}
action($("new-button"), async () => {
  await save();
  await loadGames();
  openName("create");
});
action($("rename-button"), () => openName("rename"));
action($("piles-new-button"), () => {
  closeDialog($("piles-dialog"));
  openName("create");
});
$("name-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("name-submit").disabled = true;
  try {
    await save();
    const name = $("pile-name").value.trim();
    if (!name) throw new Error("Give your pile a name.");
    if (nameMode === "create") {
      const { game: record } = await api("/games", "POST", { name });
      closeDialog($("name-dialog"));
      start(record);
    } else {
      const result = await api(`/games/${current.id}`, "PATCH", {
        name,
        revision: current.revision,
      });
      current = result.game;
      safeDraft();
      updateHud();
      closeDialog($("name-dialog"));
      toast("Renamed.");
    }
  } catch (error) {
    $("name-error").textContent = error.message;
  } finally {
    $("name-submit").disabled = false;
  }
});
async function showPiles() {
  const wasPaused = paused;
  paused = true;
  try {
    await save();
    await loadGames();
    renderPiles();
    paused = wasPaused;
    openDialog("piles-dialog");
  } catch (e) {
    paused = wasPaused;
    updateOverlay();
    throw e;
  }
}
function renderPiles() {
  const list = $("piles-list");
  list.replaceChildren();
  if (!games.length) {
    const empty = document.createElement("p");
    empty.textContent = "No saved games.";
    list.append(empty);
  }
  for (const pile of games) {
    const row = document.createElement("div");
    row.className = "pile-row";
    const open = document.createElement("button");
    open.className = "pile-open";
    const name = document.createElement("strong");
    name.textContent = pile.name;
    const meta = document.createElement("small");
    meta.textContent = `${pile.score.toLocaleString()} points · ${pile.gameOver ? "Finished" : "In progress"} · ${new Date(pile.updated_at).toLocaleDateString()}`;
    open.append(name, meta);
    action(open, async () => {
      await save();
      const record = (await api(`/games/${pile.id}`)).game;
      closeDialog($("piles-dialog"));
      start(record);
    });
    const remove = document.createElement("button");
    remove.className = "pile-delete";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete ${pile.name}`);
    action(remove, () => {
      deleteTarget = pile;
      closeDialog($("piles-dialog"));
      $("delete-copy").textContent =
        `Delete “${pile.name}” and all its progress? This can’t be undone.`;
      openDialog("delete-dialog");
    });
    row.append(open, remove);
    list.append(row);
  }
}
action($("piles-button"), showPiles);
action($("home-piles"), showPiles);
action($("delete-confirm"), async () => {
  if (!deleteTarget) return;
  await save();
  await api(`/games/${deleteTarget.id}`, "DELETE", {});
  removeDraft(deleteTarget.id);
  if (current?.id === deleteTarget.id) {
    game?.destroy();
    game = null;
    current = null;
    showHome();
  }
  deleteTarget = null;
  closeDialog($("delete-dialog"));
  await loadGames();
  renderPiles();
  openDialog("piles-dialog");
  toast("Deleted.");
});
function aim(event) {
  if (!game) return;
  const rect = canvas.getBoundingClientRect();
  game.setAim(((event.clientX - rect.left) / rect.width) * C.width);
}
canvas.addEventListener("pointermove", aim);
canvas.addEventListener("pointerdown", (event) => {
  if (
    !game ||
    paused ||
    $("play").hidden ||
    document.querySelector("dialog[open]")
  )
    return;
  event.preventDefault();
  canvas.focus({ preventScroll: true });
  aim(event);
  game.drop();
});
canvas.addEventListener("keydown", (event) => {
  if (
    !game ||
    paused ||
    game.gameOver ||
    document.querySelector("dialog[open]")
  )
    return;
  if (["ArrowLeft", "ArrowRight", " ", "Enter"].includes(event.key)) {
    event.preventDefault();
    if (event.key === "ArrowLeft") game.setAim(game.aim - 15);
    else if (event.key === "ArrowRight") game.setAim(game.aim + 15);
    else game.drop();
  }
});
function drawPoop(level, x, y, radius, angle = 0, alpha = 1) {
  const sprite = sprites[level];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;
  if (sprite.complete && sprite.naturalWidth)
    ctx.drawImage(sprite, -radius, -radius, radius * 2, radius * 2);
  else {
    ctx.fillStyle = C.levels[level].color;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, C.width, C.height);
  if (!game) return;
  ctx.strokeStyle = game.dangerTime > 0 ? "#dc7054" : "#e7c19599";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, C.dangerLine);
  ctx.lineTo(C.width, C.dangerLine);
  ctx.stroke();
  ctx.setLineDash([]);
  if (!game.gameOver && !paused) {
    game.setAim(game.aim);
    ctx.strokeStyle = "#78573233";
    ctx.setLineDash([3, 8]);
    ctx.beginPath();
    ctx.moveTo(game.aim, 65);
    ctx.lineTo(game.aim, C.height);
    ctx.stroke();
    ctx.setLineDash([]);
    drawPoop(
      game.current,
      game.aim,
      34,
      C.levels[game.current].radius,
      0,
      game.time - game.dropAt < 500 ? 0.3 : 0.9,
    );
  }
  for (const body of game.bodies())
    drawPoop(
      body.poop.level,
      body.position.x,
      body.position.y,
      C.levels[body.poop.level].radius,
      body.angle,
    );
  for (const effect of game.effects) {
    const progress = (game.time - effect.start) / 900;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = "#352719";
    ctx.font = "bold 22px Georgia";
    ctx.textAlign = "center";
    ctx.fillText(`+${effect.points}`, effect.x, effect.y - 25 - progress * 45);
    ctx.restore();
  }
}
function frame(now) {
  const delta = Math.min(50, now - (lastFrame || now));
  lastFrame = now;
  if (
    game &&
    !paused &&
    !document.hidden &&
    !$("play").hidden &&
    !document.querySelector("dialog[open]")
  ) {
    accumulator += delta;
    while (accumulator >= 1000 / 60) {
      game.step(1000 / 60);
      accumulator -= 1000 / 60;
    }
  } else accumulator = 0;
  if (!$("play").hidden) draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(safeDraft, 1000);
setInterval(() => {
  if (game && !saveBlocked) save().catch(() => {});
}, 5000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && game) {
    paused = true;
    safeDraft();
    updateOverlay();
    save().catch(() => {});
  }
});
window.addEventListener("pagehide", () => {
  safeDraft();
  save().catch(() => {});
});
window.addEventListener("online", () => {
  if (game && !saveBlocked)
    save()
      .then(() => toast("Back online. Saved."))
      .catch((e) => toast(e.message));
});
(async () => {
  try {
    const result = await api("/auth/me");
    setPlayer(result.player);
    await loadGames();
  } catch (error) {
    if (error.status !== 401)
      toast("Couldn’t connect right now. Please try again.");
  }
})();
