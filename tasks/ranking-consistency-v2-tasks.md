# Tasks: Sistema de Rankeamento e Constância v2.0 - Breakdown para Codex

> **Para execução via Codex task-by-task**
> Cada task = 1 commit | Testes definidos | Ordem de dependência

---

## Fase 1: Domain Core

### Task 1.1.1: Value Object - StudySession
**Files:** `src/domain/value-objects/StudySession.ts`, `tests/domain/value-objects/StudySession.test.ts`

**Steps:**
1. Write tests: créer session com adherence 1.0 (completed), 0.5 (partial), 0.0 (skipped)
2. Implement `StudySession.create()`, getters `adherenceRate`, `status`
3. Run tests: `pnpm test tests/domain/value-objects/StudySession.test.ts`

**Commit:** `feat(domain): StudySession value object`

---

### Task 1.1.2: Value Object - ScheduledDay
**Files:** `src/domain/value-objects/ScheduledDay.ts`, `tests/domain/value-objects/ScheduledDay.test.ts`

**Steps:**
1. Write tests: dia com matérias, dia vazio, classificação
2. Implement `ScheduledDay.create()`, `hasScheduledSubjects`, `adherenceRate`
3. Run tests

**Commit:** `feat(domain): ScheduledDay value object`

---

### Task 1.1.3: Value Objects - ConsistencyMetrics, RankingFactors
**Files:** `src/domain/value-objects/ConsistencyMetrics.ts`, `src/domain/value-objects/RankingFactors.ts`, `src/domain/value-objects/index.ts`, tests

**Steps:**
1. Write tests para validação de ranges (streak ≥ 0, adherence 0-1, score ≥ 0)
2. Implement classes com validação no constructor
4. Export barrel em `index.ts`
5. Run tests

**Commit:** `feat(domain): ConsistencyMetrics, RankingFactors value objects`

---

### Task 1.2.1: ConsistencyCalculator - Core Logic
**Files:** `src/domain/services/ConsistencyCalculator.ts`, `tests/domain/services/ConsistencyCalculator.test.ts`

**Tests to implement:**
```typescript
// tests/domain/services/ConsistencyCalculator.test.ts
it('streak ignores empty days (no scheduled subjects)', () => { ... })
it('breaks streak on partial adherence (<80%)', () => { ... })
it('breaks streak on skipped day (0%)', () => { ... })
it('empty days do not count nor break streak', () => { ... })
it('longestStreak >= currentStreak', () => { ... })
it('adherenceRate between 0 and 1', () => { ... })
```

**Implementation:**
- `groupByDate()` → agrupa sessões + schedules por LocalDate
- `classifyDay()` → empty/completed/partial/skipped
- `calculateCurrentStreak()` → percorre reverso, para em não-completed
- `calculateLongestStreak()` → max streak histórico

**Commands:**
```bash
pnpm test tests/domain/services/ConsistencyCalculator.test.ts
```

**Commit:** `feat(domain): ConsistencyCalculator with streak logic`

---

### Task 1.3.1: RankingScorer
**Files:** `src/domain/services/RankingScorer.ts`, `tests/domain/services/RankingScorer.test.ts`

**Golden Master Fixtures:**
```typescript
const fixtures = [
  { name: 'perfect', input: { streak: 30, adherence: 1.0, hours: 100, target: 80, gaps: [1,1,1,1] }, expected: 950 },
  { name: 'inconsistent', input: { streak: 2, adherence: 0.4, hours: 20, target: 80, gaps: [1,5,2,7] }, expected: 350 },
  { name: 'new user', input: { streak: 0, adherence: 0, hours: 0, target: 80, gaps: [] }, expected: 0 },
]
```

**Implementation:**
- `consistencyScore = (streakRatio * 0.7) + (adherence * 0.3)`
- `volumeScore = min(actualHours / targetHours, 1.5)`
- `regularityScore = max(0, 1 - CV(gaps))`
- `score = (0.4*C + 0.3*V + 0.3*R) * 1000`

**Tests:** Golden master + property-based (`score ≥ 0`, `consistency ≤ 1000`)

**Commit:** `feat(domain): RankingScorer with composite scoring`

---

## Fase 2: Events & Projections

