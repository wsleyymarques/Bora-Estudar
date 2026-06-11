// packages/tutorial-recipes/src/registry.ts
import type { Recipe } from './types.js'
import { loadAllRecipes } from './loader.js'

let registryCache: Map<string, Recipe> | null = null

export async function getRecipeRegistry(): Promise<Map<string, Recipe>> {
  if (!registryCache) {
    registryCache = await loadAllRecipes()
  }
  return registryCache!
}

export async function getRecipe(recipeId: string): Promise<Recipe | undefined> {
  const registry = await getRecipeRegistry()
  return registry.get(recipeId)
}

export function registerRecipe(recipe: Recipe): void {
  if (!registryCache) registryCache = new Map()
  registryCache.set(recipe.id, recipe)
}

export function clearRegistry(): void {
  registryCache = null
}