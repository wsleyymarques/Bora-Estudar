# Regras de Componentes (Component Rules)

Este arquivo define as diretrizes para a criação e modificação de componentes na pasta `src/components`.

## Inteligência e Responsividade Mobile

No ambiente mobile (telas pequenas), os componentes não devem ser apenas menores, mas devem ser **inteligentes e otimizados para o contexto**.

### Exemplos Práticos:

1. **Timer Rápido (Compact Timer / Quick Timer)**:
   - Em telas pequenas (mobile), a interface deve ser extremamente simplificada.
   - Deve exibir apenas o essencial (por exemplo, um botão de `Play`).
   - Ao clicar no componente (ou no play), em vez de redirecionar para uma página inteira ou tentar renderizar os controles em um espaço pequeno, o componente deve **abrir um Bottom Sheet (Gaveta inferior)**.
   - É dentro desse Bottom Sheet que todas as propriedades, controles secundários e detalhes do Timer Rápido devem ser exibidos e interagidos.

## Resumo da Diretriz Mobile
- **Simplifique a visualização inicial**: Mostre apenas dados vitais e a principal call-to-action (ex: Play).
- **Use Bottom Sheets para detalhes**: Oculte controles complexos ou propriedades detalhadas atrás de interações (como cliques), revelando-os através de Bottom Sheets nativos ou similares para economizar espaço e melhorar a experiência do usuário.

## Regra de Desktop

No desktop, as telas e componentes de dashboard devem ocupar toda a largura e a altura disponíveis da viewport.

### Diretrizes:
- Use o espaço horizontal inteiro do desktop, sem deixar áreas vazias desnecessárias.
- Organize os blocos para caberem na altura visível da tela.
- Evite scroll vertical na tela principal do dashboard sempre que for possível.
- O usuário não deve precisar descer a página para ver as informações principais.
- Se o conteúdo passar do limite, compacte espaçamentos, tamanhos de card e tipografia antes de permitir rolagem.
