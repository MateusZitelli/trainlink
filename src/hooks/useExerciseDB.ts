import { useState, useCallback, useEffect, useRef } from 'react'

const EXERCISES_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const CACHE_KEY = 'workout-exercise-cache-v3'
const DB_CACHE_KEY = 'workout-free-exercise-db-v2'
const FILTER_OPTIONS_KEY = 'workout-filter-options'

// Filter options - will be populated from data
export interface FilterOptions {
  levels: string[]
  categories: string[]
  forces: string[]
  mechanics: string[]
  equipment: string[]
  muscles: string[]
}

// Default empty options
let filterOptions: FilterOptions = loadFilterOptions() ?? {
  levels: [],
  categories: [],
  forces: [],
  mechanics: [],
  equipment: [],
  muscles: [],
}

function loadFilterOptions(): FilterOptions | null {
  try {
    const stored = localStorage.getItem(FILTER_OPTIONS_KEY)
    if (stored) return JSON.parse(stored) as FilterOptions
  } catch {
    // Ignore
  }
  return null
}

function saveFilterOptions(options: FilterOptions) {
  try {
    localStorage.setItem(FILTER_OPTIONS_KEY, JSON.stringify(options))
  } catch {
    // Ignore
  }
}

function deriveFilterOptions(exercises: Exercise[]): FilterOptions {
  const levels = new Set<string>()
  const categories = new Set<string>()
  const forces = new Set<string>()
  const mechanics = new Set<string>()
  const equipment = new Set<string>()
  const muscles = new Set<string>()

  for (const ex of exercises) {
    if (ex.level) levels.add(ex.level)
    if (ex.category) categories.add(ex.category)
    if (ex.force) forces.add(ex.force)
    if (ex.mechanic) mechanics.add(ex.mechanic)
    if (ex.equipment) equipment.add(ex.equipment)
    ex.targetMuscles.forEach(m => muscles.add(m))
    ex.secondaryMuscles.forEach(m => muscles.add(m))
  }

  // Sort for consistent UI
  const levelOrder = ['beginner', 'intermediate', 'expert']
  const sortedLevels = [...levels].sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b))

  return {
    levels: sortedLevels,
    categories: [...categories].sort(),
    forces: [...forces].sort(),
    mechanics: [...mechanics].sort(),
    equipment: [...equipment].sort(),
    muscles: [...muscles].sort(),
  }
}

export function getFilterOptions(): FilterOptions {
  return filterOptions
}

export interface Exercise {
  exerciseId: string
  name: string
  equipment: string | null
  category: string
  targetMuscles: string[]
  secondaryMuscles: string[]
  imageUrls: string[]
  instructions: string[]
  level: string
  force: string | null
  mechanic: string | null
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

export interface SearchFilters {
  query?: string
  level?: string
  category?: string
  force?: string
  mechanic?: string
  equipment?: string
  muscle?: string
}

// Convert raw exercise to our format
function mapExercise(raw: RawExercise): Exercise {
  return {
    exerciseId: raw.id,
    name: raw.name,
    equipment: raw.equipment,
    category: raw.category,
    targetMuscles: raw.primaryMuscles,
    secondaryMuscles: raw.secondaryMuscles,
    imageUrls: raw.images.map(img => `${IMAGE_BASE_URL}${img}`),
    instructions: raw.instructions,
    level: raw.level,
    force: raw.force,
    mechanic: raw.mechanic,
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

// Initialize filter options from cached exercises if available
if (allExercises.length > 0 && filterOptions.levels.length === 0) {
  filterOptions = deriveFilterOptions(allExercises)
}

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

    // Derive and cache filter options
    filterOptions = deriveFilterOptions(allExercises)
    saveFilterOptions(filterOptions)

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

  const search = useCallback(async (filters: SearchFilters) => {
    const query = filters.query?.toLowerCase().trim() ?? ''
    searchTermRef.current = query

    // Check if any filter is active
    const hasFilters = query || filters.level || filters.category ||
                       filters.force || filters.mechanic ||
                       filters.equipment || filters.muscle

    if (!hasFilters) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Ensure DB is loaded
      const exercises = dbLoaded ? allExercises : await loadExerciseDB()

      // Check if search term changed while loading
      if (searchTermRef.current !== query) return

      // Filter exercises
      let filtered = exercises

      // Text search across multiple fields
      if (query) {
        filtered = filtered.filter(ex =>
          ex.name.toLowerCase().includes(query) ||
          ex.targetMuscles.some(m => m.toLowerCase().includes(query)) ||
          ex.secondaryMuscles.some(m => m.toLowerCase().includes(query)) ||
          (ex.equipment?.toLowerCase().includes(query) ?? false) ||
          ex.category.toLowerCase().includes(query) ||
          (ex.force?.toLowerCase().includes(query) ?? false) ||
          (ex.mechanic?.toLowerCase().includes(query) ?? false) ||
          ex.level.toLowerCase().includes(query)
        )
      }

      // Apply filters
      if (filters.level) {
        filtered = filtered.filter(ex => ex.level === filters.level)
      }

      if (filters.category) {
        filtered = filtered.filter(ex => ex.category === filters.category)
      }

      if (filters.force) {
        filtered = filtered.filter(ex => ex.force === filters.force)
      }

      if (filters.mechanic) {
        filtered = filtered.filter(ex => ex.mechanic === filters.mechanic)
      }

      if (filters.equipment) {
        filtered = filtered.filter(ex => ex.equipment === filters.equipment)
      }

      if (filters.muscle) {
        const muscle = filters.muscle.toLowerCase()
        filtered = filtered.filter(ex =>
          ex.targetMuscles.some(m => m.toLowerCase() === muscle) ||
          ex.secondaryMuscles.some(m => m.toLowerCase() === muscle)
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

  // Get all exercises (for browsing)
  const getAllExercises = useCallback((): Exercise[] => {
    void cacheVersion
    return allExercises
  }, [cacheVersion])

  return {
    results,
    loading,
    error,
    search,
    getExercise,
    fetchExercise,
    fetchExercises,
    getAllExercises,
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
