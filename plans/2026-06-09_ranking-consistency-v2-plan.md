# Plano de Implementação: Sistema de Rankeamento e Constância v2.0

> **Para Codex:** Implemente task-by-task seguindo esta ordem. Cada task = 1 commit.
>
> **Goal:** Substituir sistema atual de constância/rankeamento por v2.0 com streaks baseados em execução real e score composto.
>
> **Architecture:** Domain-driven (TypeScript), Event Sourcing, CQRS, Postgres.
>
> **Tech Stack:** TypeScript 5.5+, Node 20+, Postgres 16, Redis (cache), Vitest, Zod.

---

## Estrutura do Projeto

```
src/
├── domain/
│   ├── value-objects/          # StudySession, ScheduledDay, ConsistencyMetrics
│   ├── services/               # ConsistencyCalculator, RankingScorer
│   ├── events/                 # StudySessionCompleted, StreakUpdated
│   ├── repositories/           # Interfaces (ConsistencyRepo, RankingRepo)
│   └── exceptions/             # DomainErrors
├── application/
│   ├── use-cases/              # CompleteSession, RecalculateRanking, GetConsistency
│   ├── dtos/                   # Commands/Queries
│   └── ports/                  # EventPublisher, Cache
├── infrastructure/
│   ├── persistence/
│   │   ├── postgres/           # PostgresConsistencyRepo, PostgresRankingRepo
│   │   └── event-store/        # EventStore implementation
│   ├── cache/                  # RedisCache
│   └── messaging/              # EventProcessor
├── presentation/
│   ├── api/                    # REST endpoints
│   └── hooks/                  # useConsistency, useRanking
└── shared/
    ├── kernel/                 # Result, Entity, ValueObject base classes
    └── utils/                  # DateUtils, DateUtils
```

---

## Fase 1: Domain Core (Foundation)

### Task 1.1: Value Objects & Types

**Objective:** Criar value objects imutáveis para sessões, dias agendados e métricas.

**Files:**
- Create: `src/domain/value-objects/StudySession.ts`
- Create: `src/domain/value-objects/ScheduledDay.ts`
- Create: `src/domain/value-objects/ConsistencyMetrics.ts`
- Create: `src/domain/value-objects/RankingFactors.ts`
- Create: `src/domain/value-objects/index.ts` (barrel)

**Step 1: Write failing tests**
```typescript
// tests/domain/value-objects/StudySession.test.ts
describe('StudySession', () => {
  it('creates completed session with adherence 1.0', () => {
    const session = StudySession.create({
      scheduledSubjects: ['Math', 'Portuguese'],
      completedSubjects: ['Math', 'Portuguese'],
    })
    expect(session.adherenceRate).toBe(1.0)
    expect(session.status).toBe('completed')
  })
  
  it('creates partial session with adherence 0.5', () => {
    const session = StudySession.create({
      scheduledSubjects: ['Math', 'Portuguese', 'English'],
      completedSubjects: ['Math'],
    })
    expect(session.adherenceRate).toBeCloseTo(0.33, 1)
    expect(session.status).toBe('partial')
  })
})
```

**Step 2: Implement**
```typescript
// src/domain/value-objects/StudySession.ts
export class StudySession {
  static create(props: {
    sessionId: string
    userId: string
    planId: string
    scheduledDate: LocalDate
    scheduledSubjects: Subject[]
    completedSubjects: Subject[]
    actualStartTime: DateTime
    actualEndTime: DateTime
  }): StudySession { ... }
  
  get adherenceRate(): number { ... }
  get status(): 'completed' | 'partial' | 'skipped' { ... }
}
```

**Step 3: Run tests** → `pnpm test tests/domain/value-objects`

**Commit:** `feat(domain): StudySession, ScheduledDay, ConsistencyMetrics value objects`

---

### Task 1.2: ConsistencyCalculator (Core Domain Service)

**Objective:** Implementar lógica pura de cálculo de streaks baseada em execução real.

