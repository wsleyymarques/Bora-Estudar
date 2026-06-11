# Specify: Sistema de Rankeamento e Constância v2.0

> **Versão:** 2.0.0  
> **Data:** 2026-06-09  
> **Status:** Baseline Specification

---

## 1. Visão Geral

Sistema de métricas de estudo composto por duas engines independentes:

| Engine | Responsabilidade | Input | Output |
|--------|------------------|-------|--------|
| **ConsistencyEngine** | Calcula dias de constância baseados em execução real | `StudySessionCompleted[]`, `Schedule[]` | `ConsistencyMetrics { currentStreak, longestStreak, totalActiveDays, adherenceRate }` |
| **RankingEngine** | Ordena usuários por score composto | `UserMetrics[]`, `ConsistencyMetrics[]` | `RankingPosition[]` |
| **ExportEngine** | Exporta planos em PDF/Excel estilizados | `Plan`, `ConsistencyMetrics`, `RankingMetrics` | `ExportResult { fileUrl, format, size }` |

---

## 2. Personas & Casos de Uso

### Persona Principal: "Estudante Consistente"
- Estuda 5-6 dias/semana
- Quer ver progresso real (não dias de calendário)
- Compete no ranking semanal/mensal

### Casos de Uso Principais

| UC | Descrição |
|----|-----------|
| **UC-01** | Calcular constância baseada apenas em dias com matéria agendada |
| **UC-02** | Não quebrar streak se dia não tinha matéria agendada |
| **UC-03** | Quebrar streak se tinha matéria e não fez (adherence < 80%) |
| **UC-04** | Rankear usuários por score: consistência (40%) + volume (30%) + regularidade (30%) |
| **UC-05** | Recalcular ranking incrementalmente a cada sessão concluída |
| **UC-06** | Auditoria: reproduzir score de qualquer usuário em qualquer data |
| **UC-07** | Exportar plano de estudos em PDF (visual, com calendar, métricas) |
| **UC-08** | Exportar plano de estudos em Excel (dados tabulares, métricas, cronograma) |
| **UC-09** | Exportar relatório de rankeamento (PDF/Excel) com posição, score, factores |
| **UC-10** | Agendar exportação automática (semanal/mensal) por email |

---

## 3. Especificação Funcional

### 3.1 ConsistencyEngine

#### Value Objects

```typescript
// domain/value-objects/StudySession.ts
interface StudySession {
  id: string
  userId: string
  planId: string
  scheduledDate: LocalDate      // data agendada
  scheduledSubjects: Subject[]  // matérias previstas
  actualStartTime?: DateTime
  actualEndTime?: DateTime
  completedSubjects: Subject[]  // matérias efetivamente feitas
  adherenceRate: number         // 0-1 (concluído / agendado)
  status: 'completed' | 'partial' | 'skipped'
}

// domain/value-objects/ScheduledDay.ts
interface ScheduledDay {
  date: LocalDate
  hasScheduledSubjects: boolean
  subjects: Subject[]
  sessions: StudySession[]
  adherenceRate: number
  status: 'completed' | 'partial' | 'skipped' | 'empty'
}
```

#### Regras de Constância (Core Logic)

```typescript
// domain/services/ConsistencyCalculator.ts
class ConsistencyCalculator {
  calculate(sessions: StudySession[], schedules: Schedule[]): ConsistencyMetrics {
    // 1. Agrupar por data
    const daysMap = this.groupByDate(sessions, schedules)
    
    // 2. Classificar cada dia
    const classifiedDays = daysMap.map(day => this.classifyDay(day))
    
    // 3. Calcular streak Atual (apenas dias com matéria agendada)
    const activeDays = classifiedDays.filter(d => d.hasScheduledSubjects)
    const currentStreak = this.calculateCurrentStreak(activeDays)
    
    // 4. Longest streak histórico
    const longestStreak = this.calculateLongestStreak(activeDays)
    
    // 5. Total de dias ativos (com matéria agendada)
    const totalActiveDays = activeDays.length
    
    // 6. Taxa de aderência média
    const adherenceRate = activeDays.reduce((sum, d) => sum + d.adherenceRate, 0) / activeDays.length
    
    return { currentStreak, longestStreak, totalActiveDays, adherenceRate }
  }

  private classifyDay(day: DayData): ClassifiedDay {
    if (!day.hasScheduledSubjects) {
      return { ...day, status: 'empty', countsForStreak: false }
    }
    
    const adherence = day.sessions.reduce((sum, s) => sum + s.adherenceRate, 0) / day.sessions.length
    
    if (adherence >= 0.8) return { ...day, status: 'completed', adherenceRate: adherence, countsForStreak: true }
    if (adherence > 0) return { ...day, status: 'partial', adherenceRate: adherence, countsForStreak: true }
    return { ...day, status: 'skipped', adherenceRate: 0, countsForStreak: true }
  }

  private calculateCurrentStreak(activeDays: ClassifiedDay[]): number {
    let streak = 0
    // Percorre do mais recente para o mais antigo
    for (const day of activeDays.reverse()) {
      if (day.status === 'completed') streak++
      else break // partial ou skipped quebra
    }
    return streak
  }
}
```

