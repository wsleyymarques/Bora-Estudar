// packages/tutorial-engine/src/persistence/memory.ts
import type { PersistenceAdapter } from '../types'

export function createMemoryAdapter(): PersistenceAdapter {
  const store = new Map<string, unknown>()
  return {
    async save(key: string, data: unknown) { store.set(key, data) },
    async load(key: string) { return store.get(key) ?? null },
    async delete(key: string) { store.delete(key) }
  }
}