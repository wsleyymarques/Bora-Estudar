// packages/tutorial-engine/src/persistence/indexedDB.ts
import type { PersistenceAdapter } from '../types'

const DB_NAME = 'TutorialProgressDB'
const STORE_NAME = 'progress'
let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'))
        return
      }
      const request = indexedDB.open(DB_NAME, 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
    })
  }
  return dbPromise
}

export function createIndexedDBAdapter(): PersistenceAdapter {
  return {
    async save(key: string, data: unknown) {
      try {
        const db = await getDB()
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(data, key)
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch (e) {
        console.warn('[IndexedDB] Save failed:', e)
      }
    },
    async load(key: string) {
      try {
        const db = await getDB()
        const tx = db.transaction(STORE_NAME, 'readonly')
        const request = tx.objectStore(STORE_NAME).get(key)
        return new Promise<unknown | null>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result ?? null)
          request.onerror = () => reject(request.error)
        })
      } catch (e) {
        console.warn('[IndexedDB] Load failed:', e)
        return null
      }
    },
    async delete(key: string) {
      try {
        const db = await getDB()
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(key)
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch (e) {
        console.warn('[IndexedDB] Delete failed:', e)
      }
    }
  }
}