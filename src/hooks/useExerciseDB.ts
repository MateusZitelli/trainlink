import { useState, useCallback, useEffect, useRef } from 'react'

const EXERCISES_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const CACHE_KEY = 'workout-exercise-cache-v2'
const DB_CACHE_KEY = 'workout-free-exercise-db'

export interface Exercise {
  exerciseId: string
  name: string
  equipments: string[]
  bodyParts: string[]
  exerciseType: string
  targetMuscles: string[]
  secondaryMuscles: string[]
  imageUrl?: string
  instructions?: string[]
  level?: string
  force?: string
  mechanic?: string
}

interface RawExercise {
  id: string
  name: string
  force: string | null
  level: string
  mechanic: string | null
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images: string[]
}

interface SearchParams {
  name?: string
  targetMuscles?: string
  equipments?: string
  bodyParts?: string
}

// Convert raw exercise to our format
function mapExercise(raw: RawExercise): Exercise {
  return {
    exerciseId: raw.id,
    name: raw.name,
    equipments: raw.equipment ? [raw.equipment] : [],
    bodyParts: raw.primaryMuscles, // Use primary muscles as body parts
    exerciseType: raw.category,
    targetMuscles: raw.primaryMuscles,
    secondaryMuscles: raw.secondaryMuscles,
    imageUrl: raw.images[0] ? `${IMAGE_BASE_URL}${raw.images[0]}` : undefined,
    instructions: raw.instructions,
    level: raw.level,
    force: raw.force ?? undefined,
    mechanic: raw.mechanic ?? undefined,
  }
}

// Load exercise cache from localStorage
function loadExerciseCache(): Map<string, Exercise> {
  try {
    const stored = localStorage.getItem(CACHE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, Exercise>
      return new Map(Object.entries(parsed))
    }
  } catch {
    // Ignore errors
  }
  return new Map()
}

// Save exercise cache to localStorage
function saveExerciseCache(cache: Map<string, Exercise>) {
  try {
    const obj = Object.fromEntries(cache)
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj))
  } catch {
    // Ignore errors (e.g., quota exceeded)
  }
}

// Load full DB from localStorage
function loadDBCache(): Exercise[] | null {
  try {
    const stored = localStorage.getItem(DB_CACHE_KEY)
    if (stored) {
      return JSON.parse(stored) as Exercise[]
    }
  } catch {
    // Ignore errors
  }
  return null
}

// Save full DB to localStorage
function saveDBCache(exercises: Exercise[]) {
  try {
    localStorage.setItem(DB_CACHE_KEY, JSON.stringify(exercises))
  } catch {
    // Ignore errors (e.g., quota exceeded)
  }
}

// Global state
const exerciseCache = loadExerciseCache()
let allExercises: Exercise[] = loadDBCache() ?? []
let dbLoading = false
let dbLoaded = allExercises.length > 0
const dbLoadCallbacks: (() => void)[] = []

// Load the full exercise database
async function loadExerciseDB(): Promise<Exercise[]> {
  if (dbLoaded) return allExercises
  if (dbLoading) {
    return new Promise(resolve => {
      dbLoadCallbacks.push(() => resolve(allExercises))
    })
  }

  dbLoading = true

  try {
    const response = await fetch(EXERCISES_URL)
    if (!response.ok) throw new Error('Failed to load exercise database')

    const rawData: RawExercise[] = await response.json()
    allExercises = rawData.map(mapExercise)

    // Cache all exercises
    allExercises.forEach(ex => exerciseCache.set(ex.exerciseId, ex))
    saveExerciseCache(exerciseCache)
    saveDBCache(allExercises)

    dbLoaded = true
    dbLoadCallbacks.forEach(cb => cb())
    dbLoadCallbacks.length = 0

    return allExercises
  } catch (err) {
    console.error('Failed to load exercise database:', err)
    return []
  } finally {
    dbLoading = false
  }
}

export function useExerciseDB() {
  const [results, setResults] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cacheVersion, setCacheVersion] = useState(0)
  const [dbReady, setDbReady] = useState(dbLoaded)
  const searchTermRef = useRef('')

  // Load DB on mount
  useEffect(() => {
    if (!dbLoaded) {
      loadExerciseDB().then(() => {
        setDbReady(true)
        setCacheVersion(v => v + 1)
      })
    }
  }, [])

  const search = useCallback(async (params: SearchParams) => {
    const searchTerm = params.name?.toLowerCase().trim() ?? ''
    searchTermRef.current = searchTerm

    if (!searchTerm && !params.targetMuscles && !params.equipments && !params.bodyParts) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Ensure DB is loaded
      const exercises = dbLoaded ? allExercises : await loadExerciseDB()

      // Check if search term changed while loading
      if (searchTermRef.current !== searchTerm) return

      // Filter exercises
      let filtered = exercises

      if (searchTerm) {
        filtered = filtered.filter(ex =>
          ex.name.toLowerCase().includes(searchTerm) ||
          ex.targetMuscles.some(m => m.toLowerCase().includes(searchTerm)) ||
          ex.equipments.some(e => e.toLowerCase().includes(searchTerm))
        )
      }

      if (params.targetMuscles) {
        const muscle = params.targetMuscles.toLowerCase()
        filtered = filtered.filter(ex =>
          ex.targetMuscles.some(m => m.toLowerCase().includes(muscle))
        )
      }

      if (params.equipments) {
        const equip = params.equipments.toLowerCase()
        filtered = filtered.filter(ex =>
          ex.equipments.some(e => e.toLowerCase().includes(equip))
        )
      }

      if (params.bodyParts) {
        const part = params.bodyParts.toLowerCase()
        filtered = filtered.filter(ex =>
          ex.bodyParts.some(b => b.toLowerCase().includes(part))
        )
      }

      setResults(filtered)
    } catch {
      setError('Search failed')
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const getExercise = useCallback((exerciseId: string): Exercise | null => {
    void cacheVersion // Depend on cache version for re-renders
    return exerciseCache.get(exerciseId) ?? null
  }, [cacheVersion])

  const fetchExercise = useCallback(async (exerciseId: string): Promise<Exercise | null> => {
    // Check cache first
    if (exerciseCache.has(exerciseId)) {
      return exerciseCache.get(exerciseId)!
    }

    // Load DB if needed
    if (!dbLoaded) {
      await loadExerciseDB()
      setCacheVersion(v => v + 1)
    }

    return exerciseCache.get(exerciseId) ?? null
  }, [])

  // Fetch multiple exercises at once
  const fetchExercises = useCallback(async (exerciseIds: string[]) => {
    const missing = exerciseIds.filter(id => !exerciseCache.has(id))
    if (missing.length === 0) return

    // Load DB to get all exercises
    if (!dbLoaded) {
      await loadExerciseDB()
      setCacheVersion(v => v + 1)
    }
  }, [])

  return {
    results,
    loading,
    error,
    search,
    getExercise,
    fetchExercise,
    fetchExercises,
    dbReady,
  }
}

// Debounce helper
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), delay)
  }
}
