§G
Adicionar colaboração multi-organização, tasks delegáveis, help desk e KCS ao `/admin`, preservando dados e fluxos pessoais.

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

§T
id|status|goal|cites
T1|x|modelar schema + migration incremental + scope legado|V1,V4,V7,V8,I.schema
T2|x|centralizar auth e implementar organizações/membros/equipes/contexto|V2,V3,V4,V9,V10,V11,V14,V15,I.auth,I.org
T3|x|evoluir Tasks para org/equipe/responsável sem quebrar pessoal|V1,V2,V4,V5,V10,V11,I.tasks
T4|x|implementar filas/agentes/Tickets/Activity|V2,V4,V6,V10,V11,V14,V15,I.tickets
T5|x|implementar KCS sobre Notes/Folders/Attachments e escopar Notes pessoais|V1,V2,V7,V10,V11,V13,I.notes,I.kcs
T6|x|integrar seletor, navegação e telas responsivas ao admin|V9,V11,I.admin
T7|x|testar políticas/IDOR, validar Prisma, lint e build final|V1,V2,V3,V4,V5,V6,V7,V8,V9,V10,V11,V12,V13,V14,V15

§B
id|date|cause|fix
B1|2026-08-20|schema `scopeKey` gerado antes de adaptar consumers pessoais de Notes|V7
B2|2026-08-20|filtro de busca poderia sobrescrever cláusula `OR` de acesso em helper legado|V2
