# Run the Playoffs

A polished NBA Playoffs bracket app for the 2025-26 postseason built with Next.js, React, TypeScript, and Tailwind CSS. It supports the full NBA format:

- Play-In Tournament for seeds 7 through 10
- 16-team playoff bracket
- Best-of-seven series picks for every playoff round
- Pool leaderboard scoring
- Official-logo team presentation
- Real pool creation, invite links, and persistent multiplayer entries
- Click-to-view submitted brackets from the leaderboard
- Pool-level stats and pick percentages
- Official NBA live scoreboard sync hook for postseason result updates

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma
- Neon Postgres for durable multiplayer persistence

## Project structure

```text
app/
  api/app-state/route.ts         Bootstrap route for pools, entries, and shared results
  api/entries/[entryId]/route.ts Entry update route for picks, submission, and tiebreakers
  api/live-scoreboard/route.ts   Official NBA scoreboard adapter
  api/pools/route.ts             Pool creation route
  api/pools/join/route.ts        Join-by-invite route
  api/pools/[poolId]/entries     Entry creation route
  api/results/sync/route.ts      Shared official-results sync route
  globals.css                    App-wide visual system
  layout.tsx                     Fonts + metadata
  page.tsx                       Entry point

components/
  BracketApp.tsx                 App shell, pool controls, leaderboard, sync
  BracketBoard.tsx               Bracket UI, play-in cards, series cards

lib/nba-playoffs/
  api.ts                         Client-side API helpers
  data.ts                        Teams, seeds, logos, matchup structure, seed data
  engine.ts                      Bracket resolution, scoring, live-result merging
  server-store.ts                Prisma-backed pool, entry, and results service layer
  storage.ts                     Client identity/preferences storage
  types.ts                       Shared TypeScript models

prisma/
  schema.prisma                  Persistent pool, participant, entry, and results schema
```

## Environment setup

The production app is configured for Neon-backed Postgres.

- `DATABASE_URL` should be the pooled Neon connection string used by the running app
- `DIRECT_URL` should be the direct Neon connection string used by Prisma CLI commands such as `db:push` and `db:migrate`

