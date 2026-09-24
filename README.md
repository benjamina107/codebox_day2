# Codebox API

A small Express API backed by a hosted Supabase database. The existing JWT token script is for learning, not a login system.

## Project layout

- `src/server.js` loads configuration, registers middleware and routes, and starts Express.
- `src/routes/` holds HTTP handlers.
- `src/middleware/` holds JWT verification and error handling.
- `src/services/userService.js` handles user lookup and writes.
- `src/db/supabase.js` creates the server-only Supabase client.
- `supabase/migrations/` holds the database schema and sample users.
- `scripts/` holds local developer commands.

## Run the API

```bash
npm install
npm run dev
```

Set these values in the Git-ignored `.env` before starting:

```dotenv
PORT=3000
JWT_SECRET=<your-random-local-secret>
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SECRET_KEY=<your-server-secret-key>
```

The server secret key must stay on the server. The users table is defined in `supabase/migrations/` and has sample rows for Alex and Sam. The app requires a working hosted Supabase connection; it does not fall back to in-memory data. Restart the server after changing `.env`.

## Routes

| Method | Path | Auth | Success |
| --- | --- | --- | --- |
| GET | `/` | Public | `200` greeting |
| GET | `/api/health` | Public | `200` `{"status":"ok"}` |
| GET | `/api/users` | Public | `200` user list |
| GET | `/api/users/:id` | Public | `200` user, or `404` |
| GET | `/api/me` | JWT | `200` sample user, or `401` |
| POST | `/api/users` | JWT | `201` created user |
| PUT | `/api/users/:id` | JWT | `200` updated user, or `404` |
| DELETE | `/api/users/:id` | JWT | `204`, or `404` |

POST and PUT accept JSON such as `{"name":"Taylor"}`. A missing or blank name returns `400`. Generate a 15-minute sample JWT with `npm run token`; the script signs user ID 1 without checking credentials.
