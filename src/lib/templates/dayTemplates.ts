import type { DayTemplate } from './types'

export const dayTemplates: DayTemplate[] = [
  // Push days
  {
    id: 'push-beginner',
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps workout',
    difficulty: 'beginner',
    exerciseNames: [
      'Barbell Bench Press - Medium Grip',
      'Dumbbell Shoulder Press',
      'Triceps Pushdown',
      'Push-Ups',
    ],
    tags: ['push', 'chest', 'shoulders', 'triceps'],
  },
  {
    id: 'push-intermediate',
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps with more volume',
    difficulty: 'intermediate',
    exerciseNames: [
      'Barbell Bench Press - Medium Grip',
      'Incline Dumbbell Press',
      'Dumbbell Shoulder Press',
      'Dumbbell Flyes',
      'Side Lateral Raise',
      'Triceps Pushdown',
    ],
    tags: ['push', 'chest', 'shoulders', 'triceps'],
  },

  // Pull days
  {
    id: 'pull-beginner',
    name: 'Pull Day',
    description: 'Back and biceps workout',
    difficulty: 'beginner',
    exerciseNames: [
      'Bent Over Barbell Row',
      'Lat Pulldown - Wide Grip',
      'Dumbbell Bicep Curl',
      'Face Pull',
    ],
    tags: ['pull', 'back', 'biceps'],
  },
  {
    id: 'pull-intermediate',
    name: 'Pull Day',
    description: 'Back and biceps with more volume',
    difficulty: 'intermediate',
    exerciseNames: [
      'Barbell Deadlift',
      'Bent Over Barbell Row',
      'Lat Pulldown - Wide Grip',
      'Seated Cable Rows',
      'Face Pull',
      'Barbell Curl',
      'Hammer Curls',
    ],
    tags: ['pull', 'back', 'biceps'],
  },

  // Leg days
  {
    id: 'legs-beginner',
    name: 'Leg Day',
    description: 'Quadriceps, hamstrings, and calves',
    difficulty: 'beginner',
    exerciseNames: [
      'Barbell Squat',
      'Leg Press',
      'Lying Leg Curls',
      'Standing Calf Raises',
    ],
    tags: ['legs', 'quadriceps', 'hamstrings', 'calves'],
  },
  {
    id: 'legs-intermediate',
    name: 'Leg Day',
    description: 'Complete leg development',
    difficulty: 'intermediate',
    exerciseNames: [
      'Barbell Squat',
      'Romanian Deadlift With Dumbbells',
      'Leg Press',
      'Leg Extensions',
      'Lying Leg Curls',
      'Standing Calf Raises',
    ],
    tags: ['legs', 'quadriceps', 'hamstrings', 'calves', 'glutes'],
  },

  // Full body
  {
    id: 'fullbody-beginner',
    name: 'Full Body',
    description: 'Complete body workout for beginners',
    difficulty: 'beginner',
    exerciseNames: [
      'Barbell Squat',
      'Barbell Bench Press - Medium Grip',
      'Bent Over Barbell Row',
      'Plank',
    ],
    tags: ['full body', 'compound'],
  },
  {
    id: 'fullbody-intermediate',
    name: 'Full Body',
    description: 'Balanced full body routine',
    difficulty: 'intermediate',
    exerciseNames: [
      'Barbell Squat',
      'Barbell Bench Press - Medium Grip',
      'Bent Over Barbell Row',
      'Dumbbell Shoulder Press',
      'Barbell Curl',
      'Triceps Pushdown',
    ],
    tags: ['full body', 'compound'],
  },

  // Upper body
  {
    id: 'upper-beginner',
    name: 'Upper Body',
    description: 'Chest, back, shoulders, and arms',
    difficulty: 'beginner',
    exerciseNames: [
      'Barbell Bench Press - Medium Grip',
      'Bent Over Barbell Row',
      'Dumbbell Shoulder Press',
      'Dumbbell Bicep Curl',
    ],
    tags: ['upper', 'chest', 'back', 'shoulders', 'arms'],
  },
  {
    id: 'upper-intermediate',
    name: 'Upper Body',
    description: 'Complete upper body development',
    difficulty: 'intermediate',
    exerciseNames: [
      'Barbell Bench Press - Medium Grip',
      'Bent Over Barbell Row',
      'Dumbbell Shoulder Press',
      'Pullups',
      'Dips - Triceps Version',
      'Barbell Curl',
    ],
    tags: ['upper', 'chest', 'back', 'shoulders', 'arms'],
  },

  // Lower body
  {
    id: 'lower-beginner',
    name: 'Lower Body',
    description: 'Legs and glutes workout',
    difficulty: 'beginner',
    exerciseNames: [
      'Barbell Squat',
      'Leg Press',
      'Lying Leg Curls',
      'Standing Calf Raises',
    ],
    tags: ['lower', 'legs', 'glutes'],
  },

  // Chest focus
  {
    id: 'chest-intermediate',
    name: 'Chest Day',
    description: 'Focused chest development',
    difficulty: 'intermediate',
    exerciseNames: [
      'Barbell Bench Press - Medium Grip',
      'Incline Dumbbell Press',
      'Decline Dumbbell Bench Press',
      'Dumbbell Flyes',
      'Push-Ups',
    ],
    tags: ['chest', 'push'],
  },

  // Back focus
  {
    id: 'back-intermediate',
    name: 'Back Day',
    description: 'Focused back development',
    difficulty: 'intermediate',
    exerciseNames: [
      'Barbell Deadlift',
      'Pullups',
      'Bent Over Barbell Row',
      'Lat Pulldown - Wide Grip',
      'Seated Cable Rows',
    ],
    tags: ['back', 'pull'],
  },

  // Arms focus
  {
    id: 'arms-intermediate',
    name: 'Arms Day',
    description: 'Biceps and triceps focus',
    difficulty: 'intermediate',
    exerciseNames: [
      'Barbell Curl',
      'Hammer Curls',
      'Preacher Curl',
      'Triceps Pushdown',
      'Lying Triceps Press',
      'Dips - Triceps Version',
    ],
    tags: ['arms', 'biceps', 'triceps'],
  },

  // Shoulders focus
  {
    id: 'shoulders-intermediate',
    name: 'Shoulders Day',
    description: 'Complete shoulder development',
    difficulty: 'intermediate',
    exerciseNames: [
      'Dumbbell Shoulder Press',
      'Side Lateral Raise',
      'Front Dumbbell Raise',
      'Reverse Flyes',
      'Barbell Shrug',
    ],
    tags: ['shoulders', 'deltoids'],
  },

  // Core focus
  {
    id: 'core-beginner',
    name: 'Core Day',
    description: 'Abdominal and core strength',
    difficulty: 'beginner',
    exerciseNames: [
      'Plank',
      'Crunches',
      'Lying Leg Raises',
      'Russian Twist',
    ],
    tags: ['core', 'abs'],
  },
]