**Files:**
- Create: `src/domain/services/ConsistencyCalculator.ts`
- Create: `src/domain/services/index.ts`

**Step 1: Write failing tests (property-based)**
```typescript
// tests/domain/services/ConsistencyCalculator.test.ts
import { fc } from '@fast-check/vitest'

describe('ConsistencyCalculator', () => {
  const calculator = new ConsistencyCalculator()
  
  it('streak ignores empty days (no scheduled subjects)', () => {
    const sessions = [
      // Day 1: completed
      createSession({ date: '2024-01-01', adherence: 1.0, hasScheduled: true }),
      // Day 2: empty (no scheduled subjects)
      createSession({ date: '2024-01-02', hasScheduled: false }),
      // Day 3: completed
      createSession({ date: '2024-01-03', adherence: 1.0, hasScheduled: true }),
    ]
    const result = calculator.calculate(sessions, [])
    expect(result.currentStreak).toBe(2) // ignora dia vazio
  })
  
  it('breaks streak on partial adherence (<80%)', () => {
    const sessions = [
      createSession({ date: '2024-01-01', adherence: 1.0, hasScheduled: true }),
      createSession({ date: '2024-01-02', adherence: 0.5, hasScheduled: true }), // partial
      createSession({ date: '2024-01-03', adherence: 1.0, hasScheduled: true }),
    ]
    const result = calculator.calculate(sessions, [])
    expect(result.currentStreak).toBe(1) // quebrou no dia 2
  })
  
  it('breaks streak on skipped day (0% adherence)', () => {
    // ...
  })
  
  it('empty days do not count nor break streak', () => {
    // ...
  })
})
```

**Step 2: Implement**
```typescript
// src/domain/services/ConsistencyCalculator.ts
export class ConsistencyCalculator {
  calculate(sessions: StudySession[], schedules: Schedule[]): ConsistencyMetrics {
    const daysMap = this.groupByDate(sessions, schedules)
    const classifiedDays = daysMap.map(day => this.classifyDay(day))
    const activeDays = classifiedDays.filter(d => d.hasScheduledSubjects)
    
    return {
      currentStreak: this.calculateCurrentStreak(activeDays),
      longestStreak: this.calculateLongestStreak(activeDays),
      totalActiveDays: activeDays.length,
      adherenceRate: activeDays.length > 0 
        ? activeDays.reduce((sum, d) => sum + d.adherenceRate, 0) / activeDays.length
        : 0
    }
  }
  
  private classifyDay(day: DayData): ClassifiedDay {
    if (!day.hasScheduledSubjects) {
      return { ...day, status: 'empty', countsForStreak: false }
    }
    const adherence = day.sessions.reduce((sum, s) => sum + s.adherenceRate, 0) / day.sessions.length
    
    if (adherence >= 0.8) return { ...day, status: 'completed', countsForStreak: true }
    if (adherence > 0) return { ...day, status: 'partial', countsForStreak: true }
    return { ...day, status: 'skipped', countsForStreak: true }
  }
  
  private calculateCurrentStreak(activeDays: ClassifiedDay[]): number {
    let streak = 0
    for (const day of activeDays.reverse()) {
      if (day.status === 'completed') streak++
      else break
    }
    return streak
  }
}
```

**Step 3: Run tests** → All pass

**Commit:** `feat(domain): ConsistencyCalculator with streak logic`

---

### Task 1.3: RankingScorer

**Objective:** Implementar score composto (0.4C + 0.3V + 0.3R).

**Files:**
- Create: `src/domain/services/RankingScorer.ts`

