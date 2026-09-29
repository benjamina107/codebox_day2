const { createHash } = require("node:crypto");
const db = require("../db/supabase");
const COOKIE = "poop_session";
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
function readToken(req) {
  const bearer = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
    req.get("Authorization") || "",
  );
  if (bearer) return bearer[1];
  const cookie = (req.get("Cookie") || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE}=`));
  const token = cookie?.slice(COOKIE.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token || "") ? token : null;
}
async function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token)
    return res.status(401).json({ error: "Sign in to save your pile." });
  const { data, error } = await db
    .from("poop_sessions")
    .select("poop_players(id, username)")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) return next(error);
  if (!data?.poop_players)
    return res
      .status(401)
      .json({ error: "Enter your username to come back to your pile." });
  req.player = data.poop_players;
  next();
}
function setSession(req, res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
}
module.exports = { requireAuth, readToken, hashToken, setSession, COOKIE };
