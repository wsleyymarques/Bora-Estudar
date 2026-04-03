# Catalogo de Componentes Genericos

## Regra de Manutencao (Obrigatoria)
- Este arquivo **deve ser atualizado** sempre que um novo componente generico for criado.
- Cada novo componente generico deve ser documentado com:
  - nome
  - funcionamento
  - onde deve ser usado
- Objetivo: manter padronizacao, reuso e evitar duplicacao de UI/logica no projeto.

## Regra Global de Cores (Obrigatoria)
- Todo componente generico deve usar cores por tokens (`hsl(var(--token))`).
- Nao usar cor hardcoded (`#hex`, `text-white`, `bg-black`) para UI de produto.
- Cores devem herdar do template de tema ativo do usuario (`padrao`, `cutie`, `minimalista`) em modos claro/escuro.

## Como Catalogar
Para cada componente, registrar:
1. `Nome`
2. `Arquivo`
3. `Funcionamento`
4. `Props principais`
5. `Uso recomendado`
6. `Exemplo rapido`

---

## 1) ClockTimePickerField
- **Arquivo**: [time-picker-fields.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/time-picker-fields.tsx)
- **Funcionamento**:
  - Campo de horario com visual compacto.
  - Ao clicar, abre modal com seletor de `hora`, `minuto` e opcionalmente `segundo`.
  - Permite `Aplicar` e `Limpar`.
- **Props principais**:
  - `value?: string`
  - `onChange: (value?: string) => void`
  - `placeholder?: string`
  - `includeSeconds?: boolean`
  - `className?: string`
  - `disabled?: boolean`
- **Uso recomendado**:
  - Selecao de horario de inicio em cronograma.
  - Fluxos onde input nativo `time` nao entrega boa UX em mobile/tablet.
- **Exemplo rapido**:
```tsx
<ClockTimePickerField
  value={startTime}
  onChange={setStartTime}
  placeholder="--:--"
/>
```

## 2) DurationPickerField
- **Arquivo**: [time-picker-fields.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/time-picker-fields.tsx)
- **Funcionamento**:
  - Campo de duracao/meta com visual amigavel.
  - Ao clicar, abre modal com seletor de `hora`, `minuto` e `segundo`.
  - Exibe valor formatado (ex.: `1h30`, `45min`).
  - Possui atalhos rapidos (15, 30, 45, 60, 90, 120, 180 min).
- **Props principais**:
  - `valueMinutes?: number`
  - `onChangeMinutes: (valueMinutes?: number) => void`
  - `placeholder?: string`
  - `includeSeconds?: boolean`
  - `className?: string`
  - `disabled?: boolean`
- **Uso recomendado**:
  - Meta de estudo por materia.
  - Meta total diaria.
  - Qualquer fluxo de duracao/tempo planejado.
- **Exemplo rapido**:
```tsx
<DurationPickerField
  valueMinutes={plannedMinutes}
  onChangeMinutes={setPlannedMinutes}
  placeholder="Meta"
/>
```

## 3) WeeklyTimeGrid
- **Arquivo**: [weekly-time-grid.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/weekly-time-grid.tsx)
- **Funcionamento**:
  - Grade semanal com colunas por dia e eixo de horario.
  - Exibe cabecalho de dias, status do dia e cards de materias no layout semanal padrao.
  - Renderiza cards por materia em linhas de horario somente quando existem materias naquele horario.
  - No desktop usa cards mais amplos e com mais contexto (hora, duracao/meta, badges e resumo do dia).
  - Permite comportamento de calendario visual semelhante a agenda real.
- **Props principais**:
  - `days: WeeklyTimeGridDay[]`
  - `events: WeeklyTimeGridEvent[]`
  - `startHour?: number`
  - `endHour?: number`
  - `slotMinutes?: number`
  - `className?: string`
  - `emptyMessage?: string`
- **Uso recomendado**:
  - Visualizacao semanal do cronograma.
  - Qualquer fluxo de agenda semanal com horario inicial e duracao.
  - Contextos PWA onde desktop/tablet/mobile precisam manter leitura consistente.
- **Exemplo rapido**:
```tsx
<WeeklyTimeGrid
  days={days}
  events={events}
  startHour={7}
  endHour={22}
  slotMinutes={30}
/>
```

## 4) WeeklyMobileAgenda
- **Arquivo**: [weekly-mobile-agenda.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/weekly-mobile-agenda.tsx)
- **Funcionamento**:
  - Agenda semanal otimizada para celular.
  - Exibe trilha horizontal de dias da semana com status e contagem de materias.
  - Mostra foco em um dia por vez com cards legiveis de materias (horario, status, badges e acoes).
  - Usa um unico layout semanal padrao para manter toque facil e leitura clara.
- **Props principais**:
  - `days: WeeklyTimeGridDay[]`
  - `events: WeeklyTimeGridEvent[]`
  - `selectedDayKey: string`
  - `onSelectDay: (dayKey: string) => void`
  - `className?: string`
  - `emptyMessage?: string`
- **Uso recomendado**:
  - Visualizacao semanal em telas mobile no modulo de cronograma.
  - Cenarios onde a grade semanal desktop fica inviavel em largura reduzida.
  - PWA com foco em toque e navegacao rapida dia a dia.
- **Exemplo rapido**:
```tsx
<WeeklyMobileAgenda
  days={days}
  events={events}
  selectedDayKey={selectedDay}
  onSelectDay={setSelectedDay}
/>
```

---

## Uso Atual no Projeto
- Cronograma (detalhe do dia): horario + meta por materia e meta do dia.
- Template semanal: horario/meta de item e meta diaria do template.
- Formulario de adicao de materia no cronograma.
- Cronograma semanal em formato agenda/calendario com eixo de horario.
- Cronograma semanal mobile com foco em dia selecionado e lista legivel de materias.
