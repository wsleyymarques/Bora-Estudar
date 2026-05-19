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

## Regra Global de Usabilidade (Obrigatoria)
- Componentes devem nascer com foco em **acao rapida** para o estudante.
- Sempre priorizar componentes que unam contexto + controle + edicao no mesmo bloco, reduzindo troca de tela.
- Quando existir uma versao compacta funcional, ela deve ser priorizada para operacao diaria.
- Toda nova criacao deve responder: "quantos passos o usuario precisa para concluir a tarefa?".
- Objetivo padrao: menos passos, menos friccao, mais clareza operacional.
- Em telas de detalhe, priorizar painel unico operacional em vez de varios blocos separados quando isso acelerar a execucao.

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

## 5) CompactTimerPlayer
- **Arquivo**: [compact-timer-player.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/compact-timer-player.tsx)
- **Funcionamento**:
  - Mini player de timer com fonte unica de verdade via `TrackerContext`.
  - Exibe materia ativa, modo (`Cronometro`/`Pomodoro`), estado da sessao e tempo atual.
  - Quando usado com `showWhenIdle`, exibe estado inativo com seletor rapido de modo (`Cronometro`/`Pomodoro`) para reduzir passos no inicio da sessao.
  - O modo escolhido no componente compacto passa a ser respeitado pelos botoes de play do cronograma no mesmo fluxo.
  - Oferece acoes rapidas: pausar/retomar, finalizar, pular pausa (quando aplicavel) e expandir para pagina completa.
  - Possui variacoes `floating` (global) e `embedded` (painel interno).
- **Props principais**:
  - `variant?: 'floating' | 'embedded'`
  - `className?: string`
  - `showWhenIdle?: boolean`
- **Uso recomendado**:
  - `floating`: no layout global para persistir ao navegar entre telas.
  - `embedded`: em sidebar/detalhe do dia no cronograma e outros paineis operacionais.
  - No detalhe do dia, preferir `showWhenIdle` para manter o controle de modo e o timer sempre acessiveis.
- **Exemplo rapido**:
```tsx
<CompactTimerPlayer variant="floating" />
```
```tsx
<CompactTimerPlayer variant="embedded" className="!w-full" />
```
```tsx
<CompactTimerPlayer variant="embedded" showWhenIdle className="!w-full" />
```

## 6) DayAnalysisSummary
- **Arquivo**: [day-analysis-summary.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/day-analysis-summary.tsx)
- **Funcionamento**:
  - Bloco compacto para analise operacional do dia no topo de paineis de cronograma.
  - Exibe checklist, planejado, executado, pausas, aderencia e delta de meta.
  - Facilita decisao rapida do estudante sem navegar para outra tela.
- **Props principais**:
  - `completedCount: number`
  - `totalCount: number`
  - `plannedMinutes: number`
  - `executedMinutes: number`
  - `pauseMinutes: number`
  - `targetMinutes?: number`
  - `className?: string`
- **Uso recomendado**:
  - Topo do detalhe do dia no cronograma.
  - Paineis operacionais onde o usuario precisa entender status do dia em segundos.
- **Exemplo rapido**:
```tsx
<DayAnalysisSummary
  completedCount={2}
  totalCount={5}
  plannedMinutes={300}
  executedMinutes={140}
  pauseMinutes={15}
  targetMinutes={360}
/>
```

## 7) PomodoroQuickSettings
- **Arquivo**: [pomodoro-quick-settings.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/pomodoro-quick-settings.tsx)
- **Funcionamento**:
  - Painel generico para configurar Pomodoro com foco em usabilidade rapida.
  - Permite editar `foco`, `pausa curta`, `pausa longa`, `longa a cada N ciclos`, `auto iniciar pausas` e `auto iniciar foco`.
  - Inclui presets rapidos e botao para restaurar configuracao padrao.
  - Funciona em modo compacto (mobile/sidebar) e modo regular (pagina completa).
- **Props principais**:
  - `settings: PomodoroSettings`
  - `onChange: React.Dispatch<React.SetStateAction<PomodoroSettings>>`
  - `compact?: boolean`
  - `disabled?: boolean`
  - `showHeader?: boolean`
  - `className?: string`
- **Uso recomendado**:
  - No `CompactTimerPlayer` para ajustes rapidos sem sair do cronograma.
  - Na `TimerPage` para manter padrao de configuracao e evitar logica duplicada.
  - Em fluxos onde o estudante precisa ajustar rapidamente as pausas e ciclos do Pomodoro.
- **Exemplo rapido**:
```tsx
<PomodoroQuickSettings
  settings={pomodoroSettings}
  onChange={setPomodoroSettings}
  compact
/>
```

