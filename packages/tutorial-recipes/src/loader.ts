// packages/tutorial-recipes/src/loader.ts
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as yaml from 'js-yaml'
import type { Recipe } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RECIPES_DIR = resolve(__dirname, '../recipes')

function validateRecipe(data: unknown): Recipe {
  return data as Recipe
}

export function loadRecipeFile(recipeId: string): Recipe {
  const filePath = resolve(RECIPES_DIR, `${recipeId}.yaml`)
  const content = readFileSync(filePath, 'utf-8')
  const parsed = yaml.load(content)
  return validateRecipe(parsed)
}

export async function loadAllRecipes(): Promise<Map<string, Recipe>> {
  const registry = new Map<string, Recipe>()
  const { readdirSync, existsSync } = await import('fs')
  const { resolve: resolvePath } = await import('path')
  const dir = existsSync(RECIPES_DIR) ? RECIPES_DIR : resolvePath(__dirname, '../../recipes')
  
  if (!existsSync(dir)) return registry
  
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const recipeId = file.replace(/\.ya?ml$/, '')
      try {
        const recipe = loadRecipeFile(recipeId)
        registry.set(recipe.id, recipe)
      } catch (e) {
        console.error(`Failed to load recipe ${recipeId}:`, e)
      }
    }
  }
  return registry
}

export function loadAllRecipesSync(): Map<string, Recipe> {
  const registry = new Map<string, Recipe>()
  const { readdirSync, existsSync } = require('fs')
  const { resolve: resolvePath } = require('path')
  const dir = existsSync(RECIPES_DIR) ? RECIPES_DIR : resolvePath(__dirname, '../../recipes')
  
  if (!existsSync(dir)) return registry
  
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const recipeId = file.replace(/\.ya?ml$/, '')
      try {
        const recipe = loadRecipeFile(recipeId)
        registry.set(recipe.id, recipe)
      } catch (e) {
        console.error(`Failed to load recipe ${recipeId}:`, e)
      }
    }
  }
  return registry
}