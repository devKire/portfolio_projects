§G
Evoluir colaboração existente: Notes/KCS compartilham engine, conteúdo pessoal transfere com segurança para KCS e Tasks/Tickets operam em um Work Manager canônico, preservando dados e fluxos especializados.

§C

- Next.js 15 App Router, TypeScript strict, Prisma/PostgreSQL, Server Actions.
- Código atual = fonte de verdade; sem arquitetura paralela ou reset de DB.
- Ordem: segurança multi-tenant > integridade > compatibilidade > função > UX.
- `User.id` continua tenant pessoal; organização adiciona escopo compartilhado opcional.
- UI segue `/admin` tab router, tema, componentes, responsividade e acessibilidade atuais.
- Build baseline verde; avisos antigos de Prisma config, lockfiles e gradientes permitidos.

§I

- I.schema: `prisma/schema.prisma` + migration incremental.
- I.auth: `src/lib/auth/session.ts`, novo auth organizacional central.
- I.tasks: exports existentes de `src/app/actions/tasks.ts` preservados; inputs/filtros ganham campos opcionais.
- I.notes: exports pessoais de `src/app/actions/notes.ts` preservados; KCS usa mesmos modelos e utilitários.
- I.org: novas Server Actions de organizações, membros, equipes e contexto ativo.
- I.tickets: novas Server Actions de filas, agentes, chamados, comentários e histórico.
- I.kcs: novas Server Actions escopadas de pastas, notas, links e anexos KCS.
- I.knowledge: editor compartilhado, transferências pessoais → KCS e comentários organizacionais de Note.
- I.work: `WorkItem` discriminado adapta Task/Ticket; entidades e actions especializadas permanecem fonte de persistência/autorização.
- I.admin: `AdminPanel`/`Sidebar`/`ContentRouter` recebem contexto organizacional e novas tabs.

§V

- V1: registro legado com `organizationId = null` continua pessoal e acessível só pelo dono atual.
- V2: toda leitura/mutação organizacional valida sessão + `OrganizationMember` + `organizationId` do recurso antes de retornar ou alterar.
- V3: organização sempre mantém OWNER; ADMIN não remove/rebaixa OWNER; último OWNER não sai.
- V4: TeamMember, QueueAgent, team de queue/task/ticket e usuários delegados pertencem à mesma organização; backend valida e DB reforça onde possível.
- V5: task pessoal preserva ownership atual; task organizacional só delega a membro autorizado e consultas aplicam escopo solicitado.
- V6: Ticket é entidade independente com queue obrigatória da mesma organização; mudanças relevantes gravam TicketActivity na mesma transação.
- V7: Notes/Folders/Attachments usam `scopeKey`; pessoal = `user:<id>`, KCS = `organization:<id>`; busca, links e anexos nunca cruzam scope.
- V8: migration apenas adiciona/backfill/ajusta índices e constraints; nenhum dado legado apagado, nenhuma coluna legada obrigatória sem backfill.
- V9: cookie de organização ativa é preferência UX, nunca prova de autorização.
- V10: IDs manipulados de org/team/queue/ticket/note/folder/assignee retornam erro seguro sem revelar recurso externo.
- V11: criação/edição valida strings, enums, datas, IDs e limites no servidor.
- V12: `npx prisma generate`, Prisma validate, lint e `npm run build` passam sem erro novo.
- V13: nota KCS sempre é PRIVATE; consultas pessoais/públicas excluem `organizationId != null`, mesmo quando criador coincide com usuário atual.
- V14: remover membro limpa memberships de equipe/fila e atribuições ativas na transação; autoria, chamados solicitados e histórico compartilhado permanecem.
- V15: desativar equipe/fila preserva vínculos históricos e impede novas atribuições/chamados.
- V16: somente OWNER/ADMIN criam ou modificam conteúdo, estrutura, anexos e importações KCS já organizacionais; MEMBER tem leitura e contribuição por transferência pessoal.
- V17: qualquer membro pode comentar Note KCS da própria organização; autor edita/exclui o próprio comentário e OWNER/ADMIN podem excluir qualquer comentário, nunca editar como terceiro.
- V18: transferência pessoal → KCS valida ownership pessoal, membership ativa e folder destino no mesmo `organizationId`; IDs externos falham sem revelar recurso.
- V19: transferência de pasta é recursiva, atômica e determinística; move descendentes e anexos do subtree, preserva IDs quando possível e resolve colisões sem sobrescrever.
- V20: transferência de nota move somente anexos explicitamente referenciados no Markdown; links são reconstruídos nos escopos origem/destino e nunca apontam para recurso de outro scope.
- V21: transformar Note pessoal em KCS nunca compartilha Task pessoal; vínculos `noteId`/`noteTaskKey` pessoais são removidos na mesma transação.
- V22: Work Manager lista Task/Ticket por `kind`, suprime Task vinculada somente quando seu Ticket canônico também é acessível e mantém um item operacional por trabalho.
- V23: Kanban converte lane → status pela entidade; nenhuma operação grava enum/status de Ticket em Task ou status de Task em Ticket.
- V24: unificação de UI não contorna autorização, fila, histórico, comentários, bulk/quick-add ou regras especializadas de Task/Ticket.
- V25: `NoteComment.organizationId` corresponde ao `organizationId` da Note por constraint; leitura e mutação também exigem membership no servidor.