**Step 1: Write tests with golden master fixtures**
```typescript
// tests/domain/services/RankingScorer.test.ts
describe('RankingScorer', () => {
  const scorer = new RankingScorer()
  
  const goldenFixtures = [
    {
      name: 'perfect user',
      input: { currentStreak: 30, adherenceRate: 1.0, totalHours: 100, targetHours: 80, gaps: [1,1,1,1] },
      expectedScore: 950 // golden master
    },
    {
      name: 'inconsistent user',
      input: { currentStreak: 2, adherenceRate: 0.4, totalHours: 20, targetHours: 80, gaps: [1,5,2,7] },
      expectedScore: 350
    },
    // ... more fixtures
  ]
  
  goldenFixtures.forEach(({name, input, expectedScore}) => {
    it(`calculates correct score for ${name}`, () => {
      const score = scorer.calculate(input)
      expect(score).toBe(expectedScore)
    })
  })
})
```

**Step 2: Implement**
```typescript
// src/domain/services/RankingScorer.ts
export class RankingScorer {
  private readonly weights = { consistency: 0.40, volume: 0.30, regularity: 0.30 } as const
  
  calculate(user: User, metrics: ConsistencyMetrics, period: Period): number {
    const factors = this.extractFactors(user, metrics, period)
    const score = (
      factors.consistencyScore * this.weights.consistency +
      factors.volumeScore * this.weights.volume +
      factors.regularityScore * this.weights.regularity
    ) * 1000
    return Math.round(score)
  }
  
  private extractFactors(user: User, metrics: ConsistencyMetrics, period: Period): RankingFactors {
    const maxPossibleStreak = period.daysWithScheduledSubjects
    const streakRatio = Math.min(metrics.currentStreak / maxPossibleStreak, 1)
    const consistencyScore = (streakRatio * 0.7) + (metrics.adherenceRate * 0.3)
    
    const targetHours = user.weeklyTargetHours * period.weeks
    const actualHours = this.getTotalHours(user.id, period)
    const volumeScore = Math.min(actualHours / targetHours, 1.5)
    
    const gaps = this.getGapsBetweenSessions(user.id, period)
    const cv = this.coefficientOfVariation(gaps)
    const regularityScore = cv === 0 ? 1 : Math.max(0, 1 - cv)
    
    return { consistencyScore, volumeScore, regularityScore }
  }
  
  private coefficientOfVariation(values: number[]): number {
    if (values.length < 2) return 0
    const mean = values.reduce((a,b) => a+b, 0) / values.length
    const std = Math.sqrt(values.reduce((sum, v) => sum + (v - mean)**2, 0) / values.length)
    return mean === 0 ? 0 : std / mean
  }
}
```

**Commit:** `feat(domain): RankingScorer with composite scoring`

---

## Fase 2: Events & Projections

### Task 2.1: Domain Events

**Files:**
- Create: `src/domain/events/StudySessionCompleted.ts`
- Create: `src/domain/events/StreakUpdated.ts`
- Create: `src/domain/events/RankingRecalculated.ts`

**Step: Implement event classes with Zod schemas**
```typescript
// src/domain/events/StudySessionCompleted.ts
export const StudySessionCompletedSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.literal('StudySessionCompleted'),
  timestamp: z.string().datetime(),
  aggregateId: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string().uuid(),
  scheduledDate: z.string().date(),
  scheduledSubjects: z.array(z.string()),
  actualDurationMinutes: z.number().int().positive(),
  completedSubjects: z.array(z.string()),
  adherenceRate: z.number().min(0).max(1),
  status: z.enum(['completed', 'partial'])
})

export type StudySessionCompleted = z.infer<typeof StudySessionCompletedSchema>
```

**Commit:** `feat(domain): domain events with Zod validation`

---

### Task 2.2: Read Model Projections (CQRS)

**Files:**
- Create: `src/domain/projections/UserConsistencyProjection.ts`
- Create: `src/domain/projections/UserRankingProjection.ts`
- Create: `src/application/projections/ProjectionHandler.ts`

