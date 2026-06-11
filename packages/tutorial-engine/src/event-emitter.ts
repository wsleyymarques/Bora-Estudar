// packages/tutorial-engine/src/event-emitter.ts
import type { TutorialEvent, TutorialEventListener } from './types'

export function createEventEmitter() {
  const listeners = new Set<TutorialEventListener>()
  const eventLog: TutorialEvent[] = []
  
  return {
    emit(event: TutorialEvent) {
      eventLog.push(event)
      listeners.forEach(fn => fn(event))
    },
    subscribe(listener: TutorialEventListener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getEventLog() {
      return [...eventLog]
    },
    clear() {
      eventLog.length = 0
    }
  }
}

export type EventEmitter = ReturnType<typeof createEventEmitter>