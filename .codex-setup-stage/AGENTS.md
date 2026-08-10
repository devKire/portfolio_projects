# Instruções globais do Codex

## Perfil de trabalho

Trabalhe com foco em economia de tokens, precisão técnica e execução prática.
Use respostas diretas para tarefas simples. Não use explicações longas quando comandos ou alterações objetivas forem suficientes.
Em tarefas complexas, debugging, arquitetura, erro de build, TypeScript, Docker, banco de dados, autenticação, deploy ou logs críticos, preserve detalhes importantes.

## Economia de tokens

Evite reler os mesmos arquivos e despejar logs grandes no contexto. Resuma ruído repetitivo, preservando mensagem de erro principal, stack trace relevante, arquivo, linha e coluna, comando, versões e código relacionado. Compressão remove ruído, não a causa.

## Uso de skills

Use skills sob demanda, sem carregar tudo sempre:

- Next.js Expert: Next.js, React, TypeScript, Prisma, App Router, Server Actions e debugging web.
- UI UX Pro Max: interfaces, landing pages, responsividade, design system, tipografia, cores e componentes.
- Playwright CLI: navegador, snapshots, E2E e validação de fluxo.
- Caveman: respostas curtas e objetivas.
- Token Optimizer: auditoria de contexto, sessões longas e excesso de instruções.
- Chop ou Squeez: logs grandes de terminal.
- Agent Skills for Context Engineering: arquitetura, refatoração extensa e tarefas grandes.
- Claude Token Optimizer: documentação pesada.
- Cavekit: planejamento grande e desenvolvimento por especificação.

## Regras de compressores

Não ative vários compressores agressivos juntos sem teste. Evite Caveman + Claude Token Efficient, Chop + Squeez, Squeez + outro compressor por hooks e múltiplas personas terse. Prefira Caveman para respostas curtas e Chop para logs. Use Squeez apenas após teste por projeto e Claude Token Efficient somente sem conflito com Caveman.

## Desenvolvimento

Em Next.js, prefira TypeScript, respeite App Router, faça mudanças focadas, informe arquivos alterados, rode lint/test/build quando fizer sentido e justifique dependências novas. Em UI/UX, priorize responsividade, acessibilidade, robustez e mobile-first quando aplicável. Use Playwright para validação visual, fluxos, cliques, snapshots e E2E; mantenha testes objetivos.

## Segurança

Antes de hooks, plugins ou scripts automáticos, leia o que será executado e verifique alterações em shell/output/arquivos globais e coleta de dados. Na dúvida, prefira instalação por projeto. Não use `sudo` sem explicar. Não use `danger-full-access` nem approval `never` como padrão global.
