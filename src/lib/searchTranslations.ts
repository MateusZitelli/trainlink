/**
 * Search translation helpers for multi-language fuzzy search.
 * Uses translations from common.json to build search terms in multiple languages.
 */

import commonPTBR from '../locales/pt-BR/common.json'

// Type for translation categories in common.json
type TranslationCategory =
  | 'muscle'
  | 'exerciseEquipment'
  | 'exerciseCategory'
  | 'exerciseForce'
  | 'exerciseMechanic'
  | 'exerciseLevel'

// Build reverse lookup maps from common.json translations
function buildTranslationMap(category: TranslationCategory): Record<string, string> {
  const ptTranslations = commonPTBR[category] as Record<string, string> | undefined
  if (!ptTranslations) return {}
  return ptTranslations
}

// Translation maps built from common.json
export const muscleTranslations = buildTranslationMap('muscle')
export const equipmentTranslations = buildTranslationMap('exerciseEquipment')
export const categoryTranslations = buildTranslationMap('exerciseCategory')
export const forceTranslations = buildTranslationMap('exerciseForce')
export const mechanicTranslations = buildTranslationMap('exerciseMechanic')
export const levelTranslations = buildTranslationMap('exerciseLevel')

/**
 * Get translated value for a given category and key.
 * Returns the Portuguese translation if available, otherwise returns the original value.
 */
export function getTranslatedValue(category: TranslationCategory, value: string): string | undefined {
  const map = {
    muscle: muscleTranslations,
    exerciseEquipment: equipmentTranslations,
    exerciseCategory: categoryTranslations,
    exerciseForce: forceTranslations,
    exerciseMechanic: mechanicTranslations,
    exerciseLevel: levelTranslations,
  }[category]

  return map?.[value]
}

/**
 * Get all translation variants for a value (original + translated).
 * Useful for building comprehensive search terms.
 */
export function getAllTranslationVariants(category: TranslationCategory, value: string): string[] {
  const variants = [value]
  const translated = getTranslatedValue(category, value)
  if (translated && translated !== value) {
    variants.push(translated)
  }
  return variants
}
