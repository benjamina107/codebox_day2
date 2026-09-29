const express = require("express");
const { randomBytes } = require("node:crypto");
const db = require("../db/supabase");
const {
  requireAuth,
  readToken,
  hashToken,
  setSession,
  COOKIE,
} = require("../middleware/auth");
const router = express.Router();
router.get("/me", requireAuth, (req, res) => res.json({ player: req.player }));
router.post("/enter", async (req, res) => {
  const username =
    typeof req.body?.username === "string"
      ? req.body.username.trim().toLowerCase()
      : "";
  if (!/^[a-z0-9_]{3,20}$/.test(username))
    return res
      .status(400)
      .json({
        error: "Use 3–20 letters, numbers, or underscores for your username.",
      });
  let { data: player, error } = await db
    .from("poop_players")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  let created = false;
  if (!player) {
    const result = await db
      .from("poop_players")
      .insert({ username })
      .select("id, username")
      .single();
    if (result.error?.code === "23505") {
      const lookup = await db
        .from("poop_players")
        .select("id, username")
        .eq("username", username)
        .single();
      if (lookup.error) throw lookup.error;
      player = lookup.data;
    } else {
      if (result.error) throw result.error;
      player = result.data;
      created = true;
    }
  }
  const token = randomBytes(32).toString("base64url");
  const { error: sessionError } = await db
    .from("poop_sessions")
    .insert({
      player_id: player.id,
      token_hash: hashToken(token),
      expires_at: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });
  if (sessionError) throw sessionError;
  // Retire this browser's previous session, while leaving other devices signed in.
  const previous = readToken(req);
  if (previous)
    await db
      .from("poop_sessions")
      .delete()
      .eq("token_hash", hashToken(previous));
  setSession(req, res, token);
  res.status(created ? 201 : 200).json({ player, created });
});
router.post("/logout", async (req, res) => {
  const token = readToken(req);
  if (token) {
    const { error } = await db
      .from("poop_sessions")
      .delete()
      .eq("token_hash", hashToken(token));
    if (error) throw error;
  }
  res.clearCookie(COOKIE, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });
  res.status(204).end();
});
module.exports = router;
