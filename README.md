# Cribbage Coach

Cribbage Coach is an Expo + React Native teaching app where learners count their own points before the app reveals the answer.

## Stack

- Expo + React Native + TypeScript for iOS, Android, and web.
- Plain TypeScript scoring engine in `src/game`.
- XState is included for the next game-flow layer: deal, discard, peg, count hand, count crib.
- Expo SQLite is included for local-first progress tracking.
- Vitest covers the scoring rules.

## Getting Started

```bash
npm install
npm run start
```

Run scoring tests:

```bash
npm run test
```

## Project Shape

- `app/` contains Expo Router screens.
- `src/game/` contains framework-independent cribbage rules.
- `src/components/` contains reusable app UI.
- `src/data/` contains early lesson/practice hands.