### Task 2.1.1: Domain Events
**Files:** `src/domain/events/StudySessionCompleted.ts`, `StreakUpdated.ts`, `RankingRecalculated.ts`, tests

**Schema (Zod):**
```typescript
StudySessionCompletedSchema = z.object({
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
```

**Tests:** validação de schema, serialização/deserialização

**Commit:** `feat(domain): domain events with Zod validation`

---

### Task 2.2.1: CQRS Projections
**Files:** `src/domain/projections/UserConsistencyProjection.ts`, `UserRankingProjection.ts`, `src/application/projections/ProjectionHandler.ts`, tests

**ProjectionHandler:**
```typescript
async handleStudySessionCompleted(event: StudySessionCompleted) {
  // 1. Load sessions + schedules
  // 2. Calculate metrics via ConsistencyCalculator
  // 3. Upsert UserConsistencyProjection
  // 4. Emit RankingRecalculatedRequest (async)
}

async handleRecalculateRanking(request) {
  const user = await userRepo.findById(request.userId)
  const metrics = await consistencyRepo.findByUserId(request.userId)
  const score = rankingScorer.calculate(user, metrics, Period.last30Days())
  await rankingRepo.upsert({ userId, score, factors, period: 'monthly' })
}
```

**Tests:** integração event → projection → ranking update

**Commit:** `feat(application): CQRS projections for consistency & ranking`

---

## Fase 3: Persistence

### Task 3.1.1: Postgres Schema
**File:** `migrations/001_create_consistency_tables.sql`

```sql
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

**Commit:** `feat(db): schema for consistency & ranking tables`

---

### Task 3.1.2: Postgres Repositories
**Files:** `src/infrastructure/persistence/postgres/PostgresConsistencyRepo.ts`, `PostgresRankingRepo.ts`, tests

**Methods:**
```typescript
interface ConsistencyRepository {
  upsert(metrics: ConsistencyMetrics): Promise<void>
  findByUserId(userId: string): Promise<ConsistencyMetrics | null>
  getSessionsByUser(userId: string): Promise<StudySession[]>
  getSchedulesByUser(userId: string): Promise<Schedule[]>
}

interface RankingRepository {
  upsert(projection: UserRankingProjection): Promise<void>
  findByUserId(userId: string): Promise<UserRankingProjection | null>
  findLeaderboard(period: string, limit: number): Promise<UserRankingEntry[]>
}
```

**Tests:** integração com testcontainers Postgres

**Commit:** `feat(infrastructure): Postgres repositories`

---

## Fase 4: Application & API

### Task 4.1.1: Use Cases
**Files:** `CompleteSessionUseCase.ts`, `GetConsistencyUseCase.ts`, `GetRankingUseCase.ts`, `RecalculateRankingUseCase.ts`, tests

**CompleteSessionUseCase:**
```typescript
async execute(cmd: CompleteSessionCommand) {
  const session = await sessionRepo.findById(cmd.sessionId)
  const completed = session.complete({ ...cmd })
  await sessionRepo.save(completed)
  await eventBus.publish(StudySessionCompleted.fromSession(completed))
  
  // Read from projections (already updated by projection handler)
  const [consistency, ranking] = await Promise.all([
    consistencyRepo.findByUserId(session.userId),
    rankingRepo.findByUserId(session.userId)
  ])
  return { session: completed, consistency, ranking }
}
```

**Commit:** `feat(application): CompleteSession, GetConsistency, GetRanking use cases`

---

### Task 4.2.1: REST API Endpoints
**Files:** `src/presentation/api/consistency.ts`, `ranking.ts`, tests

**Endpoints:**
```typescript
GET    /api/v1/users/:userId/consistency        → ConsistencyResponse
POST   /api/v1/sessions/:sessionId/complete     → CompleteSessionResponse
GET    /api/v1/ranking?period=weekly|monthly    → RankingResponse
GET    /api/v1/ranking/leaderboard?period=monthly → LeaderboardResponse
```

**Commit:** `feat(api): consistency & ranking REST endpoints`

---

## Fase 5: Testing & Quality

### Task 5.1.1: Integration Tests
**File:** `tests/integration/CompleteSessionFlow.test.ts`, `StreakCalculation.test.ts`, `RankingRecalculation.test.ts`

```typescript
// StreakCalculation.test.ts
it('streak ignores empty days', async () => {
  await scheduleSubjects(userId, '2024-01-01', ['Math'])
  await completeSession(userId, '2024-01-01', { adherence: 1.0 })
  expect((await getConsistency(userId)).currentStreak).toBe(1)
  
  await completeSession(userId, '2024-01-02', { hasScheduled: false }) // empty
  expect((await getConsistency(userId)).currentStreak).toBe(1) // unchanged
  
  await completeSession(userId, '2024-01-03', { adherence: 1.0 })
  expect((await getConsistency(userId)).currentStreak).toBe(2)
})

