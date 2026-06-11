// packages/tutorial-video/src/utils/recipe-loader.ts
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as yaml from "js-yaml";
import type { Recipe } from "@bora-estudar/tutorial-engine";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RECIPES_DIR = path.resolve(__dirname, "../../../tutorial-recipes/recipes");

export function loadRecipe(recipeId: string): Recipe {
  const filePath = path.join(RECIPES_DIR, `${recipeId}.yaml`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Recipe not found: ${recipeId} at ${filePath}`);
  }
  
  const fileContent = fs.readFileSync(filePath, "utf-8");
  const recipe = yaml.load(fileContent) as Recipe;
  
  return recipe;
}

export function getAvailableRecipes(): string[] {
  if (!fs.existsSync(RECIPES_DIR)) {
    return [];
  }
  
  return fs
    .readdirSync(RECIPES_DIR)
    .filter((file) => file.endsWith(".yaml"))
    .map((file) => file.replace(".yaml", ""));
}

export function loadAllRecipes(): Map<string, Recipe> {
  const recipes = new Map<string, Recipe>();
  const recipeIds = getAvailableRecipes();
  
  for (const id of recipeIds) {
    recipes.set(id, loadRecipe(id));
  }
  
  return recipes;
}