# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Rahulboss7788/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Rahulboss7788/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks 226 pre-token DeFi protocols by an implied value derived only from a sealed DefiLlama snapshot (TVL, seven-day growth, age with no token, chain breadth), and gives each one a seven-step farm plan with costs and times. The board covers the whole 40-protocol watchlist plus every other rankable pre-token protocol below its floor. The dashboard is a static page that renders with no network: a sortable, filterable board, a detail view for every protocol with its model breakdown, a compare view that sets any two protocols side by side with the larger figure in each row marked, and a live-token view set aside with market caps. Implied values are the entry's own claim, never a price, and nothing here predicts whether or when a token launches.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

Node 22.18 or later, standard library only. `main.ts` reads the snapshot, writes `board.json`, `data.js` and `dossier.json` to the output directory, and copies `dashboard/` and `screenshots/` there.

## Check it

```sh
node scripts/verify.mjs
```

The self-test runs `main.ts` on the snapshot and checks every invariant the gate enforces — 226 rows, ranks 1–226, non-increasing implied values, 226 distinct values, the whole 40-protocol watchlist covered, farm steps in range, and the dashboard data and dossier files in place — printing PASS or FAIL per check and exiting non-zero on any failure.

## How the model works

`implied = round(tvl_usd x 0.25 x (1 + clamp(change_7d, -60, 120) / 100 x 0.5) x (0.6 + min(age_days, 1095) / 1095 x 0.4) x (1 + 0.02 x min(chains - 1, 10)))`

TVL is the size of the economy a token would price. Seven-day growth is momentum, clamped so one wild week cannot carry a row. Maturity is how long the protocol has run with no token. Breadth is how many chains its TVL sits on. The same function scores every row; no protocol name is special-cased.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
