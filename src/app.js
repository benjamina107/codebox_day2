const express = require("express");
const path = require("node:path");
const { rateLimit } = require("express-rate-limit");
const authRoutes = require("./routes/auth");
const gameRoutes = require("./routes/games");
const errorHandler = require("./middleware/errorHandler");
const { requirePageAuth } = require("./middleware/auth");

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY)
  app.set("trust proxy", Number(process.env.TRUST_PROXY));
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("Referrer-Policy", "same-origin");
  res.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  );
  if (req.path.startsWith("/api/")) {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      (req.get("Sec-Fetch-Site") === "cross-site" ||
        !req.is("application/json"))
    ) {
      return res.status(403).json({ error: "Use a same-origin JSON request." });
    }
  }
  next();
});
app.use(express.json({ limit: "128kb" }));
app.use("/api", (req, res, next) => {
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    (!req.body || typeof req.body !== "object" || Array.isArray(req.body))
  ) {
    return res.status(400).json({ error: "Send a JSON object." });
  }
  next();
});
app.use(
  "/api/auth",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many sign-in attempts. Please try again in 15 minutes.",
    },
    skip: (req) => req.method === "GET",
  }),
  authRoutes,
);
app.use("/api/games", gameRoutes);
app.get("/api/health", async (req, res) => {
  const db = require("./db/supabase");
  const { error } = await db.from("poop_players").select("id").limit(1);
  res
    .status(error ? 503 : 200)
    .json({ status: error ? "unavailable" : "ok", database: !error });
});
app.use("/api", (req, res) =>
  res.status(404).json({ error: "API route not found." }),
);
app.get("/vendor/matter.min.js", (req, res) =>
  res.sendFile(require.resolve("matter-js/build/matter.min.js")),
);
app.get("/", (req, res) => res.redirect(302, "/home"));
app.get("/index.html", (req, res) => res.redirect(302, "/home"));
app.get("/home", (req, res) =>
  res.sendFile(path.join(__dirname, "../views/home.html")),
);
app.get("/game", requirePageAuth, (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "../views/game.html"));
});
app.use(express.static(path.join(__dirname, "../public")));
app.use(errorHandler);
module.exports = app;
