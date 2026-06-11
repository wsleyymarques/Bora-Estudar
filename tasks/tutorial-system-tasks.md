# Tasks: Sistema de Tutorial Step-by-Step - Breakdown Granular

> **Para execução via subagent-driven-development**
> Cada task = 2-5 min | Código completo | Comandos exatos | Verificação

---

## Fase 1: Fundação & Core Engine

### Task 1.1.1: Setup Monorepo - Root package.json
**Objective:** Criar package.json raiz com workspaces, scripts, devDependencies.

**Files:**
- Create: `package.json` (root)

**Step 1: Write file**
```json
{
  "name": "bora-estudar",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "format": "prettier --write \"**/*.{ts,tsx,json,md,yaml,yml}\"",
    "validate:recipes": "pnpm --filter @bora-estudar/tutorial-recipes run validate",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1",
    "@types/node": "^20.12.0",
    "eslint": "^9.0.0",
    "prettier": "^3.2.5",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  },
  "engines": { "node": ">=20.0.0" },
  "packageManager": "pnpm@9.0.0"
}
```

**Step 2: Run**
```bash
pnpm install
```
Expected: Lockfile criado, node_modules populado.

**Step 3: Verify**
```bash
pnpm --version
# Expected: 9.x.x
```

**Commit:** `chore: init monorepo root package.json`

---

### Task 1.1.2: Setup Monorepo - pnpm-workspace.yaml
**Objective:** Configurar workspaces para packages/, apps/, tools/.

**Files:**
- Create: `pnpm-workspace.yaml`

**Step 1: Write file**
```yaml
packages:
  - packages/*
  - apps/*
  - tools/*
```

**Step 2: Verify**
```bash
pnpm ls --depth=0
# Expected: lista bora-estudar + workspaces
```

**Commit:** `chore: add pnpm-workspace.yaml`

---

### Task 1.1.3: Setup Monorepo - TypeScript Base Config
**Objective:** tsconfig.base.json compartilhado com paths aliases.

**Files:**
- Create: `tsconfig.base.json`

**Step 1: Write file**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@bora-estudar/*": ["packages/*/src"]
    }
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

**Step 2: Verify**
```bash
pnpm exec tsc --showConfig
# Expected: config merged corretamente
```

**Commit:** `chore: add tsconfig.base.json`

---

### Task 1.1.4: Setup Monorepo - ESLint Config
**Objective:** Configuração ESLint 9 flat config para monorepo.

**Files:**
- Create: `.eslintrc.json` (ou `eslint.config.js` para flat config)

**Step 1: Write file (eslint.config.js)**
```javascript
// eslint.config.js
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  { ignores: ['dist/', 'build/', 'node_modules/', '*.config.*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error'
    }
  }
)
```

**Step 2: Install deps**
```bash
pnpm add -D -w @eslint/js typescript-eslint eslint-plugin-prettier
```

**Step 3: Verify**
```bash
pnpm lint
# Expected: sem erros (arquivos vazios)
```

**Commit:** `chore: add eslint config`

---

### Task 1.1.5: Setup Monorepo - Prettier Config
**Objective:** Formatação consistente.

**Files:**
- Create: `.prettierrc`

**Step 1: Write file**
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**Step 2: Verify**
```bash
pnpm format
# Expected: sem mudanças (arquivos novos)
```

**Commit:** `chore: add prettier config`

---

### Task 1.1.6: Setup Monorepo - Vitest Root Config
**Objective:** Configuração de testes compartilhada.

**Files:**
- Create: `vitest.config.ts` (root)

