// packages/tutorial-engine/src/persistence/localStorage.ts
import type { PersistenceAdapter } from '../types'

export function createLocalStorageAdapter(prefix = 'tutorial:'): PersistenceAdapter {
  const isAvailable = typeof localStorage !== 'undefined'
  
  return {
    async save(key: string, data: unknown) {
      if (!isAvailable) return
      try {
        localStorage.setItem(`${prefix}${key}`, JSON.stringify(data))
      } catch (e) {
        console.warn('[localStorage] Save failed:', e)
      }
    },
    async load(key: string) {
      if (!isAvailable) return null
      try {
        const item = localStorage.getItem(`${prefix}${key}`)
        return item ? JSON.parse(item) : null
      } catch (e) {
        console.warn('[localStorage] Load failed:', e)
        return null
      }
    },
    async delete(key: string) {
      if (!isAvailable) return
      localStorage.removeItem(`${prefix}${key}`)
    }
  }
}