it('breaks streak on partial (<80%)', async () => { ... })
```

**Commit:** `test(integration): streak calculation and ranking e2e`

---

### Task 5.2.1: Property-Based Tests (Domain)
**File:** `tests/domain/ConsistencyCalculator.property.test.ts`, `RankingScorer.property.test.ts`

```typescript
import { fc } from '@fast-check/vitest'

it('streak never negative', () => {
  fc.assert(fc.property(fc.array(sessionArb), fc.array(scheduleArb), (sessions, schedules) => {
    const result = calculator.calculate(sessions, schedules)
    expect(result.currentStreak).toBeGreaterThanOrEqual(0)
  }))
})

it('longestStreak >= currentStreak', () => { ... })
it('adherenceRate between 0 and 1', () => { ... })
it('score >= 0', () => { ... })
```

**Commit:** `test(property): property-based tests for domain services`

---

## Fase 6: Observability, Migrations & Backfill

### Task 6.1.1: Metrics & Alerts
**Files:** `src/infrastructure/observability/metrics.ts`, `monitoring/alerts.yaml`

```typescript
const metrics = {
  streakCalculations: meter.createCounter('streak_calculations_total'),
  rankingRecalcDuration: meter.createHistogram('ranking_recalc_duration_seconds'),
  streakCalcErrors: meter.createCounter('streak_calc_errors_total'),
}

alerts:
  - alert: HighStreakCalcErrors
    expr: rate(streak_calc_errors_total[5m]) > 0.01
    for: 2m
    labels: { severity: warning }
```

**Commit:** `feat(observability): metrics and alerts`

---

### Task 6.2.1: Migrations
**Files:** `migrations/001_create_consistency_tables.sql`, `002_create_ranking_tables.sql`, `003_backfill_consistency_from_sessions.sql`

```sql
-- 003_backfill_consistency_from_sessions.sql
INSERT INTO user_consistency (user_id, current_streak, longest_streak, total_active_days, adherence_rate, last_active_date, updated_at)
SELECT 
  s.user_id,
  0, 0,
  COUNT(DISTINCT DATE(s.completed_at)) as total_active_days,
  AVG(s.adherence_rate) as adherence_rate,
  MAX(DATE(s.completed_at)) as last_active_date,
  NOW()
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

### Task 6.3.1: Backfill Job
**File:** `src/infrastructure/jobs/BackfillConsistencyJob.ts`, tests

```typescript
async run(): Promise<void> {
  const users = await userRepo.findAllWithSessions()
  for (const user of users) {
    const sessions = await sessionRepo.findByUser(user.id)
    const schedules = await scheduleRepo.findByUser(user.id)
    const metrics = consistencyCalculator.calculate(sessions, schedules)
    await consistencyRepo.upsert({ userId: user.id, ...metrics })
    await eventBus.publish(new RankingRecalculatedRequest({ userId: user.id }))
  }
}
```

**Schedule:** rodar uma vez no deploy, depois manual se necessário

**Commit:** `feat(jobs): backfill consistency for existing users`

---

## Fase 7: Export Engine

### Task 7.1.1: Export Value Objects & Config
**Files:** `src/domain/value-objects/ExportConfig.ts`, `src/domain/value-objects/ExportResult.ts`, tests

**Steps:**
1. Write tests for ExportConfig validation (format, template, sections, styling)
2. Implement `ExportConfig`, `ExportRequest`, `ExportResult`, `ExportConfigSchema`
3. Run tests: `pnpm test tests/domain/value-objects/ExportConfig.test.ts`

