# Multiusuário e isolamento por usuário

## Diagnóstico aplicado

- Auth antigo usava `Admin` + cookie booleano `admin_authenticated`.
- `/admin` era protegido no cliente, sem identidade real de usuário no servidor.
- Server Actions administrativas faziam queries globais ou por `landingpageId` fixo.
- `LandingPage.slug` já era a chave pública correta para `/:slug`.
- Notes, folders, anexos, tasks, templates, checklist e logs precisavam de `userId`.
- Alguns campos únicos eram globais e agora são únicos por usuário.

## Estratégia

- `Admin` foi mantido temporariamente apenas para migração/compatibilidade.
- Novo modelo principal: `User`.
- Sessões usam token opaco em cookie `portfolio_session`, com hash salvo em `UserSession`.
- Login aceita email ou username no mesmo campo.
- Cadastro cria:
  - `User`;
  - `LandingPage` principal com `slug = username`;
  - `ContactInfo`;
  - `PortfolioContent`;
  - itens padrão do checklist diário.

## Migração de produção

Antes:

```bash
pg_dump "$DATABASE_URL" > backup-before-multi-user.sql
```

Aplicar:

```bash
npx prisma migrate deploy
npx prisma generate
```

A migration `20260619120000_multi_user_tenant_isolation`:

- cria `User`, `UserRole` e `UserSession`;
- cria um usuário `OWNER` a partir do `Admin` mais antigo;
- preserva o hash de senha atual;
- usa email existente de `ContactInfo`, se houver;
- vincula dados existentes ao usuário principal;
- preserva o slug público atual, incluindo `/erikdossantos`;
- troca constraints globais por constraints compostas por usuário onde necessário.

## Seed inicial opcional

Para ambiente novo:

```bash
SEED_USER_NAME="Seu Nome" \
SEED_USERNAME="seuusername" \
SEED_USER_EMAIL="voce@example.com" \
SEED_USER_PASSWORD="senha-forte" \
npm run seed
```

O seed é idempotente e não apaga dados existentes.

## Testes manuais obrigatórios

Usuário A:

- cadastrar em `/register`;
- entrar com email + senha;
- sair e entrar com username + senha;
- criar nota, pasta, anexo, task, projeto;
- editar CMS;
- abrir `/{username}`.

Usuário B:

- cadastrar outro usuário;
- confirmar que `/admin` não mostra dados do usuário A;
- criar nota com mesmo título/slug lógico;
- criar pasta com mesmo caminho;
- criar anexo com mesmo caminho;
- configurar portfolio próprio;
- abrir `/{username-b}`.

Segurança:

- abrir `/admin` sem login: deve redirecionar para `/login`;
- tentar usar IDs de outro usuário em actions: deve retornar erro seguro;
- tentar mover task para projeto de outro usuário: deve falhar;
- importar Vault com paths iguais aos de outro usuário: deve funcionar isolado;
- graph/search/wikilinks só devem resolver dentro do usuário atual.

## Riscos restantes conhecidos

- Não há verificação de email ainda.
- Não há rate limit no login/cadastro ainda.
- `Admin` ainda existe no schema só para transição; pode ser removido em uma migration futura após confirmar produção.
- `npm audit` ainda aponta vulnerabilidade moderada em `postcss` embutido no Next; o fix sugerido pelo npm é downgrade/semver-major inválido para este projeto.
- O build ainda mostra avisos antigos de sintaxe de gradiente em `globals.css`.
