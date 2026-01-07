# TrainLink

An offline-first workout tracker and training planner built as a Progressive Web App.

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