**Commit:** `feat(domain): ExportConfig, ExportResult value objects`

---

### Task 7.2.1: ExportEngine - PDF Generation
**Files:** `src/domain/services/ExportEngine.ts`, `src/infrastructure/services/PDFExportService.ts`, tests

**Steps:**
1. Write tests for PDF generation (cover, summary, calendar, schedule, subjects, ranking)
2. Implement `PDFExportService.generate()` using pdf-lib
3. Implement template rendering for plan-summary, plan-detailed, ranking-report
4. Run tests: `pnpm test tests/domain/services/ExportEngine.test.ts`

**Commit:** `feat(domain): ExportEngine PDF generation with pdf-lib`

---

### Task 7.2.2: ExportEngine - Excel Generation
**Files:** `src/infrastructure/services/ExcelExportService.ts`, tests

**Steps:**
1. Write tests for Excel generation (6 sheets: Resumo, Calendário, Cronograma, Matérias, Sessões, Ranking)
2. Implement `ExcelExportService.generate()` using ExcelJS
3. Run tests: `pnpm test tests/infrastructure/services/ExcelExportService.test.ts`

**Commit:** `feat(infrastructure): ExportEngine Excel generation with ExcelJS`

---

### Task 7.3.1: ExportEngine - Styling & Theming
**Files:** `src/domain/services/ExportStyling.ts`, tests

**Steps:**
1. Write tests for theme config (light/dark/auto), colors, fonts, spacing
2. Implement `ThemeConfig`, `lightTheme`, `darkTheme`, `getTheme(config)`
3. Run tests

**Commit:** `feat(domain): ExportEngine styling & theming (light/dark/auto)`

---

### Task 7.4.1: Export Use Cases & API
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

### Task 7.4.2: Export Background Job & Scheduling
**Files:** `src/infrastructure/jobs/ExportJob.ts`, `src/infrastructure/jobs/ScheduledExportJob.ts`, tests

**Steps:**
1. Write tests for ExportJob (process, error handling, notifications)
2. Implement `ExportJob.handle()` with status updates, storage upload, notifications
3. Implement `ScheduledExportJob` with cron (weekly Monday 8am, monthly 1st 9am)
4. Run tests

**Commit:** `feat(jobs): ExportJob async processing + ScheduledExportJob cron`

---

### Task 7.5.1: Export Database Schema & Migrations
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

### Task 7.5.2: Export Repository & Data Loader
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

### Task 7.6.1: Export API Endpoints
**Files:** `src/presentation/api/exports.ts`, tests

**Endpoints:**
- POST `/api/v1/exports` (export plan)
- POST `/api/v1/exports/ranking` (export ranking)
- GET `/api/v1/exports/:exportId/status`
- GET `/api/v1/exports/:exportId/download`
- GET `/api/v1/exports` (list with pagination)

**Commit:** `feat(api): export REST endpoints`

---

### Task 7.6.2: Export Observability & Tests
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

## Ordem de Execução Final

```
1.1.1 → 1.1.2 → 1.1.3  (Value Objects)
    ↓
1.2.1                 (ConsistencyCalculator)
    ↓
1.3.1                 (RankingScorer)
    ↓
2.1.1                 (Events)
    ↓
2.2.1                 (Projections)
    ↓
3.1.1 → 3.1.2         (Schema + Repos)
    ↓
4.1.1 → 4.2.1         (Use Cases + API)
    ↓
7.1.1 → 7.2.1 → 7.2.2 → 7.3.1 → 7.4.1 → 7.4.2 → 7.5 → 7.6  (Export Engine)
    ↓
5.1.1 → 5.2.1         (Tests)
    ↓
6.1.1 → 6.2.1 → 6.3.1 (Observability, Migrations, Backfill)
```

---

## Checklist de Verificação por Commit

```bash
# Cada commit deve passar:
pnpm test tests/domain/              # Domain tests
pnpm test tests/application/         # Use cases
pnpm test tests/integration/         # E2E
pnpm run lint                        # Zero errors
pnpm run build                       # Clean build
pnpm run typecheck                   # Zero TS errors
```

---

**Pronto para execução pelo Codex.** Cada task é independente, tem testes definidos, e ordem de dependência clara.