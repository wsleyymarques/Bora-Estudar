// packages/tutorial-recipes/src/validator.ts
import { loadAllRecipes } from './loader.js'

async function main() {
  console.log('🔍 Validating recipes...')
  const registry = await loadAllRecipes()
  
  if (registry.size === 0) {
    console.log('⚠️  No recipes found')
    process.exit(1)
  }
  
  let hasErrors = false
  for (const [id, recipe] of registry) {
    try {
      console.log(`✅ ${id} (v${recipe.schemaVersion}) - ${recipe.steps.length} steps`)
    } catch (e) {
      console.error(`❌ ${id}: ${e}`)
      hasErrors = true
    }
  }
  
  if (hasErrors) {
    console.log('\n❌ Validation failed')
    process.exit(1)
  }
  
  console.log(`\n✅ All ${registry.size} recipes valid!`)
}

main().catch(console.error)