**Step 1: Write file**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/__tests__/**/*.test.ts', 'apps/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/__tests__/**', '**/*.config.*', '**/dist/**']
    }
  }
})
```

**Step 2: Verify**
```bash
pnpm test
# Expected: "No test files found" (ainda não criamos packages)
```

**Commit:** `chore: add vitest root config`

---

### Task 1.1.7: Setup Monorepo - CI Workflow
**Objective:** GitHub Actions para lint, test, build.

**Files:**
- Create: `.github/workflows/ci.yml`

**Step 1: Write file**
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9, run_install: false }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

**Commit:** `ci: add GitHub Actions workflow`

---

### Task 1.2.1: tutorial-engine - Package Setup
**Objective:** Criar package.json, tsconfig, estrutura de pastas.

**Files:**
- Create: `packages/tutorial-engine/package.json`
- Create: `packages/tutorial-engine/tsconfig.json`
- Create: `packages/tutorial-engine/src/index.ts` (vazio por enquanto)

**Step 1: Write package.json**
```json
{
  "name": "@bora-estudar/tutorial-engine",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint src --ext ts"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@bora-estudar/tsconfig": "workspace:*",
    "vitest": "^1.4.0"
  }
}
```

**Step 2: Write tsconfig.json**
```json
{
  "extends": "@bora-estudar/tsconfig",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "declarationDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create tsconfig package**
```bash
mkdir -p packages/tsconfig
```

**Files:**
- Create: `packages/tsconfig/package.json`
- Create: `packages/tsconfig/tsconfig.base.json` (copy from root)

**package.json:**
```json
{
  "name": "@bora-estudar/tsconfig",
  "version": "0.0.0",
  "main": "tsconfig.base.json",
  "files": ["tsconfig.base.json"]
}
```

**Step 4: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-engine build
# Expected: dist/ gerado (vazio)
```

**Commit:** `feat(engine): package setup with tsconfig`

---

### Task 1.2.2: tutorial-engine - Types (types.ts)
**Objective:** Definir todos types Zod + TypeScript para Recipe, Step, Engine.

**Files:**
- Create: `packages/tutorial-engine/src/types.ts`

**Step 1: Write file** ⟵ **COPIE O CÓDIGO COMPLETO DO PLAN (Task 1.2 Step 2)**
> O arquivo completo está no plano em `Task 1.2: tutorial-engine - Types & State Machine` → `Step 2: Write types.ts`

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-engine build
# Expected: dist/index.d.ts gerado com types exportados
```

**Commit:** `feat(engine): types with Zod schemas for Recipe, Step, Engine`

---

### Task 1.2.3: tutorial-engine - State Machine (state-machine.ts)
**Objective:** Pure functions para transições de estado, template resolution.

**Files:**
- Create: `packages/tutorial-engine/src/state-machine.ts`

**Step 1: Write file** ⟵ **COPIE DO PLAN (Task 1.2 Step 3)**

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-engine build
```

**Commit:** `feat(engine): state machine with transitions and template resolution`

---

### Task 1.2.4: tutorial-engine - Event Emitter (event-emitter.ts)
**Objective:** Simple pub/sub para eventos do tutorial.

**Files:**
- Create: `packages/tutorial-engine/src/event-emitter.ts`

**Step 1: Write file** ⟵ **COPIE DO PLAN (Task 1.2 Step 4)**

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-engine build
```

**Commit:** `feat(engine): event emitter for tutorial events`

---

### Task 1.2.5: tutorial-engine - Engine Core (engine.ts)
**Objective:** API pública TutorialEngine com persistência, analytics, validação.

**Files:**
- Create: `packages/tutorial-engine/src/engine.ts`

**Step 1: Write file** ⟵ **COPIE DO PLAN (Task 1.2 Step 5)**

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-engine build
```

**Commit:** `feat(engine): core engine API with persistence, analytics, validation`

---

### Task 1.2.6: tutorial-engine - Barrel Export (index.ts)
**Objective:** Exportar tudo publicamente.

**Files:**
- Create: `packages/tutorial-engine/src/index.ts`

**Step 1: Write file**
```typescript
export * from './types'
export * from './engine'
export * from './state-machine'
export * from './event-emitter'
export { createEngine } from './engine'
```

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-engine build
```

**Commit:** `feat(engine): barrel exports`

---

### Task 1.2.7: tutorial-engine - Unit Tests (state-machine.test.ts)
**Objective:** Testes puros da state machine.

**Files:**
- Create: `packages/tutorial-engine/src/__tests__/state-machine.test.ts`

**Step 1: Write file** ⟵ **COPIE DO PLAN (Task 1.2 Step 7 - primeiro bloco)**

**Step 2: Run**
```bash
pnpm --filter @bora-estudar/tutorial-engine test
```
Expected: All tests pass.

**Commit:** `test(engine): state machine unit tests`

---

### Task 1.2.8: tutorial-engine - Unit Tests (engine.test.ts)
**Objective:** Testes de integração do engine com mocks.

**Files:**
- Create: `packages/tutorial-engine/src/__tests__/engine.test.ts`

**Step 1: Write file** ⟵ **COPIE DO PLAN (Task 1.2 Step 7 - segundo bloco)**

**Step 2: Run**
```bash
pnpm --filter @bora-estudar/tutorial-engine test
```
Expected: All tests pass.

**Commit:** `test(engine): engine integration tests with mocks`

---

### Task 1.2.9: tutorial-engine - Persistence Adapters
**Objective:** localStorage, IndexedDB, Memory adapters.

**Files:**
- Create: `packages/tutorial-engine/src/persistence/localStorage.ts`
- Create: `packages/tutorial-engine/src/persistence/indexedDB.ts`
- Create: `packages/tutorial-engine/src/persistence/memory.ts`
- Create: `packages/tutorial-engine/src/persistence/index.ts`

**Step 1: Write all 4 files** ⟵ **COPIE DO PLAN (Task 1.3 Steps 1-3)**

**Step 2: Update index.ts (engine) to export**
```typescript
// packages/tutorial-engine/src/index.ts - ADD
export * from './persistence'
```

**Step 3: Create test**
- Create: `packages/tutorial-engine/src/__tests__/persistence.test.ts`

**Step 4: Run tests**
```bash
pnpm --filter @bora-estudar/tutorial-engine test
```

**Commit:** `feat(engine): persistence adapters (localStorage, IndexedDB, memory)`

---

### Task 1.3.1: tutorial-recipes - Package Setup
**Objective:** Package para carregar/validar recipes YAML.

**Files:**
- Create: `packages/tutorial-recipes/package.json`
- Create: `packages/tutorial-recipes/tsconfig.json`
- Create: `packages/tutorial-recipes/src/index.ts` (vazio)

**Step 1: Write package.json** ⟵ **COPIE DO PLAN (Task 1.4 Step 1)**

**Step 2: Write tsconfig.json** (similar ao engine)

**Step 3: Install deps**
```bash
pnpm install
```

**Commit:** `feat(recipes): package setup`

---

### Task 1.3.2: tutorial-recipes - Loader & Registry
**Objective:** Carregar YAML, validar com Zod, registry tipado.

**Files:**
- Create: `packages/tutorial-recipes/src/loader.ts`
- Create: `packages/tutorial-recipes/src/registry.ts`

**Step 1: Write loader.ts** ⟵ **COPIE DO PLAN (Task 1.4 Step 2)**

**Step 2: Write registry.ts** ⟵ **COPIE DO PLAN (Task 1.4 Step 3)**

**Step 3: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-recipes build
```

**Commit:** `feat(recipes): YAML loader and registry`

---

### Task 1.3.3: tutorial-recipes - Recipe Files (YAML)
**Objective:** Criar os 2 recipes base: criar-plano.yaml, cronograma-avulso.yaml.

**Files:**
- Create: `packages/tutorial-recipes/recipes/criar-plano.yaml`
- Create: `packages/tutorial-recipes/recipes/cronograma-avulso.yaml`

**Step 1: Write criar-plano.yaml** ⟵ **COPIE DO SPEC (specs/tutorial-system-spec.md - seção 3.2)**

**Step 2: Write cronograma-avulso.yaml** ⟵ **COPIE DO SPEC**

**Step 3: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-recipes run validate
```
Expected: ✅ All recipes valid.

**Commit:** `feat(recipes): add criar-plano and cronograma-avulso recipes`

---

### Task 1.3.4: tutorial-recipes - Validator CLI
**Objective:** CLI para validar recipes em CI.

**Files:**
- Create: `packages/tutorial-recipes/src/validator.ts`

**Step 1: Write file** ⟵ **COPIE DO PLAN (Task 1.4 Step 5)**

**Step 2: Add to package.json scripts**
```json
"validate": "tsx src/validator.ts"
```

**Step 3: Run**
```bash
pnpm --filter @bora-estudar/tutorial-recipes run validate
```
Expected: ✅ All recipes valid.

**Commit:** `feat(recipes): validator CLI for CI`

---

### Task 1.3.5: tutorial-recipes - Tests & Barrel Export
**Objective:** Testes do loader + export público.

**Files:**
- Create: `packages/tutorial-recipes/src/__tests__/loader.test.ts`
- Create: `packages/tutorial-recipes/src/index.ts`

**Step 1: Write test** (loadRecipeFile, loadAllRecipes)

**Step 2: Write index.ts**
```typescript
export * from './loader'
export * from './registry'
export { loadRecipeFile, loadAllRecipes } from './loader'
export { getRecipeRegistry, getRecipe, registerRecipe, clearRegistry } from './registry'
```

**Step 3: Run**
```bash
pnpm --filter @bora-estudar/tutorial-recipes test
pnpm --filter @bora-estudar/tutorial-recipes build
```

**Commit:** `test(recipes): loader tests + barrel exports`

---

## Fase 2: React Adapter

### Task 2.1.1: tutorial-react - Package Setup
**Objective:** Package React com peer deps, storybook, testing-library.

**Files:**
- Create: `packages/tutorial-react/package.json`
- Create: `packages/tutorial-react/tsconfig.json`
- Create: `packages/tutorial-react/src/index.ts`

**Step 1: Write package.json** ⟵ **COPIE DO PLAN (Task 2.1 Step 1)**

**Step 2: Write tsconfig.json** (extends base + jsx)

**Step 3: Install**
```bash
pnpm install
```

**Commit:** `feat(react): package setup with peer deps`

---

### Task 2.1.2: tutorial-react - Context & Provider
**Objective:** React context com engine, state, actions.

**Files:**
- Create: `packages/tutorial-react/src/context.tsx`

**Step 1: Write file** ⟵ **COPIE DO PLAN (Task 2.1 Step 2)**

**Step 2: Verify build**
```bash
pnpm --filter @bora-estudar/tutorial-react build
```

**Commit:** `feat(react): TutorialProvider context and hooks`

---

### Task 2.1.3: tutorial-react - Hooks (useStep, useTutorialProgress)
**Objective:** Hooks de conveniência para components.

**Files:**
- Create: `packages/tutorial-react/src/hooks.ts`

**Step 1: Write file** ⟵ **COPIE DO PLAN (Task 2.1 Step 3)**

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-react build
```

**Commit:** `feat(react): useStep and useTutorialProgress hooks`

---

### Task 2.1.4: tutorial-react - Step Components (5 files)
**Objective:** Components para cada step type: InfoStep, SelectStep, FormStep, ConfirmationStep, SuccessStep.

**Files:**
- Create: `packages/tutorial-react/src/components/steps/InfoStep.tsx`
- Create: `packages/tutorial-react/src/components/steps/SelectStep.tsx`
- Create: `packages/tutorial-react/src/components/steps/FormStep.tsx`
- Create: `packages/tutorial-react/src/components/steps/ConfirmationStep.tsx`
- Create: `packages/tutorial-react/src/components/steps/SuccessStep.tsx`
- Create: `packages/tutorial-react/src/components/steps/Step.module.css`

**Step 1: Write Step.module.css** (shared styles)

**Step 2: Write each component** ⟵ **COPIE DO PLAN (Task 2.1 Steps 4)**

**Step 3: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-react build
```

**Commit:** `feat(react): step components (info, select, form, confirmation, success)`

---

### Task 2.1.5: tutorial-react - StepRenderer & ProgressBar
**Objective:** Dispatcher de step components + barra de progresso.

**Files:**
- Create: `packages/tutorial-react/src/components/StepRenderer.tsx`
- Create: `packages/tutorial-react/src/components/ProgressBar.tsx`
- Create: `packages/tutorial-react/src/components/ProgressBar.module.css`

**Step 1: Write files** ⟵ **COPIE DO PLAN (Task 2.1 Steps 5-6)**

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-react build
```

**Commit:** `feat(react): StepRenderer dispatcher and ProgressBar`

---

### Task 2.1.6: tutorial-react - TutorialModal
**Objective:** Modal principal com animações, focus management.

**Files:**
- Create: `packages/tutorial-react/src/components/TutorialModal.tsx`
- Create: `packages/tutorial-react/src/components/TutorialModal.module.css`

**Step 1: Write files** ⟵ **COPIE DO PLAN (Task 2.1 Step 7)**

**Note:** Install framer-motion se usar animações:
```bash
pnpm --filter @bora-estudar/tutorial-react add framer-motion
```

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-react build
```

**Commit:** `feat(react): TutorialModal with animations and focus management`

---

### Task 2.1.7: tutorial-react - A11y Hooks
**Objective:** useFocusTrap, useReducedMotion.

**Files:**
- Create: `packages/tutorial-react/src/hooks/useFocusTrap.ts`
- Create: `packages/tutorial-react/src/hooks/useReducedMotion.ts`

**Step 1: Write files** ⟵ **COPIE DO PLAN (Task 2.2 Steps 1-2)**

**Step 2: Integrate in TutorialModal**

**Step 3: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-react build
```

**Commit:** `feat(react): a11y hooks (focus trap, reduced motion)`

---

### Task 2.1.8: tutorial-react - Barrel Export & Styles
**Objective:** Export público + CSS global.

**Files:**
- Create: `packages/tutorial-react/src/index.ts`
- Create: `packages/tutorial-react/src/styles.css`

**Step 1: Write index.ts**
```typescript
export * from './context'
export * from './hooks'
export * from './components/StepRenderer'
export * from './components/ProgressBar'
export * from './components/TutorialModal'
export * from './components/steps/InfoStep'
export * from './components/steps/SelectStep'
export * from './components/steps/FormStep'
export * from './components/steps/ConfirmationStep'
export * from './components/steps/SuccessStep'
```

**Step 2: Write styles.css** (CSS variables, reset básico)

**Step 3: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-react build
```

**Commit:** `feat(react): barrel exports and global styles`

---

### Task 2.1.9: tutorial-react - Storybook Setup
**Objective:** Configuração Storybook para components.

**Files:**
- Create: `packages/tutorial-react/.storybook/main.ts`
- Create: `packages/tutorial-react/.storybook/preview.ts`

**Step 1: Write configs**

**Step 2: Install**
```bash
pnpm --filter @bora-estudar/tutorial-react add -D @storybook/react @storybook/react-vite storybook
```

**Step 3: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-react run build-storybook
```

**Commit:** `feat(react): storybook configuration`

---

### Task 2.1.10: tutorial-react - Stories (6 files)
**Objective:** Stories para cada step type + modal states.

**Files:**
- Create: `packages/tutorial-react/src/components/steps/InfoStep.stories.tsx`
- Create: `packages/tutorial-react/src/components/steps/SelectStep.stories.tsx`
- Create: `packages/tutorial-react/src/components/steps/FormStep.stories.tsx`
- Create: `packages/tutorial-react/src/components/steps/ConfirmationStep.stories.tsx`
- Create: `packages/tutorial-react/src/components/steps/SuccessStep.stories.tsx`
- Create: `packages/tutorial-react/src/components/TutorialModal.stories.tsx`

**Step 1: Write each story** (loading, error, empty, complete states)

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-react run build-storybook
```

**Commit:** `feat(react): storybook stories for all components`

---

### Task 2.1.11: tutorial-react - Unit Tests
**Objective:** Vitest + Testing Library tests para hooks e modal.

**Files:**
- Create: `packages/tutorial-react/src/__tests__/hooks.test.tsx`
- Create: `packages/tutorial-react/src/__tests__/TutorialModal.test.tsx`

**Step 1: Write tests**

**Step 2: Run**
```bash
pnpm --filter @bora-estudar/tutorial-react test
```

**Commit:** `test(react): unit tests for hooks and modal`

---

## Fase 3: Analytics Package

### Task 3.1.1: tutorial-analytics - Package Setup
**Objective:** Package para coleta de eventos + providers.

**Files:**
- Create: `packages/tutorial-analytics/package.json`
- Create: `packages/tutorial-analytics/tsconfig.json`
- Create: `packages/tutorial-analytics/src/index.ts`

**Step 1: Write package.json** (deps: zod, analytics types)

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-analytics build
```

**Commit:** `feat(analytics): package setup`

---

### Task 3.1.2: tutorial-analytics - Types & Collector
**Objective:** Types para eventos + collector com batch/queue.

**Files:**
- Create: `packages/tutorial-analytics/src/types.ts`
- Create: `packages/tutorial-analytics/src/collector.ts`

**Step 1: Write files**

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-analytics build
```

**Commit:** `feat(analytics): event types and collector`

---

### Task 3.1.3: tutorial-analytics - Providers (3 files)
**Objective:** GA4, Mixpanel, Custom providers.

**Files:**
- Create: `packages/tutorial-analytics/src/providers/ga4.ts`
- Create: `packages/tutorial-analytics/src/providers/mixpanel.ts`
- Create: `packages/tutorial-analytics/src/providers/custom.ts`
- Create: `packages/tutorial-analytics/src/providers/index.ts`

**Step 1: Write providers**

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-analytics build
```

**Commit:** `feat(analytics): GA4, Mixpanel, Custom providers`

---

### Task 3.1.4: tutorial-analytics - Tests & Export
**Objective:** Testes do collector + barrel export.

**Files:**
- Create: `packages/tutorial-analytics/src/__tests__/collector.test.ts`
- Update: `packages/tutorial-analytics/src/index.ts`

**Step 1: Write test + export**

**Step 2: Verify**
```bash
pnpm --filter @bora-estudar/tutorial-analytics test
pnpm --filter @bora-estudar/tutorial-analytics build
```

**Commit:** `test(analytics): collector tests + barrel exports`

---

## Fase 4: App Exemplo (Next.js)

### Task 4.1.1: web - Package Setup
**Objective:** Next.js app consumindo todos packages.

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`

**Step 1: Write package.json** (deps: next, react, @bora-estudar/*)

**Step 2: Write next.config.js** (transpilePackages para workspace)

**Step 3: Install**
```bash
pnpm install
```

**Commit:** `feat(web): Next.js app setup with workspace deps`

---

### Task 4.1.2: web - Auth Context & Providers
**Objective:** Context de auth simulado + TutorialProvider wrapper.

**Files:**
- Create: `apps/web/src/components/AuthContext.tsx`
- Create: `apps/web/src/components/TutorialProviders.tsx`

**Step 1: Write AuthContext** (mock user)

**Step 2: Write TutorialProviders** (wrap providers: engine, analytics, persistence)

**Step 3: Integrate in layout.tsx**

**Commit:** `feat(web): auth context and tutorial providers`

---

### Task 4.1.3: web - Dashboard Page (Botões de Entrada)
**Objective:** Página principal com 2 botões: "Criar Plano" e "Cronograma Avulso".

**Files:**
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/components/TutorialTriggers.tsx`

**Step 1: Write page.tsx** (dashboard com cards)

**Step 2: Write TutorialTriggers** (abre modal com recipeId correto)

**Step 3: Verify**
```bash
pnpm --filter web dev
# Manual test: abre modal, navega steps
```

**Commit:** `feat(web): dashboard with tutorial entry points`

---

### Task 4.1.4: web - Dashboard Page (Pós-Onboarding)
**Objective:** Página /dashboard mostrando resultados.

**Files:**
- Create: `apps/web/src/app/dashboard/page.tsx`

**Step 1: Write dashboard page** (mostra plano/cronograma criado)

**Commit:** `feat(web): dashboard page with results`

---

## Fase 5: Qualidade, Docs & Release

### Task 5.1.1: E2E Tests - Playwright Setup
**Objective:** Configurar Playwright para tests E2E.

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/criar-plano.spec.ts`
- Create: `apps/web/e2e/cronograma-avulso.spec.ts`

**Step 1: Install**
```bash
pnpm --filter web add -D @playwright/test
pnpm --filter web exec playwright install
```

**Step 2: Write config + 2 test files**

**Step 3: Run**
```bash
pnpm --filter web exec playwright test
```

**Commit:** `test(e2e): playwright tests for both tutorial flows`

---

### Task 5.2.1: Documentation - Package READMEs
**Objective:** README para cada package.

**Files:**
- Create: `packages/tutorial-engine/README.md`
- Create: `packages/tutorial-recipes/README.md`
- Create: `packages/tutorial-react/README.md`
- Create: `packages/tutorial-analytics/README.md`

**Step 1: Write READMEs** (install, usage, API)

**Commit:** `docs: package READMEs`

---

### Task 5.2.2: Documentation - Guides
**Objective:** Guias de authoring, migração, arquitetura.

**Files:**
- Create: `docs/recipe-authoring.md`
- Create: `docs/migration-guide.md`
- Create: `docs/architecture.md`

**Step 1: Write guides**

**Commit:** `docs: authoring, migration, architecture guides`

---

### Task 5.3.1: CI/CD - Release Workflow
**Objective:** Pipeline de release com changesets.

**Files:**
- Create: `.github/workflows/release.yml`
- Create: `.changeset/config.json`

**Step 1: Write release.yml** (on push to main, run changeset publish)

**Step 2: Write changeset config**

**Step 3: Initialize changesets**
```bash
pnpm changeset
# Create initial changesets for each package
```

**Commit:** `ci: release workflow with changesets`

---

### Task 5.3.2: Version 0.1.0 Release
**Objective:** Primeira publicação no npm.

**Step 1: Version**
```bash
pnpm version
# ou: pnpm changeset version
```

**Step 2: Build all**
```bash
pnpm build
```

**Step 3: Publish**
```bash
pnpm release
# ou: pnpm changeset publish
```

**Commit:** `release: v0.1.0 initial release`

---

## Ordem de Execução Recomendada

```
1.1.1 → 1.1.2 → 1.1.3 → 1.1.4 → 1.1.5 → 1.1.6 → 1.1.7  (Monorepo Foundation)
    ↓
1.2.1 → 1.2.2 → 1.2.3 → 1.2.4 → 1.2.5 → 1.2.6 → 1.2.7 → 1.2.8 → 1.2.9  (Engine)
    ↓
1.3.1 → 1.3.2 → 1.3.3 → 1.3.4 → 1.3.5  (Recipes)
    ↓
2.1.1 → 2.1.2 → 2.1.3 → 2.1.4 → 2.1.5 → 2.1.6 → 2.1.7 → 2.1.8 → 2.1.9 → 2.1.10 → 2.1.11  (React)
    ↓
3.1.1 → 3.1.2 → 3.1.3 → 3.1.4  (Analytics)
    ↓
4.1.1 → 4.1.2 → 4.1.3 → 4.1.4  (Web App)
    ↓
5.1.1 → 5.2.1 → 5.2.2 → 5.3.1 → 5.3.2  (Quality & Release)
```

---

## Verificação Rápida por Fase

```bash
# Fase 1 completa:
pnpm --filter @bora-estudar/tutorial-engine test
pnpm --filter @bora-estudar/tutorial-recipes test
pnpm validate:recipes

# Fase 2 completa:
pnpm --filter @bora-estudar/tutorial-react test
pnpm --filter @bora-estudar/tutorial-react run build-storybook

# Fase 3 completa:
pnpm --filter @bora-estudar/tutorial-analytics test

# Fase 4 completa:
pnpm --filter web dev  # manual test
pnpm --filter web exec playwright test

# Fase 5 completa:
pnpm build  # all packages
pnpm test   # all tests
```

---

*Tasks salvos em: `tasks/tutorial-system-tasks.md`*