#### Regras de Classificação de Dia

| Cenário | Tem matéria agendada? | Adesão | Conta para Streak? | Status |
|---------|----------------------|--------|-------------------|--------|
| Fez tudo | Sim | ≥ 80% | ✅ Sim | `completed` |
| Fez parte | Sim | > 0% < 80% | ❌ Não (quebra) | `partial` |
| Não fez nada | Sim | 0% | ❌ Não (quebra) | `skipped` |
| Não tinha matéria | Não | N/A | N/A (ignora) | `empty` |

---

### 3.2 RankingEngine

#### Score Composition

```typescript
// domain/services/RankingScorer.ts
interface RankingFactors {
  // Consistência (40%) - streak normalizado + adherence
  consistencyScore: number
  
  // Volume (30%) - horas totais estudadas no período
  volumeScore: number
  
  // Regularidade (30%) - variância inversa de gaps entre sessões
  regularityScore: number
}

interface RankingWeights {
  consistency: 0.40
  volume: 0.30
  regularity: 0.30
}

class RankingScorer {
  calculate(user: User, metrics: ConsistencyMetrics, period: Period): number {
    const factors = this.extractFactors(user, metrics, period)
    
    return (
      factors.consistencyScore * 0.40 +
      factors.volumeScore * 0.30 +
      factors.regularityScore * 0.30
    ) * 1000 // Scale para inteiro
  }

  private extractFactors(user: User, metrics: ConsistencyMetrics, period: Period): RankingFactors {
    // Consistency: streak atual normalizado + adherence rate
    const maxPossibleStreak = period.daysWithScheduledSubjects
    const streakRatio = Math.min(metrics.currentStreak / maxPossibleStreak, 1)
    const consistencyScore = (streakRatio * 0.7) + (metrics.adherenceRate * 0.3)
    
    // Volume: horas estudadas / meta semanal * semanas no período
    const targetHours = user.weeklyTargetHours * period.weeks
    const actualHours = this.getTotalHours(user, period)
    const volumeScore = Math.min(actualHours / targetHours, 1.5) // Cap em 150%
    
    // Regularity: inverso do coeficiente de variação dos gaps
    const gaps = this.getGapsBetweenSessions(user, period)
    const cv = this.coefficientOfVariation(gaps)
    const regularityScore = cv === 0 ? 1 : Math.max(0, 1 - cv)
    
    return { consistencyScore, volumeScore, regularityScore }
  }
}
```

#### Fórmulas Detalhadas

| Componente | Fórmula | Peso |
|------------|---------|------|
| **Consistency** | `(streakRatio × 0.7) + (adherenceRate × 0.3)` | 40% |
| **Volume** | `min(actualHours / targetHours, 1.5)` | 30% |
| **Regularity** | `max(0, 1 - CV(gaps))` | 30% |

Onde:
- `streakRatio = currentStreak / maxPossibleStreak` (dias com matéria no período)
- `CV = standardDeviation(gaps) / mean(gaps)` (coeficiente de variação)

---

### 3.3 Event Store (Source of Truth)

```typescript
// domain/events/StudySessionCompleted.ts
interface StudySessionCompleted {
  eventId: string          // UUID v4
  eventType: 'StudySessionCompleted'
  timestamp: DateTime      // UTC
  aggregateId: string      // Session ID
  userId: string
  planId: string
  scheduledDate: LocalDate
  scheduledSubjects: Subject[]
  actualDurationMinutes: number
  completedSubjects: Subject[]
  adherenceRate: number    // 0-1
  status: 'completed' | 'partial'
}

// Projections (Read Models)
interface UserConsistencyProjection {
  userId: string
  currentStreak: number
  longestStreak: number
  totalActiveDays: number
  adherenceRate: number
  lastActiveDate: LocalDate
  updatedAt: DateTime
}

interface UserRankingProjection {
  userId: string
  score: number
  rank: number
  percentile: number
  period: 'weekly' | 'monthly' | 'alltime'
  consistencyScore: number
  volumeScore: number
  regularityScore: number
  updatedAt: DateTime
}
```

