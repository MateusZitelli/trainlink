import type { Pack } from './types'

export const packs: Pack[] = [
  // 1. PPL Classic (Push Pull Legs)
  {
    id: 'ppl-classic',
    name: 'PPL - Push Pull Legs',
    description: 'Classic 6-day bodybuilding split with push, pull, and leg days',
    difficulty: 'intermediate',
    frequency: '6x/week',
    days: [
      {
        name: 'Push A',
        description: 'Chest and shoulder focused push day',
        exerciseNames: [
          'Barbell Bench Press - Medium Grip',
          'Incline Dumbbell Press',
          'Dumbbell Shoulder Press',
          'Side Lateral Raise',
          'Triceps Pushdown',
          'Dumbbell One-Arm Triceps Extension',
        ],
        tags: ['push', 'chest', 'shoulders', 'triceps'],
      },
      {
        name: 'Pull A',
        description: 'Deadlift focused pull day',
        exerciseNames: [
          'Barbell Deadlift',
          'Bent Over Barbell Row',
          'Lat Pulldown - Wide Grip',
          'Face Pull',
          'Barbell Curl',
          'Hammer Curls',
        ],
        tags: ['pull', 'back', 'biceps'],
      },
      {
        name: 'Legs A',
        description: 'Squat focused leg day',
        exerciseNames: [
          'Barbell Squat',
          'Romanian Deadlift With Dumbbells',
          'Leg Press',
          'Lying Leg Curls',
          'Standing Calf Raises',
        ],
        tags: ['legs', 'quadriceps', 'hamstrings'],
      },
      {
        name: 'Push B',
        description: 'Shoulder focused push day',
        exerciseNames: [
          'Dumbbell Shoulder Press',
          'Incline Dumbbell Press',
          'Dumbbell Flyes',
          'Side Lateral Raise',
          'Dips - Triceps Version',
          'Lying Triceps Press',
        ],
        tags: ['push', 'shoulders', 'chest', 'triceps'],
      },
      {
        name: 'Pull B',
        description: 'Pull-up focused pull day',
        exerciseNames: [
          'Pullups',
          'Seated Cable Rows',
          'Reverse Flyes',
          'Barbell Shrug',
          'Preacher Curl',
          'Reverse Barbell Curl',
        ],
        tags: ['pull', 'back', 'biceps'],
      },
      {
        name: 'Legs B',
        description: 'Front squat focused leg day',
        exerciseNames: [
          'Front Barbell Squat',
          'Dumbbell Lunges',
          'Leg Extensions',
          'Lying Leg Curls',
          'Standing Calf Raises',
        ],
        tags: ['legs', 'quadriceps', 'hamstrings'],
      },
    ],
  },

  // 2. Starting Strength
  {
    id: 'starting-strength',
    name: 'Starting Strength',
    description: 'Proven beginner barbell program focused on compound movements',
    difficulty: 'beginner',
    frequency: '3x/week',
    days: [
      {
        name: 'Day A',
        description: 'Squat, bench, and deadlift',
        exerciseNames: [
          'Barbell Squat',
          'Barbell Bench Press - Medium Grip',
          'Barbell Deadlift',
        ],
        tags: ['compound', 'strength'],
      },
      {
        name: 'Day B',
        description: 'Squat, press, and row',
        exerciseNames: [
          'Barbell Squat',
          'Standing Military Press',
          'Bent Over Barbell Row',
        ],
        tags: ['compound', 'strength'],
      },
    ],
  },

  // 3. StrongLifts 5x5
  {
    id: 'stronglifts-5x5',
    name: 'StrongLifts 5x5',
    description: 'Simple 5x5 program for building strength and muscle',
    difficulty: 'beginner',
    frequency: '3x/week',
    days: [
      {
        name: 'Workout A',
        description: 'Squat, bench, and row',
        exerciseNames: [
          'Barbell Squat',
          'Barbell Bench Press - Medium Grip',
          'Bent Over Barbell Row',
        ],
        tags: ['compound', 'strength', '5x5'],
      },
      {
        name: 'Workout B',
        description: 'Squat, press, and deadlift',
        exerciseNames: [
          'Barbell Squat',
          'Standing Military Press',
          'Barbell Deadlift',
        ],
        tags: ['compound', 'strength', '5x5'],
      },
    ],
  },

  // 4. Upper Lower Split
  {
    id: 'upper-lower',
    name: 'Upper Lower Split',
    description: 'Balanced 4-day split for strength and hypertrophy',
    difficulty: 'intermediate',
    frequency: '4x/week',
    days: [
      {
        name: 'Upper A',
        description: 'Horizontal push/pull focus',
        exerciseNames: [
          'Barbell Bench Press - Medium Grip',
          'Bent Over Barbell Row',
          'Dumbbell Shoulder Press',
          'Pullups',
          'Dips - Triceps Version',
          'Barbell Curl',
        ],
        tags: ['upper', 'push', 'pull'],
      },
      {
        name: 'Lower A',
        description: 'Squat focused',
        exerciseNames: [
          'Barbell Squat',
          'Romanian Deadlift With Dumbbells',
          'Leg Press',
          'Lying Leg Curls',
          'Standing Calf Raises',
        ],
        tags: ['lower', 'legs'],
      },
      {
        name: 'Upper B',
        description: 'Vertical push/pull focus',
        exerciseNames: [
          'Incline Dumbbell Press',
          'Seated Cable Rows',
          'Side Lateral Raise',
          'Face Pull',
          'Lying Triceps Press',
          'Hammer Curls',
        ],
        tags: ['upper', 'push', 'pull'],
      },
      {
        name: 'Lower B',
        description: 'Deadlift focused',
        exerciseNames: [
          'Barbell Deadlift',
          'Front Barbell Squat',
          'Dumbbell Lunges',
          'Leg Extensions',
          'Seated Calf Raise',
        ],
        tags: ['lower', 'legs'],
      },
    ],
  },

  // 5. Full Body Beginner
  {
    id: 'fullbody-beginner',
    name: 'Full Body Beginner',
    description: 'Great starting program for new lifters',
    difficulty: 'beginner',
    frequency: '3x/week',
    days: [
      {
        name: 'Full Body A',
        description: 'Squat and bench focus',
        exerciseNames: [
          'Barbell Squat',
          'Barbell Bench Press - Medium Grip',
          'Bent Over Barbell Row',
          'Plank',
        ],
        tags: ['full body', 'compound'],
      },
      {
        name: 'Full Body B',
        description: 'Deadlift and press focus',
        exerciseNames: [
          'Barbell Deadlift',
          'Standing Military Press',
          'Lat Pulldown - Wide Grip',
          'Dumbbell Lunges',
        ],
        tags: ['full body', 'compound'],
      },
      {
        name: 'Full Body C',
        description: 'Front squat and incline focus',
        exerciseNames: [
          'Front Barbell Squat',
          'Incline Dumbbell Press',
          'Seated Cable Rows',
          'Lying Leg Raises',
        ],
        tags: ['full body', 'compound'],
      },
    ],
  },

  // 6. Bro Split
  {
    id: 'bro-split',
    name: 'Bro Split',
    description: 'Classic 5-day bodybuilding split targeting one muscle group per day',
    difficulty: 'intermediate',
    frequency: '5x/week',
    days: [
      {
        name: 'Chest',
        description: 'All chest exercises',
        exerciseNames: [
          'Barbell Bench Press - Medium Grip',
          'Incline Dumbbell Press',
          'Cable Crossover',
          'Dips - Chest Version',
          'Push-Ups',
        ],
        tags: ['chest', 'push'],
      },
      {
        name: 'Back',
        description: 'All back exercises',
        exerciseNames: [
          'Barbell Deadlift',
          'Pullups',
          'Bent Over Barbell Row',
          'Lat Pulldown - Wide Grip',
          'Face Pull',
        ],
        tags: ['back', 'pull'],
      },
      {
        name: 'Shoulders',
        description: 'All shoulder exercises',
        exerciseNames: [
          'Standing Military Press',
          'Side Lateral Raise',
          'Front Dumbbell Raise',
          'Reverse Flyes',
          'Barbell Shrug',
        ],
        tags: ['shoulders', 'deltoids'],
      },
      {
        name: 'Arms',
        description: 'Biceps and triceps',
        exerciseNames: [
          'Barbell Curl',
          'Hammer Curls',
          'Lying Triceps Press',
          'Triceps Pushdown',
          'Preacher Curl',
        ],
        tags: ['arms', 'biceps', 'triceps'],
      },
      {
        name: 'Legs',
        description: 'All leg exercises',
        exerciseNames: [
          'Barbell Squat',
          'Leg Press',
          'Romanian Deadlift With Dumbbells',
          'Lying Leg Curls',
          'Standing Calf Raises',
        ],
        tags: ['legs', 'quadriceps', 'hamstrings'],
      },
    ],
  },

  // 7. PHUL (Power Hypertrophy Upper Lower)
  {
    id: 'phul',
    name: 'PHUL',
    description: 'Power Hypertrophy Upper Lower - combines strength and hypertrophy',
    difficulty: 'advanced',
    frequency: '4x/week',
    days: [
      {
        name: 'Upper Power',
        description: 'Heavy upper body compounds',
        exerciseNames: [
          'Barbell Bench Press - Medium Grip',
          'Bent Over Barbell Row',
          'Standing Military Press',
          'Pullups',
          'Barbell Curl',
        ],
        tags: ['upper', 'power', 'strength'],
      },
      {
        name: 'Lower Power',
        description: 'Heavy lower body compounds',
        exerciseNames: [
          'Barbell Squat',
          'Barbell Deadlift',
          'Leg Press',
          'Lying Leg Curls',
          'Standing Calf Raises',
        ],
        tags: ['lower', 'power', 'strength'],
      },
      {
        name: 'Upper Hypertrophy',
        description: 'Higher rep upper body work',
        exerciseNames: [
          'Incline Dumbbell Press',
          'Seated Cable Rows',
          'Side Lateral Raise',
          'Triceps Pushdown',
          'Hammer Curls',
        ],
        tags: ['upper', 'hypertrophy'],
      },
      {
        name: 'Lower Hypertrophy',
        description: 'Higher rep lower body work',
        exerciseNames: [
          'Front Barbell Squat',
          'Romanian Deadlift With Dumbbells',
          'Leg Extensions',
          'Lying Leg Curls',
          'Dumbbell Lunges',
        ],
        tags: ['lower', 'hypertrophy'],
      },
    ],
  },

  // 8. Arnold Split
  {
    id: 'arnold-split',
    name: 'Arnold Split',
    description: "Arnold Schwarzenegger's classic 6-day high volume split",
    difficulty: 'advanced',
    frequency: '6x/week',
    days: [
      {
        name: 'Chest & Back A',
        description: 'Antagonist supersets for chest and back',
        exerciseNames: [
          'Barbell Bench Press - Medium Grip',
          'Incline Dumbbell Press',
          'Pullups',
          'Bent Over Barbell Row',
          'Dumbbell Flyes',
          'Lat Pulldown - Wide Grip',
        ],
        tags: ['chest', 'back', 'supersets'],
      },
      {
        name: 'Shoulders & Arms A',
        description: 'Complete shoulder and arm development',
        exerciseNames: [
          'Standing Military Press',
          'Side Lateral Raise',
          'Barbell Curl',
          'Lying Triceps Press',
          'Hammer Curls',
        ],
        tags: ['shoulders', 'arms'],
      },
      {
        name: 'Legs A',
        description: 'Squat focused leg day',
        exerciseNames: [
          'Barbell Squat',
          'Leg Press',
          'Lying Leg Curls',
          'Leg Extensions',
          'Standing Calf Raises',
        ],
        tags: ['legs'],
      },
      {
        name: 'Chest & Back B',
        description: 'More antagonist supersets',
        exerciseNames: [
          'Incline Dumbbell Press',
          'Pullups',
          'Seated Cable Rows',
          'Dips - Chest Version',
          'Straight-Arm Pulldown',
        ],
        tags: ['chest', 'back', 'supersets'],
      },
      {
        name: 'Shoulders & Arms B',
        description: 'More shoulder and arm work',
        exerciseNames: [
          'Dumbbell Shoulder Press',
          'Reverse Flyes',
          'Preacher Curl',
          'Dips - Triceps Version',
          'Concentration Curls',
        ],
        tags: ['shoulders', 'arms'],
      },
      {
        name: 'Legs B',
        description: 'Deadlift focused leg day',
        exerciseNames: [
          'Front Barbell Squat',
          'Romanian Deadlift With Dumbbells',
          'Dumbbell Lunges',
          'Seated Leg Curl',
          'Standing Calf Raises',
        ],
        tags: ['legs'],
      },
    ],
  },

  // 9. Minimalist Strength
  {
    id: 'minimalist-strength',
    name: 'Minimalist Strength',
    description: 'Efficient 2-day program for busy schedules',
    difficulty: 'beginner',
    frequency: '2x/week',
    days: [
      {
        name: 'Day A',
        description: 'Squat and horizontal push/pull',
        exerciseNames: [
          'Barbell Squat',
          'Barbell Bench Press - Medium Grip',
          'Bent Over Barbell Row',
        ],
        tags: ['compound', 'strength', 'minimalist'],
      },
      {
        name: 'Day B',
        description: 'Deadlift and vertical push/pull',
        exerciseNames: [
          'Barbell Deadlift',
          'Standing Military Press',
          'Pullups',
        ],
        tags: ['compound', 'strength', 'minimalist'],
      },
    ],
  },

  // 10. Hypertrophy Focus
  {
    id: 'hypertrophy-focus',
    name: 'Hypertrophy Focus',
    description: 'High volume program optimized for muscle growth',
    difficulty: 'intermediate',
    frequency: '4x/week',
    days: [
      {
        name: 'Push',
        description: 'Chest, shoulders, and triceps volume',
        exerciseNames: [
          'Barbell Bench Press - Medium Grip',
          'Incline Dumbbell Press',
          'Dumbbell Shoulder Press',
          'Side Lateral Raise',
          'Dumbbell Flyes',
          'Triceps Pushdown',
        ],
        tags: ['push', 'hypertrophy'],
      },
      {
        name: 'Pull',
        description: 'Back and biceps volume',
        exerciseNames: [
          'Bent Over Barbell Row',
          'Lat Pulldown - Wide Grip',
          'Seated Cable Rows',
          'Face Pull',
          'Barbell Curl',
          'Hammer Curls',
        ],
        tags: ['pull', 'hypertrophy'],
      },
      {
        name: 'Legs',
        description: 'Complete leg development',
        exerciseNames: [
          'Barbell Squat',
          'Romanian Deadlift With Dumbbells',
          'Leg Press',
          'Lying Leg Curls',
          'Leg Extensions',
          'Standing Calf Raises',
        ],
        tags: ['legs', 'hypertrophy'],
      },
      {
        name: 'Full Upper',
        description: 'Upper body pump day',
        exerciseNames: [
          'Incline Dumbbell Press',
          'Pullups',
          'Dumbbell Shoulder Press',
          'Reverse Flyes',
          'Dips - Triceps Version',
          'Preacher Curl',
        ],
        tags: ['upper', 'hypertrophy'],
      },
    ],
  },

  // 11. Calisthenics Foundation
  {
    id: 'calisthenics-foundation',
    name: 'Calisthenics Foundation',
    description: 'Bodyweight-based program for building functional strength',
    difficulty: 'beginner',
    frequency: '3x/week',
    days: [
      {
        name: 'Upper Push',
        description: 'Pushing movements',
        exerciseNames: [
          'Push-Ups',
          'Dips - Triceps Version',
          'Pike Push Press',
          'Diamond Push-Ups',
        ],
        tags: ['calisthenics', 'push', 'bodyweight'],
      },
      {
        name: 'Upper Pull',
        description: 'Pulling movements',
        exerciseNames: [
          'Pullups',
          'Chin-Up',
          'Inverted Row',
          'Scapular Pull-Up',
        ],
        tags: ['calisthenics', 'pull', 'bodyweight'],
      },
      {
        name: 'Lower & Core',
        description: 'Legs and core',
        exerciseNames: [
          'Bodyweight Squat',
          'Dumbbell Lunges',
          'Standing Calf Raises',
          'Plank',
          'Lying Leg Raises',
        ],
        tags: ['calisthenics', 'legs', 'core', 'bodyweight'],
      },
    ],
  },

  // 12. Powerlifting Prep
  {
    id: 'powerlifting-prep',
    name: 'Powerlifting Prep',
    description: 'Competition preparation program focusing on the big three lifts',
    difficulty: 'advanced',
    frequency: '4x/week',
    days: [
      {
        name: 'Squat Focus',
        description: 'Squat variations and accessories',
        exerciseNames: [
          'Barbell Squat',
          'Front Barbell Squat',
          'Leg Press',
          'Leg Extensions',
        ],
        tags: ['powerlifting', 'squat'],
      },
      {
        name: 'Bench Focus',
        description: 'Bench variations and accessories',
        exerciseNames: [
          'Barbell Bench Press - Medium Grip',
          'Close-Grip Barbell Bench Press',
          'Incline Dumbbell Press',
          'Dips - Triceps Version',
        ],
        tags: ['powerlifting', 'bench'],
      },
      {
        name: 'Deadlift Focus',
        description: 'Deadlift variations and accessories',
        exerciseNames: [
          'Barbell Deadlift',
          'Romanian Deadlift With Dumbbells',
          'Bent Over Barbell Row',
          'Lat Pulldown - Wide Grip',
        ],
        tags: ['powerlifting', 'deadlift'],
      },
      {
        name: 'Accessory',
        description: 'Weak point and supplemental work',
        exerciseNames: [
          'Standing Military Press',
          'Pullups',
          'Face Pull',
          'Plank',
        ],
        tags: ['powerlifting', 'accessory'],
      },
    ],
  },

  // 13. Hyperstretch - Stretch-Mediated Hypertrophy
  {
    id: 'hyperstretch',
    name: 'Hyperstretch',
    description: 'Maximize muscle growth with exercises that load muscles in the stretched position. Focus on full ROM and controlled eccentrics.',
    difficulty: 'intermediate',
    frequency: '3x/week',
    days: [
      {
        name: 'Stretch: Push',
        description: 'Chest flyes, overhead triceps, deep dips. Emphasize the stretched position.',
        exerciseNames: [
          // Chest - deep stretch at bottom
          'Dumbbell Flyes',
          'Incline Dumbbell Press',
          'Dips - Chest Version',
          'Cable Crossover',
          // Triceps - overhead = long head stretched
          'Dumbbell One-Arm Triceps Extension',
          'Lying Triceps Press',
          // Shoulders - stretch on rear/side delts
          'Side Lateral Raise',
          'Reverse Flyes',
        ],
        tags: ['push', 'stretch', 'chest', 'triceps', 'shoulders'],
      },
      {
        name: 'Stretch: Pull',
        description: 'Pullovers, stretched curls, full ROM rows. Control the eccentric.',
        exerciseNames: [
          // Lats - full stretch at top
          'Straight-Arm Pulldown',
          'Lat Pulldown - Wide Grip',
          'Seated Cable Rows',
          'Pullups',
          // Biceps - stretched at bottom/behind
          'Incline Dumbbell Curl',
          'Preacher Curl',
          'Concentration Curls',
          // Rear delts
          'Face Pull',
        ],
        tags: ['pull', 'stretch', 'back', 'biceps', 'lats'],
      },
      {
        name: 'Stretch: Legs',
        description: 'RDLs, deep lunges, full ROM extensions. Maximum stretch under load.',
        exerciseNames: [
          // Hamstrings - stretched at hip
          'Romanian Deadlift With Dumbbells',
          'Seated Leg Curl',
          'Lying Leg Curls',
          // Quads - deep stretch
          'Dumbbell Lunges',
          'Leg Extensions',
          'Front Barbell Squat',
          // Calves - full stretch at bottom
          'Standing Calf Raises',
          'Seated Calf Raise',
        ],
        tags: ['legs', 'stretch', 'hamstrings', 'quads', 'calves'],
      },
    ],
  },
]
