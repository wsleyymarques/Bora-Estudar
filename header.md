# Header - Guia de Implementacao do Projeto

## Resumo da Plataforma
- Nome: `StudyFlow`
- Objetivo: organizar rotina de estudos com cronograma, templates semanais, metas, timer e historico.
- Publico-alvo: uso em `web`, `mobile celular` e `mobile tablet`, mantendo boa experiencia em desktop.
- Plataforma: `PWA` (Progressive Web App).
- Stack principal:
  - Front-end: `React + TypeScript + Vite`
  - UI: `Tailwind + componentes UI reutilizaveis`
  - Backend/Data: `Supabase (Postgres + Auth + RLS)`
- Modulos centrais:
  - Cronograma (semanal/mensal/anual)
  - Templates semanais
  - Metas por materia e por dia
  - Sessoes reais de estudo (timer)
  - Historico e estatisticas

## Diretriz de Codigo (Obrigatoria)
- Sempre priorizar **componentes genericos e reutilizaveis**.
- Antes de criar componente novo, verificar se ja existe um componente que possa ser reutilizado ou estendido.
- Evitar logica duplicada entre telas; centralizar em:
  - `hooks` compartilhados
  - `selectors`
  - `utils/services`
- Sempre que um componente surgir em mais de um contexto, extrair para versao generica.

## Diretriz de Usabilidade (Obrigatoria)
- O foco do produto e **usabilidade rapida do estudante**.
- Toda tela e componente devem ser pensados para reduzir friccao e quantidade de cliques.
- Priorizar fluxos de acao em poucos passos (ver, decidir, agir) dentro do mesmo contexto.
- Sempre que possivel, usar paineis operacionais compactos que combinem visualizacao + acao + edicao sem trocar de pagina.
- Evitar separar informacoes de um mesmo fluxo em blocos distantes quando isso aumentar tempo de uso.
- Regra pratica: antes de implementar, validar se existe uma forma mais curta e intuitiva para completar a mesma tarefa.
- Em detalhe de cronograma, priorizar um painel unico com analise + controle de timer + edicao de materias.
- Acoes destrutivas devem exigir confirmacao explicita (modal/dialog) antes de persistir.

## Diretriz de Plataforma (Obrigatoria)
- O projeto deve ser tratado como `PWA` em todas as entregas.
- Toda feature nova deve funcionar bem em:
  - `web/desktop`
  - `mobile celular`
  - `mobile tablet`
- Em toda implementacao, ajustar a interface da melhor forma responsiva para cada dispositivo, evitando apenas \"encolher\" layout de desktop.
- Sempre validar responsividade real antes de finalizar:
  - layout
  - navegacao por toque
  - legibilidade
  - densidade de informacao

## Padrao para Novas Implementacoes
1. Identificar se a necessidade e de dominio (regra) ou visual (UI).
2. Implementar regra em camada compartilhada (`features/*`, `lib/*`, `hooks/*`), nao dentro da tela.
3. Usar composicao de componentes pequenos e genericos.
4. Garantir retrocompatibilidade com dados antigos (campos opcionais quando necessario).
5. Cobrir fluxos criticos com testes (unitarios/integrados).

## Regras de UI e Componentes
- Criar componentes orientados a `props` e com responsabilidades claras.
- Evitar componentes acoplados a uma unica tela quando houver chance de reuso.
- Preferir APIs simples e consistentes para componentes:
  - `value`, `onChange`, `disabled`, `variant`, `size`
- Reutilizar componentes base do projeto (`ui/*`) antes de criar variacoes locais.
- Regra de tema obrigatoria:
  - Componentes devem usar cores por tokens CSS (`--primary`, `--background`, etc).
  - Nao usar cores hardcoded (`#hex`, `text-white`, `bg-black`) para UI de produto.
  - Toda cor visual deve herdar do template de tema ativo do usuario.
  - Catalogo de templates deve vir do banco (`public.theme_templates`), com 3 templates de sistema padrao.
  - Usuario pode criar templates proprios no banco, mantendo heranca de tokens e compatibilidade com modo claro/escuro.

## Checklist Antes de Finalizar Uma Feature
- Existe componente generico para isso?
- Ha duplicacao de logica entre views?
- Esta compativel com web, mobile celular e mobile tablet, com responsividade otimizada para cada contexto?
- Mantem compatibilidade com dados antigos?
- Possui testes para comportamento critico?