**Step: Implement projection handlers**
```typescript
// src/application/projections/ProjectionHandler.ts
export class ProjectionHandler {
  constructor(
    private consistencyRepo: ConsistencyRepository,
    private rankingRepo: RankingRepository
  ) {}
  
  async handleStudySessionCompleted(event: StudySessionCompleted): Promise<void> {
    // 1. Update consistency projection
    const sessions = await this.consistencyRepo.getSessionsByUser(event.userId)
    const schedules = await this.consistencyRepo.getSchedulesByUser(event.userId)
    const metrics = this.consistencyCalculator.calculate(sessions, schedules)
    await this.consistencyRepo.upsert({ userId: event.userId, ...metrics })
    
    // 2. Emit StreakUpdated event if changed
    // 3. Trigger ranking recalc (async via event bus)
    await this.eventBus.publish(new RankingRecalculatedRequest({ userId: event.userId }))
  }
  
  async handleRecalculateRanking(request: RankingRecalculatedRequest): Promise<void> {
    const user = await this.userRepo.findById(request.userId)
    const metrics = await this.consistencyRepo.findByUserId(request.userId)
    const period = Period.last30Days()
    const score = this.rankingScorer.calculate(user, metrics, period)
    
    await this.rankingRepo.upsert({
      userId: request.userId,
      score,
      factors: this.extractFactors(user, metrics, period),
      period: 'monthly',
      updatedAt: new Date()
    })
  }
}
```

**Commit:** `feat(application): CQRS projections for consistency & ranking`

---

## Fase 3: Persistence Layer

### Task 3.1: Postgres Repositories

**Files:**
- Create: `src/infrastructure/persistence/postgres/PostgresConsistencyRepo.ts`
- Create: `src/infrastructure/persistence/postgres/PostgresRankingRepo.ts`
- Create: `src/infrastructure/persistence/postgres/schema.sql`

**Step: SQL Schema**
```sql
-- infrastructure/persistence/postgres/schema.sql
CREATE TABLE user_consistency (
  user_id UUID PRIMARY KEY,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  total_active_days INT NOT NULL DEFAULT 0,
  adherence_rate DECIMAL(4,3) NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_ranking (
  user_id UUID PRIMARY KEY,
  score BIGINT NOT NULL DEFAULT 0,
  rank INT,
  percentile DECIMAL(5,2),
  consistency_score DECIMAL(5,3),
  volume_score DECIMAL(5,3),
  regularity_score DECIMAL(5,3),
  period VARCHAR(20) NOT NULL DEFAULT 'monthly',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_ranking_score ON user_ranking (score DESC);
CREATE INDEX idx_user_ranking_period ON user_ranking (period);
```