## 8) TemplateQuickBuilder
- **Arquivo**: [template-quick-builder.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/template-quick-builder.tsx)
- **Funcionamento**:
  - Construtor rapido para templates semanais em poucos passos.
  - Permite selecionar dias + materias base + horario inicial + intervalo + meta por materia.
  - Gera uma semana inteira automaticamente com opcao de substituir dias selecionados e atualizar meta diaria.
  - Inclui acao rapida de duplicar um dia para outro (com materias e configuracoes).
- **Props principais**:
  - `dayNames: string[]`
  - `subjects: { id: string; name: string; color?: string }[]`
  - `onGenerate: (payload: TemplateQuickGeneratePayload) => Promise<void>`
  - `onDuplicateDay?: (sourceDay: number, targetDay: number) => Promise<void>`
  - `disabled?: boolean`
  - `className?: string`
- **Uso recomendado**:
  - Tela de templates para acelerar criacao inicial sem abrir muitos dialogs.
  - Fluxos mobile/tablet com foco em poucos passos e operacao rapida.
  - Como camada inicial antes da edicao detalhada por dia.
- **Exemplo rapido**:
```tsx
<TemplateQuickBuilder
  dayNames={DAY_NAMES}
  subjects={activeSubjects}
  onGenerate={handleQuickGenerate}
  onDuplicateDay={handleQuickDuplicateDay}
/>
```

## 9) MobileBottomBar
- **Arquivo**: [mobile-bottom-bar.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/mobile-bottom-bar.tsx)
- **Funcionamento**:
  - Barra inferior fixa para navegacao principal em `mobile` no contexto PWA.
  - Mantem acesso rapido as rotas mais usadas sem depender do menu lateral.
  - Usa destaque visual no item central (`Cronograma`) para reforcar o fluxo operacional diario.
  - Respeita `safe-area` do dispositivo para iOS/Android.
- **Props principais**:
  - Sem props obrigatorias no estado atual (composicao interna com rotas padrao).
- **Uso recomendado**:
  - Layout global da aplicacao em telas mobile/celular.
  - PWA com foco em navegação por toque e poucos passos.
- **Exemplo rapido**:
```tsx
<MobileBottomBar />
```

## 10) AppSidebarHeader
- **Arquivo**: [app-sidebar-header.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/app-sidebar-header.tsx)
- **Funcionamento**:
  - Header generico para sidebar com `icone`, `titulo` e `subtitulo`.
  - Adapta automaticamente para modo colapsado (mostra so o icone) e expandido.
  - Mantem padrao visual consistente entre temas.
- **Props principais**:
  - `collapsed: boolean`
  - `title: string`
  - `subtitle?: string`
  - `icon: React.ReactNode`
  - `className?: string`
- **Uso recomendado**:
  - Sidebars de navegacao principal no desktop.
  - Sidebars internas que precisem do mesmo padrao de cabecalho de marca/contexto.
- **Exemplo rapido**:
```tsx
<AppSidebarHeader
  collapsed={collapsed}
  title="StudyFlow"
  subtitle="Workspace"
  icon={<BookOpen className="h-4.5 w-4.5 text-sidebar-accent-foreground" />}
/>
```

## 11) AppSidebarNavSection
- **Arquivo**: [app-sidebar-nav-section.tsx](c:/Users/wesle/Documents/projetos/study-flow/src/components/generic/app-sidebar-nav-section.tsx)
- **Funcionamento**:
  - Secao generica de navegacao para sidebar com rotulo opcional (`Menu`, `Conta`, etc).
  - Renderiza lista de itens com icone + label em modo expandido e icones no modo colapsado.
  - Centraliza estados visuais de `hover` e `ativo` para evitar duplicacao.
- **Props principais**:
  - `label?: string`
  - `items: AppSidebarNavItem[]`
  - `collapsed: boolean`
  - `className?: string`
- **Uso recomendado**:
  - Sidebars com multiplas secoes de navegacao.
  - Layouts que precisem alternar entre rail compacta e menu expandido sem duplicar codigo.
- **Exemplo rapido**:
```tsx
<AppSidebarNavSection
  collapsed={collapsed}
  label="Menu"
  items={menuItems}
/>
```

---

## Uso Atual no Projeto
- Cronograma (detalhe do dia): horario + meta por materia e meta do dia.
- Template semanal: horario/meta de item e meta diaria do template.
- Formulario de adicao de materia no cronograma.
- Cronograma semanal em formato agenda/calendario com eixo de horario.
- Cronograma semanal mobile com foco em dia selecionado e lista legivel de materias.
- Mini timer global persistente entre rotas e mini timer embedado no detalhe do dia.
- Analise do dia compacta no topo do painel operacional do detalhe diario.
- Criacao de template semanal em modo rapido com geracao automatica e duplicacao de dia.
- Navegacao principal mobile por bottom bar fixa com foco em uso rapido no PWA.
- Sidebar desktop com header generico reutilizavel e secoes genericas de navegacao.
