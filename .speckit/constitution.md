# Constitution: Sistema de Rankeamento e Constância "Bora Estudar"

> **Última atualização:** 2026-06-09  
> **Versão:** 2.0.0  
> **Status:** Ativo

---

## Princípios Fundamentais

### 1. Constância Baseada em Execução Real
A constância **NÃO** conta dias consecutivos de calendário. Conta **apenas dias em que havia matéria agendada e foi executada** (marcada como concluída ≥ 80%).

### 2. Rankeamento Transparente e Auditável
O algoritmo de rankeamento deve ser **determinístico, reproduzível e explicável**. Qualquer usuário deve poder entender sua posição.

### 3. Dados como Fonte da Verdade
Todas as métricas derivam de eventos imutáveis: `StudySessionCompleted`, `ScheduleAdherence`, `PlanCreated`. Nada é calculado "no ar".

### 4. isolamento de Responsabilidades
- **ConsistencyEngine**: apenas calcula streak baseado em adherence
- **RankingEngine**: apenas ordena usuários por score
- **AnalyticsCollector**: apenas emite eventos

### 5. Testabilidade Obrigatória
Cada engine deve ter testes unitários (>90%) e testes de integração para cenários edge-case.

---

## Regras de Arquitetura

| Camada | Responsabilidade | Exemplo |
|--------|------------------|---------|
| **Domain** | Regras de negócio puras | `ConsistencyCalculator`, `RankingScorer` |
| **Application** | Orquestração, casos de uso | `UpdateConsistencyUseCase`, `RecalculateRankingUseCase` |
| **Infrastructure** | Persistência, eventos | `PostgresConsistencyRepo`, `EventEmitter` |
| **Presentation** | UI, hooks | `useConsistency`, `useRanking` |

---

## Convenções de Código

- **TypeScript strict** em todo domínio
- **Event Sourcing** para métricas: `StudySessionCompleted { userId, planId, date, duration, adherence }`
- **CQRS** para leitura/escrita de ranking
- **Zero dependencies** no core domain
- **Immutability** em value objects

---

## Governança

- **ADR** para mudanças no algoritmo de score
- **Feature flags** para rollout gradual
- **Observabilidade**: métricas de latência, erro, distribuição de scores
- **Backward compatibility**: versão do schema no event store

---

## Definição de Pronto (DoD)

Uma feature de rankeamento/constância está "done" quando:
1. ✅ Testes unitários > 95% no domain
2. ✅ Testes de integração cobrem cenários: streak break, plano vazio, feriados
3. ✅ Documentação ADR atualizada
3. ✅ Métricas de observabilidade instrumentadas
4. ✅ Feature flag configurada
5. ✅ Migration script se schema mudou