---

## 4. Non-Functional Requirements

| Categoria | Requisito |
|-----------|-----------|
| **Performance** | Cálculo de streak < 10ms para 10k sessões; Ranking recalc < 100ms para 100k users |
| **Escalabilidade** | Horizontal via partition por `userId`; Read models materializados |
| **Consistência** | Eventual consistency < 5s para projeções; Strong consistency no event store |
| **Auditabilidade** | Log completo de inputs/outputs do scorer; Replay capability |
| **Testabilidade** | Property-based tests para streak calculator; Golden master para scorer |

---

## 5. Edge Cases & Regras de Negócio

| Cenário | Comportamento Esperado |
|---------|------------------------|
| Usuário cria plano mas não agenda nada | Streak = 0, não quebra nem conta |
| Feriado/folgas planejadas | Marcar dia como `empty` (não conta, não quebra) |
| Usuário muda timezone | Datas baseadas em `LocalDate` do usuário |
| Sessão marcada como "skip" intencional | Conta como `skipped` (quebra streak) |
| Sessão parcial (50%) | Status `partial` → quebra streak atual |
| Recálculo manual (admin) | Reprocessa events → atualiza projections |
| Novo usuário (sem histórico) | Streak = 0, Score = 0, Rank = último |

---

## 6. API Contracts

### Commands (Write)

```typescript
// POST /api/v1/sessions/complete
interface CompleteSessionCommand {
  sessionId: string
  completedSubjectIds: string[]
  actualStartTime: DateTime
  actualEndTime: DateTime
}

// Response
interface CompleteSessionResponse {
  session: StudySession
  updatedConsistency: ConsistencyMetrics
  updatedRanking: UserRankingProjection
}
```

### Queries (Read)

```typescript
// GET /api/v1/users/{userId}/consistency
interface ConsistencyResponse {
  currentStreak: number
  longestStreak: number
  totalActiveDays: number
  adherenceRate: number
  calendar: DayStatus[]  // último ano
}

// GET /api/v1/ranking?period=weekly
interface RankingResponse {
  userRank: number
  totalUsers: number
  score: number
  percentile: number
  factors: RankingFactors
  leaderboard: UserRankEntry[]  // top 10
}
```

---

## 7. Critérios de Aceite (DoD)

1. **ConsistencyEngine**
   - [ ] Streak ignora dias sem matéria agendada
   - [ ] Streak quebra em `partial` (<80%) e `skipped`
   - [ ] `empty` days não contam nem quebram
   - [ ] Testes: 50+ cenários property-based

2. **RankingEngine**
   - [ ] Score = 0.4×C + 0.3×V + 0.3×R
   - [ ] Recalcula incrementalmente em <50ms
   - [ ] Golden master tests com fixtures conhecidos

3. **ExportEngine**
   - [ ] Gera PDF válido (pdf-lib) com todas as seções configuradas
   - [ ] Gera Excel válido (ExcelJS) com 6 sheets corretas
   - [ ] Suporte a temas light/dark/auto
   - [ ] Suporte a locale pt-BR/en-US
   - [ ] Template plan-summary passa em validação visual
   - [ ] Template plan-detailed tem 6 sheets com dados corretos
   - [ ] Template ranking-report inclui leaderboard + fatores
   - [ ] Job assíncrono processa em <30s para plano típico
   - [ ] URL assinada expira em 24h
   - [ ] Checksum SHA256 validado no download

4. **Integração**
   - [ ] Event `StudySessionCompleted` → atualiza projections em <5s
   - [ ] Query consistency < 10ms p99
   - [ ] Audit log completo para auditoria
   - [ ] Event `ExportRequested` → Job assíncrono → `ExportCompleted`/`ExportFailed`
   - [ ] Webhook `export.completed` notifica frontend
   - [ ] Auto-export semanal/mensal via cron
   - [ ] Rate limiting: máx 5 exports/hora por usuário

5. **Observabilidade**
   - [ ] Metrics: streak_calculations_total, ranking_recalc_duration_seconds
   - [ ] Alert: streak_calc_errors > 1% em 5min
   - [ ] Metrics: export_generated_total, export_duration_seconds, export_errors_total
   - [ ] Alert: export_errors > 1% em 5min

6. **Testes**
   - [ ] Unit: PDF/Excel generation com fixtures
   - [ ] Integration: ExportRequest → file → download
   - [ ] Visual regression: PDF snapshot testing
   - [ ] Load: 100 exports simultâneos < 60s