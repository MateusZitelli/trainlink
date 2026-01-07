# TrainLink

An offline-first workout tracker and training planner built as a Progressive Web App.

You can use it [here](https://mateuszitelli.github.io/trainlink/) or check [my previous session](https://mateuszitelli.github.io/trainlink/#2nZfbbts4EIbfhdcuwPPBd0n2VKCLFk3vFoWg2GosrCNnJbntIsi775BDnWjLsRa9MMKS3wxn_hmOXsh3suYr8kzWL2RL1n-9kIqsyafjfk9WpIAFcpvXD8V-n_1S5Nt9-a2F9Y9V8e6mfsruy20xXv_wb1k9Zh-Kx-zuWO8bWPkjrx67tc952RSw9mVXPu6ym-32uGkPNfn6uuqMNrvU6G_gSHb_zzH3-G7xtqg2u-xTXTRN9i77s9iWx6fs97p89i6AoV9_tkXVlIfKexCtPURrA-V9tdmXVXGB1nsGd_Wo4Fl37H1VFXV2W26K5yZcFzbc5Q_7Ivt8eC6yj9-LegeRyb7UuKV3yu87VJuiauu8hb_7WHU7fRy2hx8VeBNQN22bb3ZPcAA23bd5tfURvcv33zCkDTgKrpJdSF9L1nRFSvD6TOJ-kjUz2ijlpHBawMa_If3ws4H_UCvyg6yNXXkhwNqRrKXwIbgSqZixVAekRiSggMgkkHuk4AuQWnOtWUAyOmF6C8AE6QJTswVMy7nzp0-YnMrABHuemVx9TvMdWDOuuIzOTkNq0Ve8v13MFYILIQLXZ8xz4Qe4WpgRWOulYKcd5eAigCWC0V_Jx4FwSXDf5HLhOMADVyEXeCHA46RJOuWeNo-BqBznLIYAfBxCoCZqNVPiueYzMLWiyoArwDSg2oFpwfX-9ku8NFBTCokSGEAErherQCLeW7glXlpjrcEcdV4CBqAOY4leqkRUl7yErDMFCfFeAmokJ2D1Xiq5wEtBuXMG89N5iRKKsK7mwcLokJDcJeG91F3jSQ11yozU2Gl8NIYrGLxClEMS6Gu788iOtVxjqHwpj2QXlRwNJRVy3SWcNU7E3jbRn8NLxDaUsBdfglFQkI-Sb0uTSzhsy1HnSbCuugODPHATeylU4qB4_w707LTlLb8DN84paHbTOwzyP9WXP2QVZ-r8yzCZK-IRQwWlVHgNjVo4xgpAo4SbJFhvUOGwkBCe4WGM1GCrvwWbexpnsMrCP3TWvzCjxGrsilh8NnkXLlOlUsLFV3xKFV6ss0_uydw1EK2FThvb4qRamUCVxPcg8XOeqCinkGEMKHSdEdH_2QdUpL17nsis7JqihZ_RrfmEmHTFC0RFtfV5AKIv6KFxx8klKtdOgclsPAZamFZ80_faxFrrtGnH2mTJIzhP1NQpkPuZMMb3KgLZ1T7CrCJlnK1GxAHV1c1Qp3CICwZv8XmRXhr1O4KjEhSrcOCYli3zguvNz_SC62xowaWNwZq2hlhtaMMlCllmxFFqveCG4sPRVNJx7SX5WGSCCcpE7Brd-IvTGbQfDBYq08w0o7c_m0bWuObc-oI6mYmjraiLmaAttCVBzqiCaYaYwwzFNjvzsbDMmJWCqzjxoDHQhrcVJ9Lz5f2_bMGrxARD6UVVYE9CNZgueENRWahDxRwVr19XpPGf9nn3fQ3fibVfOPlECt8WycdyiOP5eT9sT8fMsH9-cgj5uO7xD1vPvFTBQtJ1w1rSlMLa24URbnF9UoD6-vof) to see how strong I am.

## Features

### Workout Planning
- Create multiple training days (Push, Pull, Legs, etc.)
- Add exercises from a database of 1000+ exercises
- Drag-and-drop reordering of exercises and days

### Session Logging
- Log sets with weight, reps, and difficulty
- Real-time rest timer with audio/vibration alerts
- Drag sets between sessions or reorder within sessions
- Undo deleted sets

### Intelligent Predictions
- Cycle detection for repeating exercise patterns
- Drop set trend analysis
- Historical pattern matching for exercise sequences
- Per-exercise default rest times

### Session Sharing
- Generate shareable URLs for completed workouts
- Compare sessions with previous workouts
- View progress metrics and set breakdowns

### Exercise Database
- 1000+ exercises with images and instructions
- Filter by muscle group, equipment, difficulty, and more
- Full-text search

### Offline-First
- All data stored locally in URL hash + localStorage
- Installable as standalone PWA
- Works without internet connection

## Tech Stack

- React 19 + TypeScript
- Tailwind CSS
- Vite + PWA plugin
- @hello-pangea/dnd for drag-and-drop

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
```

## Build

```bash
npm run build
```
