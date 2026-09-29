const { test } = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config({ quiet: true });
test(
  "Supabase username sessions, game CRUD, ownership, revision conflicts, and logout",
  { skip: process.env.RUN_DB_TESTS !== "1" },
  async () => {
    const app = require("../src/app");
    const db = require("../src/db/supabase");
    const { initialState } = require("../src/services/gameState");
    const server = await new Promise((resolve) => {
      const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const createdPlayers = [];
    async function request(path, method = "GET", data, cookie) {
      const res = await fetch(base + path, {
        method,
        headers: {
          ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: data !== undefined ? JSON.stringify(data) : undefined,
      });
      return {
        status: res.status,
        cookie: res.headers.get("set-cookie")?.split(";")[0],
        body: res.status === 204 ? null : await res.json(),
      };
    }
    try {
      const home = await fetch(`http://127.0.0.1:${server.address().port}/home`);
      assert.equal(home.status, 200);
      assert.match(await home.text(), /id="enter-form"/);
      const oldHome = await fetch(
        `http://127.0.0.1:${server.address().port}/index.html`,
        { redirect: "manual" },
      );
      assert.equal(oldHome.status, 302);
      assert.equal(oldHome.headers.get("location"), "/home");
      const anonymousGame = await fetch(
        `http://127.0.0.1:${server.address().port}/game`,
        { redirect: "manual" },
      );
      assert.equal(anonymousGame.status, 302);
      assert.equal(anonymousGame.headers.get("location"), "/home");
      const bypass = await fetch(
        `http://127.0.0.1:${server.address().port}/game.html`,
      );
      assert.equal(bypass.status, 404);
      assert.equal((await request("/health")).status, 200);
      assert.equal((await request("/games")).status, 401);
      assert.equal((await request("/auth/enter", "POST", null)).status, 400);
      assert.equal(
        (await request("/auth/enter", "POST", { username: "<script>" })).status,
        400,
      );
      const username = `test_${Date.now()}`;
      const a = await request("/auth/enter", "POST", { username });
      assert.equal(a.status, 201);
      assert.ok(a.cookie);
      const authorizedGame = await fetch(
        `http://127.0.0.1:${server.address().port}/game`,
        { headers: { Cookie: a.cookie }, redirect: "manual" },
      );
      assert.equal(authorizedGame.status, 200);
      assert.match(await authorizedGame.text(), /id="board"/);
      assert.equal(authorizedGame.headers.get("cache-control"), "no-store");
      createdPlayers.push(a.body.player.id);
      const b = await request("/auth/enter", "POST", {
        username: `${username}_b`,
      });
      assert.equal(b.status, 201);
      createdPlayers.push(b.body.player.id);
      const existing = await request("/auth/enter", "POST", {
        username: username.toUpperCase(),
      });
      assert.equal(existing.status, 200);
      assert.equal(existing.body.player.id, a.body.player.id);
      const created = await request(
        "/games",
        "POST",
        { name: "Test pile" },
        a.cookie,
      );
      assert.equal(created.status, 201);
      const id = created.body.game.id;
      const state = {
        ...initialState(),
        score: 40,
        current: 1,
        highestLevel: 9,
        next: 2,
        poops: [
          {
            id: "poop1",
            level: 9,
            x: 125.1,
            y: 340.2,
            vx: 1,
            vy: 2,
            angle: 0.2,
            angularVelocity: 0.03,
            placementPending: true,
          },
        ],
      };
      const updated = await request(
        `/games/${id}`,
        "PATCH",
        { name: "Renamed", state, revision: 0 },
        a.cookie,
      );
      assert.equal(updated.status, 200);
      assert.equal(updated.body.game.revision, 1);
      assert.equal(
        (
          await request(
            `/games/${id}`,
            "PATCH",
            { state, revision: 0 },
            a.cookie,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await request(
            `/games/${id}`,
            "PATCH",
            { state: { ...state, score: -5 }, revision: 1 },
            a.cookie,
          )
        ).status,
        400,
      );
      const resumed = await request(
        `/games/${id}`,
        "GET",
        undefined,
        existing.cookie,
      );
      assert.equal(resumed.status, 200);
      assert.deepEqual(resumed.body.game.state, state);
      assert.equal(resumed.body.game.name, "Renamed");
      const listed = await request("/games", "GET", undefined, existing.cookie);
      assert.equal(listed.body.games[0].score, 40);
      assert.equal(listed.body.games[0].count, 1);
      for (const [method, data] of [
        ["GET", undefined],
        ["PATCH", { state, revision: 1 }],
        ["DELETE", {}],
      ]) {
        assert.equal(
          (await request(`/games/${id}`, method, data, b.cookie)).status,
          404,
        );
      }
      assert.equal(
        (await request("/games", "GET", undefined, b.cookie)).body.games.length,
        0,
      );
      assert.equal(
        (await request(`/games/${id}`, "DELETE", {}, existing.cookie)).status,
        204,
      );
      assert.equal(
        (await request(`/games/${id}`, "GET", undefined, a.cookie)).status,
        404,
      );
      assert.equal(
        (await request("/auth/logout", "POST", {}, existing.cookie)).status,
        204,
      );
      assert.equal(
        (await request("/auth/me", "GET", undefined, existing.cookie)).status,
        401,
      );
      const signedOutGame = await fetch(
        `http://127.0.0.1:${server.address().port}/game`,
        { headers: { Cookie: existing.cookie }, redirect: "manual" },
      );
      assert.equal(signedOutGame.status, 302);
      assert.equal(
        (await request("/auth/me", "GET", undefined, a.cookie)).status,
        200,
      );
    } finally {
      if (createdPlayers.length) {
        const { error } = await db
          .from("poop_players")
          .delete()
          .in("id", createdPlayers);
        if (error) throw error;
      }
      await new Promise((resolve) => server.close(resolve));
    }
  },
);
