const express = require("express");
const db = require("../db/supabase");
const { requireAuth } = require("../middleware/auth");
const {
  initialState,
  validateState,
  cleanState,
} = require("../services/gameState");
const router = express.Router();
const fields = "id, name, state, revision, created_at, updated_at";
router.use(requireAuth);
router.param("id", (req, res, next, id) => {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return res.status(404).json({ error: "Pile not found." });
  next();
});
const validName = (name) =>
  typeof name === "string" &&
  name.trim().length > 0 &&
  name.trim().length <= 40;
router.get("/", async (req, res) => {
  const { data, error } = await db
    .from("poop_games")
    .select("id, name, revision, created_at, updated_at, state")
    .eq("player_id", req.player.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  res.json({
    games: data.map(({ state, ...game }) => ({
      ...game,
      score: state.score,
      gameOver: state.gameOver,
      count: state.poops.length,
    })),
  });
});
router.post("/", async (req, res) => {
  if (!validName(req.body.name))
    return res
      .status(400)
      .json({ error: "Give your pile a name of 1–40 characters." });
  const { data, error } = await db
    .from("poop_games")
    .insert({
      player_id: req.player.id,
      name: req.body.name.trim(),
      state: initialState(),
    })
    .select(fields)
    .single();
  if (error) throw error;
  res.status(201).json({ game: data });
});
router.get("/:id", async (req, res) => {
  const { data, error } = await db
    .from("poop_games")
    .select(fields)
    .eq("player_id", req.player.id)
    .eq("id", req.params.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: "Pile not found." });
  res.json({ game: data });
});
router.patch("/:id", async (req, res) => {
  const { state, name, revision } = req.body;
  if (
    !Number.isSafeInteger(revision) ||
    revision < 0 ||
    (state === undefined && name === undefined) ||
    (name !== undefined && !validName(name)) ||
    (state !== undefined && !validateState(state))
  )
    return res
      .status(400)
      .json({ error: "Invalid pile name, game state, or revision." });
  const update = {
    updated_at: new Date().toISOString(),
    revision: revision + 1,
  };
  if (name !== undefined) update.name = name.trim();
  if (state !== undefined) update.state = cleanState(state);
  const { data, error } = await db
    .from("poop_games")
    .update(update)
    .eq("player_id", req.player.id)
    .eq("id", req.params.id)
    .eq("revision", revision)
    .select(fields)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { data: exists, error: lookupError } = await db
      .from("poop_games")
      .select("id")
      .eq("player_id", req.player.id)
      .eq("id", req.params.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    return res
      .status(exists ? 409 : 404)
      .json({
        error: exists
          ? "This pile changed in another tab. Reload to resume the latest save."
          : "Pile not found.",
      });
  }
  res.json({ game: data });
});
router.delete("/:id", async (req, res) => {
  const { data, error } = await db
    .from("poop_games")
    .delete()
    .eq("player_id", req.player.id)
    .eq("id", req.params.id)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return res.status(404).json({ error: "Pile not found." });
  res.status(204).end();
});
module.exports = router;