§T
id|status|goal|cites
T1|x|modelar schema + migration incremental + scope legado|V1,V4,V7,V8,I.schema
T2|x|centralizar auth e implementar organizações/membros/equipes/contexto|V2,V3,V4,V9,V10,V11,V14,V15,I.auth,I.org
T3|x|evoluir Tasks para org/equipe/responsável sem quebrar pessoal|V1,V2,V4,V5,V10,V11,I.tasks
T4|x|implementar filas/agentes/Tickets/Activity|V2,V4,V6,V10,V11,V14,V15,I.tickets
T5|x|implementar KCS sobre Notes/Folders/Attachments e escopar Notes pessoais|V1,V2,V7,V10,V11,V13,I.notes,I.kcs
T6|x|integrar seletor, navegação e telas responsivas ao admin|V9,V11,I.admin
T7|x|testar políticas/IDOR, validar Prisma, lint e build final|V1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14,V15
T8|x|adicionar NoteComment + migration incremental e política KCS central|V2,V8,V16,V17,V25,I.schema,I.auth,I.kcs
T9|x|implementar transferências atômicas de nota/pasta, colisões, links, anexos e detach de tasks|V7,V10,V18,V19,V20,V21,I.knowledge
T10|x|extrair editor compartilhado e integrar Notes/KCS read-only por capabilities|V7,V13,V16,V17,I.notes,I.kcs,I.knowledge
T11|x|criar adapter/query/actions WorkItem sem duplicação de linked Ticket/Task|V2,V5,V6,V22,V23,V24,I.tasks,I.tickets,I.work
T12|x|integrar List/Kanban/criação/detalhe/filas no Work Manager e limpar navegação|V22,V23,V24,I.admin,I.work
T13|x|testar IDOR, transferências, comentários, adapter e executar validação final|V10,V12,V16,V17,V18,V19,V20,V21,V22,V23,V24,V25

§B
id|date|cause|fix
B1|2026-08-20|schema `scopeKey` gerado antes de adaptar consumers pessoais de Notes|V7
B2|2026-08-20|filtro de busca poderia sobrescrever cláusula `OR` de acesso em helper legado|V2
B3|2026-08-20|`MarkdownPreview.onToggleTask` obrigatório impedia representar KCS read-only no editor compartilhado|V16
B4|2026-08-20|guardrail estrutural exigia chamada de autorização em uma única linha e falhava após formatação sem mudança semântica|V2
B5|2026-08-20|agregador Work repassava unions heterogêneas de erro de Task/Ticket e tornava `data` ambíguo no client|V24
B6|2026-08-20|`decodeURIComponent` direto podia rejeitar toda transferência ao encontrar link Markdown com percent-encoding malformado|V19
B7|2026-08-20|arquivo `'use server'` de comentários exportava constante runtime além de actions assíncronas, incompatível com a fronteira do App Router|V17
B8|2026-08-20|reexport de Server Actions por outro módulo `'use server'` foi interpretado pelo compilador Next como export não assíncrono|V18
