// packages/tutorial-engine/src/__tests__/persistence.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createMemoryAdapter } from '../persistence/memory'

describe('persistence adapters', () => {
  describe('memory', () => {
    let adapter: ReturnType<typeof createMemoryAdapter>
    
    beforeEach(() => {
      adapter = createMemoryAdapter()
    })
    
    it('saves and loads data', async () => {
      const data = { step: 2, userData: { name: 'John' } }
      await adapter.save('recipe-1', data)
      const loaded = await adapter.load('recipe-1')
      expect(loaded).toEqual(data)
    })
    
    it('returns null for missing key', async () => {
      const loaded = await adapter.load('nonexistent')
      expect(loaded).toBeNull()
    })
    
    it('deletes data', async () => {
      await adapter.save('recipe-1', { step: 1 })
      await adapter.delete('recipe-1')
      const loaded = await adapter.load('recipe-1')
      expect(loaded).toBeNull()
    })
    
    it('isolates between adapter instances', async () => {
      const adapter2 = createMemoryAdapter()
      await adapter.save('key', 'value1')
      await adapter2.save('key', 'value2')
      expect(await adapter.load('key')).toBe('value1')
      expect(await adapter2.load('key')).toBe('value2')
    })
    
    it('handles complex nested data', async () => {
      const data = { 
        date: new Date().toISOString(), 
        nested: { arr: [1, 2, 3], obj: { a: 1 } } 
      }
      await adapter.save('recipe-1', data)
      const loaded = await adapter.load('recipe-1')
      expect(loaded).toEqual(data)
    })
  })
  
  // localStorage tests run in browser/E2E environment
  describe.skip('localStorage (browser only)', () => {
    // These would run in a browser context
    // import { createLocalStorageAdapter } from '../persistence/localStorage'
  })
})