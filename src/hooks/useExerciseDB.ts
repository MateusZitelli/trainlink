import { useState, useCallback, useEffect, useRef } from 'react'
import Fuse, { type IFuseOptions } from 'fuse.js'
import i18n from '../lib/i18n'

const EXERCISES_URL_EN = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const EXERCISES_URL_PT_BR = `${import.meta.env.BASE_URL}data/exercises-pt-br.json`
const IMAGE_BASE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'

function getExercisesUrl(): string {
  const lang = i18n.language
  if (lang === 'pt-BR' || lang === 'pt') {
    return EXERCISES_URL_PT_BR
  }
  return EXERCISES_URL_EN
}

function getCacheKey(base: string): string {
  const lang = i18n.language
  const langSuffix = lang === 'pt-BR' || lang === 'pt' ? '-pt-BR' : '-en'
  return base + langSuffix
}

const CACHE_KEY_BASE = 'workout-exercise-cache-v4'
const DB_CACHE_KEY_BASE = 'workout-free-exercise-db-v3'
const FILTER_OPTIONS_KEY = 'workout-filter-options-v2'

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
  ensureInitialized()
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
    const stored = localStorage.getItem(getCacheKey(CACHE_KEY_BASE))
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
    localStorage.setItem(getCacheKey(CACHE_KEY_BASE), JSON.stringify(obj))
  } catch {
    // Ignore errors (e.g., quota exceeded)
  }
}

// Load full DB from localStorage
function loadDBCache(): Exercise[] | null {
  try {
    const stored = localStorage.getItem(getCacheKey(DB_CACHE_KEY_BASE))
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
    localStorage.setItem(getCacheKey(DB_CACHE_KEY_BASE), JSON.stringify(exercises))
  } catch {
    // Ignore errors (e.g., quota exceeded)
  }
}

// Global state - per language (initialized lazily after i18n is ready)
let exerciseCache: Map<string, Exercise> | null = null
let allExercises: Exercise[] | null = null
let fuseInstance: Fuse<Exercise> | null = null
let dbLoading = false
let dbLoaded = false
let currentLanguage: string | null = null
const dbLoadCallbacks: (() => void)[] = []

// Fuse.js options for fuzzy search
const fuseOptions: IFuseOptions<Exercise> = {
  keys: [
    { name: 'name', weight: 2 },
    { name: 'targetMuscles', weight: 1.5 },
    { name: 'secondaryMuscles', weight: 1 },
    { name: 'equipment', weight: 1 },
    { name: 'category', weight: 1 },
    { name: 'force', weight: 0.8 },
    { name: 'mechanic', weight: 0.8 },
    { name: 'level', weight: 0.5 },
  ],
  threshold: 0.4,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 2,
}

// Lazy initialization - only load cache after i18n language is determined
function ensureInitialized() {
  if (currentLanguage === i18n.language && exerciseCache !== null) {
    return // Already initialized for current language
  }

  currentLanguage = i18n.language
  exerciseCache = loadExerciseCache()
  allExercises = loadDBCache() ?? []
  dbLoaded = (allExercises?.length ?? 0) > 0

  // Initialize filter options from cached exercises if available
  if (allExercises && allExercises.length > 0 && filterOptions.levels.length === 0) {
    filterOptions = deriveFilterOptions(allExercises)
  }

  // Initialize Fuse instance for fuzzy search
  if (allExercises && allExercises.length > 0) {
    fuseInstance = new Fuse(allExercises, fuseOptions)
  }
}

// Reset database state for language change
function resetDBState() {
  const newCache = loadExerciseCache()
  const newExercises = loadDBCache() ?? []

  currentLanguage = i18n.language

  // Only update if we have new cached data
  if (newExercises.length > 0) {
    exerciseCache = newCache
    allExercises = newExercises
    dbLoaded = true
    filterOptions = deriveFilterOptions(allExercises)
    fuseInstance = new Fuse(allExercises, fuseOptions)
  } else {
    // No cached data for new language - keep old cache and mark for reload
    // This prevents showing raw IDs while fetching new language
    dbLoaded = false
    fuseInstance = null
  }

  dbLoading = false
}

// Load the full exercise database
async function loadExerciseDB(): Promise<Exercise[]> {
  ensureInitialized()

  if (dbLoaded && allExercises) return allExercises
  if (dbLoading) {
    return new Promise(resolve => {
      dbLoadCallbacks.push(() => resolve(allExercises || []))
    })
  }

  dbLoading = true

  try {
    const exercisesUrl = getExercisesUrl()
    const response = await fetch(exercisesUrl)
    if (!response.ok) throw new Error('Failed to load exercise database')

    const rawData: RawExercise[] = await response.json()
    allExercises = rawData.map(mapExercise)

    // Cache all exercises
    if (exerciseCache) {
      allExercises.forEach(ex => exerciseCache!.set(ex.exerciseId, ex))
      saveExerciseCache(exerciseCache)
    }
    saveDBCache(allExercises)

    // Derive and cache filter options
    filterOptions = deriveFilterOptions(allExercises)
    saveFilterOptions(filterOptions)

    // Initialize Fuse instance for fuzzy search
    fuseInstance = new Fuse(allExercises, fuseOptions)

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
  const [dbReady, setDbReady] = useState(false)
  const [language, setLanguage] = useState(i18n.language)
  const searchTermRef = useRef('')

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      setLanguage(lng)
    }
    i18n.on('languageChanged', handleLanguageChange)
    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [])

  // Load DB on mount and when language changes
  useEffect(() => {
    let cancelled = false

    const loadDB = async () => {
      // Ensure cache is initialized for current language
      ensureInitialized()

      // Check if we need to reload for new language
      if (currentLanguage !== language) {
        if (!cancelled) setDbReady(false)
        resetDBState()
        // After reset, dbLoaded will be false if no cache, true if cached
      }

      if (!dbLoaded) {
        await loadExerciseDB()
        if (!cancelled) {
          setDbReady(true)
          setCacheVersion(v => v + 1)
        }
      } else if (!cancelled) {
        // Already loaded, just trigger re-render
        setDbReady(true)
        setCacheVersion(v => v + 1)
      }
    }

    loadDB()

    return () => {
      cancelled = true
    }
  }, [language])

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
      const exercises = dbLoaded && allExercises ? allExercises : await loadExerciseDB()

      // Check if search term changed while loading
      if (searchTermRef.current !== query) return

      // Filter exercises
      let filtered: Exercise[] = exercises

      // Fuzzy search across multiple fields using Fuse.js
      if (query) {
        if (fuseInstance) {
          const fuseResults = fuseInstance.search(query)
          filtered = fuseResults.map(result => result.item)
        } else {
          // Fallback to simple includes search if Fuse not initialized
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
    ensureInitialized()
    return exerciseCache?.get(exerciseId) ?? null
  }, [cacheVersion])

  const fetchExercise = useCallback(async (exerciseId: string): Promise<Exercise | null> => {
    ensureInitialized()

    // Check cache first
    if (exerciseCache?.has(exerciseId)) {
      return exerciseCache.get(exerciseId)!
    }

    // Load DB if needed
    if (!dbLoaded) {
      await loadExerciseDB()
      setCacheVersion(v => v + 1)
    }

    return exerciseCache?.get(exerciseId) ?? null
  }, [])

  // Fetch multiple exercises at once
  const fetchExercises = useCallback(async (exerciseIds: string[]) => {
    ensureInitialized()

    const missing = exerciseIds.filter(id => !exerciseCache?.has(id))
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
    ensureInitialized()
    return allExercises || []
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