Example:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST-PGBOUNCER.neon.tech/DBNAME?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require"
```

## How the bracket works

- `lib/nba-playoffs/data.ts` seeds the East and West play-in matchups exactly as provided.
- Play-in winners and losers feed the correct 7-seed and 8-seed slots.
- First-round, semifinal, conference-final, and Finals pairings are all defined as slot references.
- When a user selects a winner, downstream rounds resolve automatically.
- If an earlier pick changes, invalid downstream picks are cleared automatically so the bracket never drifts into an impossible state.

## Scoring logic

Defined in `lib/nba-playoffs/data.ts` and applied in `lib/nba-playoffs/engine.ts`.

- Play-In is single-elimination
- Correct play-in winner: `2` points
- Correct Round 1 winner: `5` points
- Correct Round 1 exact length bonus: `+2` points
- Correct conference semifinal winner: `10` points
- Correct conference semifinal exact length bonus: `+3` points
- Correct conference finals winner: `20` points
- Correct conference finals exact length bonus: `+5` points
- Correct NBA Finals winner: `40` points
- Correct NBA Finals exact length bonus: `+10` points
- Exact series-length bonus is awarded only when the correct series winner was also picked
- Perfect bracket total: `216` points

Each scored entry also exposes:

- Total points earned so far
- Max possible points still available from live picks
- Correct winners
- Exact series lengths
- Pending picks that are still alive
- Finals tiebreaker guess and closeness once the Finals clincher is complete

The leaderboard ranks by:

1. Total points
2. Closest Finals tiebreaker guess
3. Most correct series winners
4. Most exact series lengths
5. Earliest submitted entry

The Finals tiebreaker is the combined points scored in the championship-clinching NBA Finals game. Example: a `108-101` clincher means the correct tiebreaker answer is `209`.

## How results are updated

There are two supported result flows:

### 1. Official live sync

- The app exposes `GET /api/live-scoreboard`
- That route fetches the official NBA live scoreboard from:
  - `https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`
- `mergeLiveGamesIntoResults()` in `lib/nba-playoffs/engine.ts` tries to match official games to seeded play-in or playoff pairings
- When a game matches a postseason pairing, the app updates:
  - individual game scores
  - series wins
  - advancing team when a series reaches four wins
- Once shared results are updated, every pool leaderboard recalculates from those real results

### 2. Seed/manual structure

- `createSeededResultsState()` in `lib/nba-playoffs/data.ts` creates the initial results object
- If you want to seed manual progress, this is the place to add game logs or completed series before runtime
- The UI automatically re-renders the bracket from whatever sits in `results`

## How to modify teams, seeds, or logos

Everything lives in `lib/nba-playoffs/data.ts`.

- Teams: update the `teams` array
- Seeds: update each team’s `defaultSeed`
- Logos: update the `logo` field for any team
- Play-in structure: update `playInGames`
- Playoff structure: update `seriesDefinitions`
- Visual ordering in the bracket: update `BRACKET_LAYOUT`

The app currently uses official NBA CDN logo URLs.

## How pools work

- Pools are stored in Neon Postgres through Prisma, so they persist across refreshes and across separate browser sessions
- Each pool has a real name, optional description, lock time, invite code, creator, and participant membership list
- Creating a pool also creates the commissioner’s first entry
- Joining a pool can create an entry immediately or just add the participant so they can create an entry later
- Entries store display name, entry name, picks, series-length picks, tiebreaker guess, submission timestamp, and computed score fields
- All picks lock at the pool lock time before the first play-in game begins
- Entries can be edited until the pool lock time
- After lock time, picks cannot be changed, new entries cannot be created, and scoring continues automatically as results update
- Clicking a leaderboard entry loads that submitted bracket into the main bracket view, along with its score, max possible, breakdown, and pick statuses

## How invite links work

- A pool invite link uses `?pool=<inviteCode>`
- A direct bracket link uses `?pool=<inviteCode>&entry=<entryId>`
- Opening an invite link loads that pool into the private-link join flow
- A private invite link is enough to join the pool directly
- The same token also works as a manual join code from the Join Pool screen
- Invite links no longer expose the full pool leaderboard before the viewer joins the pool
- Direct bracket links still expose the specific submitted entry they point to
- Invite codes can be custom-set at pool creation time or auto-generated by the backend

## How data is stored

- Browser `localStorage` stores only lightweight client preferences:
  - generated client id
  - current pool selection
  - current entry selection
  - current bracket view
  - last-used display name
- All real multiplayer data lives in Prisma models backed by Neon Postgres:
  - `Participant`
  - `Pool`
  - `PoolParticipant`
  - `Entry`
  - `SharedState`
- Stored in Neon:
  - pools and pool metadata
  - pool memberships
  - every entry
  - full bracket winner picks and series-length picks in `Entry.picksJson`
  - Finals tiebreaker guesses
  - submission timestamps
  - cached scoring fields (`score`, `correctWinners`, `exactLengths`, `pending`)
  - shared official results state used to recompute standings
- Local only:
  - client identity token in `localStorage`
  - selected pool / selected entry / current view preferences
  - last used display name convenience value

This is designed for durable cloud-hosted multiplayer. Locally, you can still point the same env vars at a Neon development branch and test with multiple browser sessions.

## How to test multiple users locally

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env` and paste your Neon pooled and direct URLs
3. Initialize the database schema with `npm run db:push`
4. Start the app with `npm run dev`
5. Open one browser window as the commissioner and create a pool
6. Open a second browser profile or incognito window, paste the invite link, and join with a different display name
7. Submit entries from both sessions and watch the leaderboard update after refresh or poll

Because the client identity is stored in localStorage, different browser profiles act like different participants without a full auth system.

## Development

```bash
npm install
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

## Verification

The project was verified with:

```bash
npm run db:push
npm run lint
npm run build
```

## Notes

- The app is seeded with the 2025-26 postseason structure provided in the brief.
- If the official live feed contains regular-season games for these teams, they are fetched but only postseason pairings are merged into bracket results.
- On Vercel, set both `DATABASE_URL` and `DIRECT_URL` before deploying.
