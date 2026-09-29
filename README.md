# Shitty Game

A Suika-style poop merging game based on the supplied Figma concept. Uses your six original images, real Matter.js physics, an Express server, and the existing hosted Supabase database.

## Run locally

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env  # Only if you do not already have .env
npm run dev
```

Open **http://localhost:3000**. The existing local `.env` is already configured; its secret values stay out of Git and the browser.

```dotenv
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your-server-secret-key
NODE_ENV=development
```

There is no frontend build step. Express serves the site, the bundled physics library, and the API from the same origin.

## How to play

Move to aim, then click to drop. On touch screens, tap the drop position. With the board focused, use the left/right arrows to aim and Space or Enter to drop.

Two matching poops merge into the next size: **brown → green → red → black → gold → rainbow**. Two rainbows clear and award 640 points. Each merge awards points; smaller colors are randomly queued. A pile that stays above the line for two seconds after the grace period ends the run. Pause, start another run, or resume an earlier pile.

## Username access and saved state

Enter a username (3–20 letters, numbers, or underscores). A new name creates a player; an existing name opens that player's saved games. Names are case-insensitive. Your username is all you need when coming back from another browser.

The server creates a random session token and sets it in an HTTP-only, same-site cookie. Only its SHA-256 hash is stored in Supabase. Sessions last one year and sign-out revokes the current session. Other devices remain signed in.

This is **username-only identity**, as requested: anyone who enters the same username can access that player's games. It is not password-verified account ownership or Supabase Auth.

Game saves include every poop's ID, color/type, x/y position, velocity, rotation, and angular velocity, plus score, current/next pieces, and game-over state. The site saves to Supabase every five seconds, when paused, and when taking a break or signing out. It attempts a save when the page becomes hidden, and keeps a browser draft every second for interrupted/offline saves. A matching draft is restored only when its revision still matches the database. A stale tab is paused instead of overwriting a newer save. Browser-close delivery is best effort; use **Save & take a break** for a confirmed save.

## CRUD for the project requirements

| Requirement             | In the site                                    | API                                                                 |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Create                  | Fresh start → name a new pile                  | `POST /api/games`                                                   |
| Read                    | Your saved piles → open/resume                 | `GET /api/games`, `GET /api/games/:id`                              |
| Update                  | Autosave, manual save, rename                  | `PATCH /api/games/:id`                                              |
| Delete                  | Your saved piles → Flush → confirm             | `DELETE /api/games/:id`                                             |
| Username/session access | Enter username, return automatically, sign out | `POST /api/auth/enter`, `GET /api/auth/me`, `POST /api/auth/logout` |
| Database health         | Hosting health check                           | `GET /api/health`                                                   |

All game endpoints require a valid session, filter by the session's player ID, and validate incoming state. Updates require the current `revision`, returning `409` if another tab already saved. The secret database key is server-only. The game tables have RLS enabled and access revoked from browser database roles; only the server's service role can access them. Scores are client-calculated and intended for casual play, not a competitive leaderboard.

The new `poop_players`, `poop_sessions`, and `poop_games` tables are already applied to the configured **codebox_bootcamp** Supabase project. The SQL is recorded in `supabase/migrations/`. The earlier tutorial's `users` migration is historical; the game no longer uses its table or API routes. For a different Supabase project, apply the migrations in order using the Supabase CLI, or run the two poop-game SQL files in order in its SQL editor.

## Deploy when ready

Use a host that runs Node.js servers (for example, Render or Railway). A static-only host cannot run this Express API.

- Install/build command: `npm ci`
- Start command: `npm start`
- Runtime: Node.js 22+
- Environment: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `NODE_ENV=production`
- Allow your host to set `PORT`.
- Set `TRUST_PROXY` to your provider's documented proxy-hop count if needed (commonly `1`).
- Health-check path: `/api/health`

Serve production over HTTPS so the secure session cookie works. No database files need to be hosted with the app; saves live in Supabase. Do not put the secret key in public files or frontend environment variables. No deployment has been performed.

## Check the implementation

```bash
npm test
npm run test:integration
npm audit
```

`npm test` runs physics and state validation tests. `npm run test:integration` additionally uses the configured Supabase database to check username re-entry, restored state, every CRUD operation, cross-player isolation, revision conflicts, and logout. It creates uniquely named disposable players, then deletes them and their dependent sessions/saves.

## Main files

- `public/index.html`, `public/style.css`: the homepage, game layout, and dialogs.
- `public/app.js`: controls, canvas drawing, autosave, and saved-pile management.
- `public/physics.js`: falling, collisions, merging, scoring, and overflow logic.
- `public/config.js`: the six images, sizes, colors, and game dimensions.
- `public/assets/`: the game-serving copies of your original images.
- `images_poop/`: your untouched source images.
- `src/app.js`, `src/server.js`: Express application and server entry point.
- `src/routes/`: username/session access and owned-game CRUD.
- `src/services/gameState.js`: server-side game-state validation.
- `supabase/migrations/`: database schema.

The interface follows the Figma layout: a centered title, username field and round play button, plus a centered board with minimal controls. Fonts are served locally from `public/fonts/`; their Apache and SIL Open Font License files are included there.