**Step: Implement repositories with parameterized queries**
```typescript
// infrastructure/persistence/postgres/PostgresConsistencyRepo.ts
export class PostgresConsistencyRepo implements ConsistencyRepository {
  constructor(private pool: Pool) {}
  
  async upsert(metrics: ConsistencyMetrics): Promise<void> {
    await this.pool.query(`
      INSERT INTO user_consistency (user_id, current_streak, longest_streak, total_active_days, adherence_rate, last_active_date, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        total_active_days = EXCLUDED.total_active_days,
        adherence_rate = EXCLUDED.adherence_rate,
        last_active_date = EXCLUDED.last_active_date,
        updated_at = NOW()
    `, [metrics.userId, metrics.currentStreak, metrics.longestStreak, metrics.totalActiveDays, metrics.adherenceRate, metrics.lastActiveDate])
  }
  
  async findByUserId(userId: string): Promise<ConsistencyMetrics | null> { ... }
}
```

**Commit:** `feat(infrastructure): Postgres repositories for consistency & ranking`

---

## Fase 4: Application Layer

### Task 4.1: Use Cases

**Files:**
- Create: `src/application/use-cases/CompleteSessionUseCase.ts`
- Create: `src/application/use-cases/GetConsistencyUseCase.ts`
- Create: `src/application/use-cases/GetRankingUseCase.ts`
- Create: `src/application/use-cases/RecalculateRankingUseCase.ts`

```typescript
// application/use-cases/CompleteSessionUseCase.ts
export class CompleteSessionUseCase {
  constructor(
    private sessionRepo: SessionRepository,
    private eventBus: EventBus,
    private consistencyCalc: ConsistencyCalculator
  ) {}
  
  async execute(cmd: CompleteSessionCommand): Promise<CompleteSessionResponse> {
    // 1. Load session
    const session = await this.sessionRepo.findById(cmd.sessionId)
    if (!session) throw new SessionNotFoundError(cmd.sessionId)
    
    // 2. Mark completed
    const completedSession = session.complete({
      completedSubjectIds: cmd.completedSubjectIds,
      actualStartTime: cmd.actualStartTime,
      actualEndTime: cmd.actualEndTime
    })
    
    // 3. Persist
    await this.sessionRepo.save(completedSession)
    
    // 4. Emit domain event
    const event = StudySessionCompleted.fromSession(completedSession)
    await this.eventBus.publish(event)
    
    // 4. Return updated metrics (read from projections)
    const consistency = await this.consistencyRepo.findByUserId(session.userId)
    const ranking = await this.rankingRepo.findByUserId(session.userId)
    
    return { session: completedSession, consistency, ranking }
  }
}
```

**Commit:** `feat(application): CompleteSession, GetConsistency, GetRanking use cases`

---

### Task 4.2: API Endpoints

**Files:**
- Create: `src/presentation/api/consistency.ts`
- Create: `src/presentation/api/ranking.ts`

```typescript
// presentation/api/consistency.ts
router.get('/users/:userId/consistency', async (req, res) => {
  const useCase = container.get(GetConsistencyUseCase)
  const result = await useCase.execute({ userId: req.params.userId })
  res.json(result)
})

router.post('/sessions/:sessionId/complete', async (req, res) => {
  const useCase = container.get(CompleteSessionUseCase)
  const result = await useCase.execute({
    sessionId: req.params.sessionId,
    ...req.body
  })
  res.status(201).json(result)
})
```

**Commit:** `feat(api): consistency & ranking REST endpoints`

---

## Fase 5: Testing & Quality

### Task 5.1: Integration Tests

**Files:**
- Create: `tests/integration/CompleteSessionFlow.test.ts`
- Create: `tests/integration/StreakCalculation.test.ts`
- Create: `tests/integration/RankingRecalculation.test.ts`

```typescript
// tests/integration/StreakCalculation.test.ts
describe('Streak Calculation E2E', () => {
  let app: App
  let userId: string
  
  beforeEach(async () => {
    app = await createTestApp()
    userId = await createTestUser()
  })
  
  it('streak increments on completed days with scheduled subjects', async () => {
    // Day 1: create schedule with subjects
    await scheduleSubjects(userId, '2024-01-01', ['Math'])
    await completeSession(userId, '2024-01-01', { adherence: 1.0 })
    expect((await getConsistency(userId)).currentStreak).toBe(1)
    
    // Day 2: no subjects scheduled
    await completeSession(userId, '2024-01-02', { hasScheduled: false })
    expect((await getConsistency(userId)).currentStreak).toBe(1) // unchanged
    
    // Day 3: completed
    await scheduleSubjects(userId, '2024-01-03', ['Math'])
    await completeSession(userId, '2024-01-03', { adherence: 1.0 })
    expect((await getConsistency(userId)).currentStreak).toBe(2)
  })
  
  it('breaks streak on partial adherence', async () => {
    // ...
  })
})
```

**Commit:** `test(integration): streak calculation and ranking recalculation e2e`

---

### Task 5.2: Property-Based Tests (Domain)

```typescript
// tests/domain/ConsistencyCalculator.property.test.ts
import { fc } from '@fast-check/vitest'

describe('ConsistencyCalculator properties', () => {
  it('streak never negative', () => {
    fc.assert(fc.property(fc.array(sessionArb), fc.array(scheduleArb), (sessions, schedules) => {
      const result = calculator.calculate(sessions, schedules)
      expect(result.currentStreak).toBeGreaterThanOrEqual(0)
    }))
  })
  
  it('longestStreak >= currentStreak', () => {
    fc.assert(fc.property(fc.array(sessionArb), fc.array(scheduleArb), (sessions, schedules) => {
      const result = calculator.calculate(sessions, schedules)
      expect(result.longestStreak).toBeGreaterThanOrEqual(result.currentStreak)
    }))
  })
  
  it('adherenceRate between 0 and 1', () => {
    fc.assert(fc.property(fc.array(sessionArb), fc.array(scheduleArb), (sessions, schedules) => {
      const result = calculator.calculate(sessions, schedules)
      expect(result.adherenceRate).toBeGreaterThanOrEqual(0)
      expect(result.adherenceRate).toBeLessThanOrEqual(1)
    }))
  })
})
```

**Commit:** `test(property): property-based tests for consistency calculator`

---

## Fase 6: Observability & Deploy

### Task 6.1: Metrics & Alerts

**Files:**
- Create: `src/infrastructure/observability/metrics.ts`
- Create: `monitoring/alerts.yaml`

```typescript
// infrastructure/observability/metrics.ts
import { metrics } from '@opentelemetry/api'

export const tutorialMetrics = {
  streakCalculations: metrics.getMeter('tutorial').createCounter('streak_calculations_total'),
  rankingRecalcDuration: metrics.getMeter('tutorial').createHistogram('ranking_recalc_duration_seconds'),
  streakCalcErrors: metrics.getMeter('tutorial').createCounter('streak_calc_errors_total'),
}

// Usage in calculator
export class ConsistencyCalculator {
  calculate(...) {
    const start = Date.now()
    try {
      const result = this.doCalculate(...)
      metrics.streakCalculations.add(1, { result: 'success' })
      return result
    } catch (e) {
      metrics.streakCalcErrors.add(1, { error: e.message })
      throw e
    } finally {
      metrics.rankingRecalcDuration.record((Date.now() - start) / 1000)
    }
  }
}
```

**Commit:** `feat(observability): metrics and structured logging`

---

### Task 6.2: Database Migrations

**Files:**
- Create: `migrations/001_create_consistency_tables.sql`
- Create: `migrations/002_create_ranking_tables.sql`
- Create: `migrations/003_backfill_consistency_from_sessions.sql`

```sql
-- migrations/003_backfill_consistency_from_sessions.sql
-- Recalcula consistency para usuários existentes
INSERT INTO user_consistency (user_id, current_streak, longest_streak, total_active_days, adherence_rate, last_active_date, updated_at)
SELECT 
  s.user_id,
  0 as current_streak, -- será recalculado pelo job
  0 as longest_streak,
  COUNT(DISTINCT DATE(s.completed_at)) as total_active_days,
  AVG(s.adherence_rate) as adherence_rate,
  MAX(DATE(s.completed_at)) as last_active_date,
  NOW() as updated_at
FROM study_sessions s
WHERE s.status IN ('completed', 'partial')
GROUP BY s.user_id
ON CONFLICT (user_id) DO UPDATE SET
  total_active_days = EXCLUDED.total_active_days,
  adherence_rate = EXCLUDED.adherence_rate,
  last_active_date = EXCLUDED.last_active_date,
  updated_at = NOW();
```

**Commit:** `feat(db): migrations for consistency & ranking tables`

---

### Task 6.3: Backfill Job

**Files:**
- Create: `src/infrastructure/jobs/BackfillConsistencyJob.ts`

```typescript
// infrastructure/jobs/BackfillConsistencyJob.ts
export class BackfillConsistencyJob {
  async run(): Promise<void> {
    const users = await this.userRepo.findAllWithSessions()
    for (const user of users) {
      const sessions = await this.sessionRepo.findByUser(user.id)
      const schedules = await this.scheduleRepo.findByUser(user.id)
      const metrics = this.consistencyCalculator.calculate(sessions, schedules)
      await this.consistencyRepo.upsert({ userId: user.id, ...metrics })
      
      // Trigger ranking recalc
      await this.eventBus.publish(new RankingRecalculatedRequest({ userId: user.id }))
    }
  }
}
```

**Commit:** `feat(jobs): backfill consistency for existing users`

---

**Commit:** `feat(jobs): backfill consistency for existing users`

---

## Fase 7: Export Engine

### Task 7.1: Export Value Objects & Config
**Files:** `src/domain/value-objects/ExportConfig.ts`, `src/domain/value-objects/ExportResult.ts`, tests

**Steps:**
1. Write tests for ExportConfig validation (format, template, sections, styling)
2. Implement `ExportConfig`, `ExportRequest`, `ExportResult`, `ExportConfigSchema`
3. Run tests: `pnpm test tests/domain/value-objects/ExportConfig.test.ts`

**Commit:** `feat(domain): ExportConfig, ExportResult value objects`

---

### Task 7.2: ExportEngine - PDF Generation
**Files:** `src/domain/services/ExportEngine.ts`, `src/infrastructure/services/PDFExportService.ts`, tests

**Steps:**
1. Write tests for PDF generation (cover, summary, calendar, schedule, subjects, ranking)
2. Implement `PDFExportService.generate()` using pdf-lib
3. Implement template rendering for plan-summary, plan-detailed, ranking-report
4. Run tests: `pnpm test tests/domain/services/ExportEngine.test.ts`

**Commit:** `feat(domain): ExportEngine PDF generation with pdf-lib`

---

### Task 7.3: ExportEngine - Excel Generation
**Files:** `src/infrastructure/services/ExcelExportService.ts`, tests

**Steps:**
1. Write tests for Excel generation (6 sheets: Resumo, Calendário, Cronograma, Matérias, Sessões, Ranking)
2. Implement `ExcelExportService.generate()` using ExcelJS
3. Run tests: `pnpm test tests/infrastructure/services/ExcelExportService.test.ts`

**Commit:** `feat(infrastructure): ExportEngine Excel generation with ExcelJS`

---

### Task 7.4: ExportEngine - Styling & Theming
**Files:** `src/domain/services/ExportStyling.ts`, tests

**Steps:**
1. Write tests for theme config (light/dark/auto), colors, fonts, spacing
2. Implement `ThemeConfig`, `lightTheme`, `darkTheme`, `getTheme(config)`
3. Run tests

**Commit:** `feat(domain): ExportEngine styling & theming (light/dark/auto)`

---

### Task 7.4: Export Use Cases & API
**Files:** 
- `src/application/use-cases/ExportPlanUseCase.ts`
- `src/application/use-cases/ExportRankingUseCase.ts`
- `src/application/use-cases/GetExportStatusUseCase.ts`
- `src/presentation/api/exports.ts`
- Tests

**Steps:**
1. Write tests for use cases
2. Implement use cases orchestrating ExportEngine
4. Implement REST endpoints (POST /exports, GET /exports/:id/status, GET /exports/:id/download)
5. Run tests

**Commit:** `feat(application): ExportPlan, ExportRanking, GetExportStatus use cases + API`

---

### Task 7.4: Export Background Job & Scheduling
**Files:** `src/infrastructure/jobs/ExportJob.ts`, `src/infrastructure/jobs/ScheduledExportJob.ts`, tests

**Steps:**
1. Write tests for ExportJob (process, error handling, notifications)
2. Implement `ExportJob.handle()` with status updates, storage upload, notifications
3. Implement `ScheduledExportJob` with cron (weekly Monday 8am, monthly 1st 9am)
4. Run tests

**Commit:** `feat(jobs): ExportJob async processing + ScheduledExportJob cron`

---

### Task 7.5: Export Database Schema & Migrations
**Files:** `migrations/004_create_export_tables.sql`, `005_create_export_storage_bucket.sql`

```sql
-- migrations/004_create_export_tables.sql
CREATE TABLE exports (
  export_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID,
  format VARCHAR(10) NOT NULL,
  template VARCHAR(50) NOT NULL,
  config JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  file_size_bytes BIGINT,
  checksum_sha256 VARCHAR(64),
  progress INT DEFAULT 0,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_exports_user_id ON exports (user_id);
CREATE INDEX idx_exports_status ON exports (status);
CREATE INDEX idx_exports_created_at ON exports (created_at);
```

**Commit:** `feat(db): export tables migration`

---

### Task 7.5: Export Repository & Data Loader
**Files:** 
- `src/infrastructure/persistence/postgres/PostgresExportRepo.ts`
- `src/application/loaders/ExportDataLoader.ts`
- Tests

**Steps:**
1. Implement `ExportRepository` (upsert, findById, findByUser, updateStatus)
2. Implement `ExportDataLoader.load()` aggregating Plan, Consistency, Ranking, Schedule data
3. Run tests

**Commit:** `feat(infrastructure): ExportRepository + ExportDataLoader`

---

### Task 7.6: Export API Endpoints
**Files:** `src/presentation/api/exports.ts`, tests

**Endpoints:**
- POST `/api/v1/exports` (export plan)
- POST `/api/v1/exports/ranking` (export ranking)
- GET `/api/v1/exports/:exportId/status`
- GET `/api/v1/exports/:exportId/download`
- GET `/api/v1/exports` (list with pagination)

**Commit:** `feat(api): export REST endpoints`

---

### Task 7.7: Export Observability & Tests
**Files:** `src/infrastructure/observability/exportMetrics.ts`, tests

```typescript
// Metrics
export_generated_total (counter)
export_duration_seconds (histogram)
export_errors_total (counter)
export_queue_depth (gauge)

# Alerts
export_errors > 1% in 5m
export_duration > 120s p99
```

**Tests:**
- Unit: PDF/Excel generation with fixtures
- Integration: ExportRequest → file → download
- Visual regression: PDF snapshot testing
- Load: 100 exports simultâneos < 60s

**Commit:** `feat(observability): export metrics + alerts + tests`

---

## Ordem de Execução Atualizada

```
1.1 → 1.2 → 1.3  (Domain Core)
    ↓
2.1 → 2.2       (Events & Projections)
    ↓
3.1             (Persistence)
    ↓
4.1 → 4.2       (Application & API)
    ↓
7.1 → 7.2 → 7.3 → 7.4 → 7.5 → 7.6 → 7.7 → 7.8  (Export Engine)
    ↓
5.1 → 5.2       (Tests)
    ↓
6.1 → 6.2 → 6.3 (Observability, Migrations, Backfill)
```

---

## Verificação Final por Fase (Atualizada)

```bash
# Fase 1
pnpm test tests/domain/          # Domain tests pass
pnpm run lint                    # No lint errors

# Fase 2-4
pnpm test tests/application/     # Use cases pass
pnpm test tests/integration/     # E2E flows pass
pnpm run build                   # Clean build

# Fase 7 (Export)
pnpm test tests/domain/services/ExportEngine.test.ts
pnpm test tests/infrastructure/services/ExcelExportService.test.ts
pnpm test tests/application/use-cases/ExportPlanUseCase.test.ts
pnpm test tests/integration/ExportFlow.test.ts
pnpm run build                   # Clean build

# Fase 5-6
pnpm test --coverage             # Coverage > 90% domain
pnpm run migrate                 # Migrations apply clean
pnpm run job:backfill            # Backfill completes
pnpm run job:export              # Export job processes queue
```

---

## Entregáveis para Codex

Este plano gera os seguintes artefatos implementáveis:

1. **Domain layer** tipado e testado (value objects, calculators, scorer)
2. **Event-driven architecture** com CQRS projections
3. **Postgres schema + repos** prontos para produção
4. **REST API** consistente com contratos definidos
5. **Test suite** (unit + property-based + integration)
6. **Observability** instrumentada
7. **Migrations + backfill job** para dados existentes

---

**Pronto para implementação pelo Codex.** Cada task é atômica, tem testes definidos e ordem de dependência clara.