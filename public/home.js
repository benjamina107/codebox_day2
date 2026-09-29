"use strict";
const $ = (id) => document.getElementById(id);
let player = null;

async function api(path, method = "GET", data) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error || "Something went wrong. Try again.");
    error.status = response.status;
    throw error;
  }
  return result;
}
function showPlayer(nextPlayer) {
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
$("enter-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  $("enter-error").textContent = "";
  $("enter-button").disabled = true;
  try {
    await api("/auth/enter", "POST", { username: $("username").value });
    location.assign("/game");
  } catch (error) {
    $("enter-error").textContent = error.message;
    $("enter-button").disabled = false;
  }
});
$("resume-button").addEventListener("click", () => location.assign("/game"));
$("home-piles").addEventListener("click", () =>
  location.assign("/game?view=saves"),
);
$("player-button").addEventListener("click", () =>
  $("account-dialog").showModal(),
);
$("account-dialog").querySelector("[data-close]").addEventListener("click", () =>
  $("account-dialog").close(),
);
$("logout-button").addEventListener("click", async () => {
  $("logout-button").disabled = true;
  try {
    await api("/auth/logout", "POST", {});
    $("account-dialog").close();
    $("username").value = "";
    showPlayer(null);
  } catch (error) {
    $("enter-error").textContent = error.message;
  } finally {
    $("logout-button").disabled = false;
  }
});
(async () => {
  try {
    const result = await api("/auth/me");
    showPlayer(result.player);
  } catch (error) {
    if (error.status !== 401) $("enter-error").textContent =
      "Couldn’t connect right now. Please try again.";
  }
})();
