'use client';

import {
  Archive,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock3,
  ClipboardList,
  Code2,
  ExternalLink,
  Folder,
  Globe,
  Hash,
  HelpCircle,
  Info,
  KanbanSquare,
  Keyboard,
  Layers3,
  Link2,
  ListChecks,
  Lock,
  NotebookText,
  PanelLeft,
  PenLine,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';

type NavItem = {
  id: string;
  label: string;
};

type Shortcut = {
  scope: string;
  keys: string;
  action: string;
};

const navItems: NavItem[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'first-steps', label: 'Primeiros passos' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'notes', label: 'Notes / Vault' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'checklist', label: 'Checklist Diário' },
  { id: 'projects', label: 'Projects' },
  { id: 'portfolio', label: 'CMS / Portfólio' },
  { id: 'settings', label: 'Configurações' },
  { id: 'multiuser', label: 'Multiusuário' },
  { id: 'shortcuts', label: 'Atalhos' },
  { id: 'common-issues', label: 'Problemas comuns' },
];

const shortcuts: Shortcut[] = [
  {
    scope: 'Tasks',
    keys: 'Ctrl/Cmd + K',
    action: 'Focar busca de tarefas.',
  },
  {
    scope: 'Tasks',
    keys: 'Ctrl/Cmd + B',
    action: 'Abrir criação rápida de task.',
  },
  {
    scope: 'Tasks',
    keys: 'Ctrl/Cmd + M',
    action: 'Abrir criação de múltiplas tasks.',
  },
  {
    scope: 'Tasks',
    keys: 'Ctrl/Cmd + A',
    action: 'Selecionar todas as tasks, fora de campos editáveis.',
  },
  {
    scope: 'Tasks',
    keys: 'Delete',
    action: 'Excluir tasks selecionadas.',
  },
  {
    scope: 'Tasks',
    keys: 'Esc',
    action: 'Limpar seleção ou fechar editor rápido.',
  },
  {
    scope: 'Tasks',
    keys: '1 / 2',
    action: 'Alternar entre lista e Kanban.',
  },
  {
    scope: 'Múltiplas tasks',
    keys: 'Ctrl/Cmd + Enter',
    action: 'Inserir nova linha no editor em lote.',
  },
  {
    scope: 'Múltiplas tasks',
    keys: 'Ctrl/Cmd + Shift + Enter',
    action: 'Criar todas as tasks válidas.',
  },
  {
    scope: 'Notes',
    keys: 'Ctrl/Cmd + K',
    action: 'Abrir command palette das notas.',
  },
  {
    scope: 'Notes',
    keys: 'Ctrl/Cmd + B',
    action: 'Capturar/criar nova nota.',
  },
  {
    scope: 'Editor Notes',
    keys: 'Ctrl/Cmd + B / I / K',
    action: 'Aplicar negrito, itálico ou link Markdown.',
  },
  {
    scope: 'Editor Notes',
    keys: 'Enter / Tab',
    action:
      'Selecionar sugestão de wikilink quando o autocomplete está aberto.',
  },
  {
    scope: 'Projects / CMS / Checklist',
    keys: 'Ctrl/Cmd + Enter',
    action: 'Salvar formulário em edição.',
  },
  {
    scope: 'Menus e formulários',
    keys: 'Esc',
    action: 'Fechar menu, cancelar edição ou remover foco.',
  },
];

export default function Documentation() {
  return (
    <div className="min-h-0 min-w-0 text-[#dcddde]">
      <div className="mb-5 overflow-hidden rounded-xl border border-[#2f2f35] bg-[#1e1e22]">
        <div className="border-b border-[#2f2f35] bg-[radial-gradient(circle_at_top_left,_rgba(154,140,255,0.22),_transparent_34%),#1e1e22] p-4 md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#6f55d9]/30 bg-[#6f55d9]/10 px-3 py-1 text-xs font-medium text-[#c9b8ff]">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                Guia do usuário
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Documentação do Portfolio OS
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9b9ba3]">
                Guia prático para usar dashboard, vault de notas, tasks,
                checklist diário, projetos e CMS do portfólio dentro do admin.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:w-[420px]">
              <Metric label="Área" value="Admin" />
              <Metric label="Perfil" value="Multiusuário" />
              <Metric label="Portfólio" value="/username" />
              <Metric label="Estilo" value="Vault OS" />
            </div>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="border-b border-[#2f2f35] bg-[#19191d]/70 p-3 lg:border-r lg:border-b-0">
            <div className="lg:sticky lg:top-3">
              <p className="mb-2 px-2 text-[11px] font-medium tracking-[0.18em] text-[#777780] uppercase">
                Índice
              </p>
              <nav
                aria-label="Índice da documentação"
                className="flex gap-1 overflow-x-auto pb-1 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0"
              >
                {navItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm text-[#9b9ba3] transition-colors hover:bg-[#24242a] hover:text-white focus:ring-2 focus:ring-[#9a8cff]/40 focus:outline-none lg:w-full"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          <main className="space-y-5 p-3 md:p-5">
            <DocSection
              id="overview"
              icon={Layers3}
              title="Visão geral"
              description="O sistema funciona como um workspace pessoal para publicar portfólio e operar conhecimento, tarefas e rotina."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <DocCard title="Área admin" icon={PanelLeft}>
                  <p>
                    O admin concentra tabs de operação: Dashboard, Tasks,
                    Checklist Diário, Projetos, Notas e Configurações/CMS.
                  </p>
                  <p>
                    A navegação fica na sidebar desktop e no drawer mobile. O
                    conteúdo muda por tab sem sair do workspace.
                  </p>
                </DocCard>
                <DocCard title="Página pública" icon={Globe}>
                  <p>
                    O portfólio público usa o slug da sua landing page. Exemplo:
                  </p>
                  <CodeBlock code="/seu-username" />
                  <p>
                    Visitantes veem só a página pública; dados internos ficam no
                    admin autenticado.
                  </p>
                </DocCard>
              </div>
              <Callout tone="info">
                Redes Sociais, Comentários e Analytics aparecem no menu, mas
                estão marcados como “Em breve” no estado atual.
              </Callout>
            </DocSection>

            <DocSection
              id="first-steps"
              icon={Sparkles}
              title="Primeiros passos"
              description="Sequência recomendada para configurar uma conta nova."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <StepCard
                  number="01"
                  title="Crie sua base"
                  items={[
                    'Cadastre-se ou entre com email/username.',
                    'Abra Configurações e revise nome, slug e contatos.',
                    'Copie seu link público na sidebar.',
                  ]}
                />
                <StepCard
                  number="02"
                  title="Organize o trabalho"
                  items={[
                    'Crie projetos no tab Projetos.',
                    'Use Tasks para próximas ações.',
                    'Use Checklist Diário para rotinas recorrentes.',
                  ]}
                />
                <StepCard
                  number="03"
                  title="Construa conhecimento"
                  items={[
                    'Crie notas ou importe um Vault ZIP.',
                    'Use wikilinks para conectar ideias.',
                    'Use Graph e backlinks para navegar relações.',
                  ]}
                />
              </div>
            </DocSection>

            <DocSection
              id="dashboard"
              icon={BarChart3}
              title="Dashboard"
              description="Visão geral de indicadores do portfólio e atividade recente."
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <FeatureCard
                  icon={BarChart3}
                  title="Indicadores"
                  items={[
                    'Visualizações do portfólio.',
                    'Seguidores/interações sociais quando houver dados.',
                    'Projetos ativos no portfólio.',
                  ]}
                />
                <FeatureCard
                  icon={Search}
                  title="Análise"
                  items={[
                    'Filtro por 7d, 30d e 90d.',
                    'Gráfico de visualizações por período.',
                    'Lista de atividades recentes.',
                  ]}
                />
                <FeatureCard
                  icon={ExternalLink}
                  title="Ações"
                  items={[
                    'Botão de atualizar dados.',
                    'Cards clicáveis quando existir link.',
                    'Atalho visual para acompanhar saúde do portfólio.',
                  ]}
                />
              </div>
            </DocSection>

            <DocSection
              id="notes"
              icon={BookOpen}
              title="Notes / Knowledge Vault"
              description="Vault Markdown com organização por pastas, backlinks, wikilinks e importação de Obsidian."
            >
              <div className="grid gap-3 xl:grid-cols-2">
                <DocCard title="Criação e edição" icon={NotebookText}>
                  <FeatureList
                    items={[
                      'Criação de nota pela command palette ou pelo menu de pasta.',
                      'Editor Markdown com auto-save.',
                      'Modos Edit, Preview, Split e Graph.',
                      'Status Draft, Published e Archived.',
                      'Vínculo opcional com projeto.',
                    ]}
                  />
                </DocCard>
                <DocCard title="Links e navegação" icon={Link2}>
                  <FeatureList
                    items={[
                      'Wikilinks no formato [[Nome da nota]].',
                      'Autocomplete de notas, headings e block references.',
                      'Linked Mentions para backlinks.',
                      'Outgoing Links com estado linked/unresolved.',
                      'Histórico interno de navegação entre notas.',
                    ]}
                  />
                </DocCard>
                <DocCard title="Organização" icon={Folder}>
                  <FeatureList
                    items={[
                      'Pastas e subpastas.',
                      'Drag-and-drop de notas e pastas.',
                      'Menu de contexto para notas e pastas.',
                      'Favoritos, Recentes, Tags, Projetos e Lixeira.',
                      'Copiar caminho da pasta quando o navegador permitir.',
                    ]}
                  />
                </DocCard>
                <DocCard title="Importação e anexos" icon={Upload}>
                  <FeatureList
                    items={[
                      'Importação de Obsidian Vault ZIP até 50 MB.',
                      'Criação/atualização de notas e anexos detectados.',
                      'Colagem de imagem com Ctrl/Cmd + V dentro do editor.',
                      'Imagens são inseridas como ![[arquivo]].',
                      'Preview renderiza anexos de imagem e links de arquivo.',
                    ]}
                  />
                </DocCard>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <DocCard title="Markdown suportado" icon={Code2}>
                  <FeatureList
                    items={[
                      'Headings, listas, links, imagens e blockquotes.',
                      'Blocos de código com linguagem.',
                      'Callouts estilo Obsidian.',
                      'HTML limitado e sanitizado no preview.',
                      'Footnotes e inline code.',
                    ]}
                  />
                  <CodeBlock
                    code={`> [!tip] Dica rápida\n> Use [[Nome da nota]] para criar conexões.\n\n\`\`\`ts\nconst vault = 'conectado';\n\`\`\``}
                  />
                </DocCard>
                <DocCard title="Graph View" icon={Link2}>
                  <p>
                    O modo Graph exibe conexões entre notas do vault atual. Ao
                    clicar em um nó, a nota correspondente é aberta.
                  </p>
                  <p>
                    O graph respeita o escopo do usuário autenticado e usa os
                    links resolvidos no próprio vault.
                  </p>
                </DocCard>
              </div>
            </DocSection>

            <DocSection
              id="tasks"
              icon={PenLine}
              title="Tasks"
              description="Gerenciador de tarefas com quick add, criação em lote, filtros, seleção múltipla e Kanban."
            >
              <div className="grid gap-3 xl:grid-cols-3">
                <FeatureCard
                  icon={PenLine}
                  title="Criação rápida"
                  items={[
                    'Botão Nova Tarefa ou Ctrl/Cmd + B.',
                    'Preview dos tokens detectados.',
                    'Sugestões de tags e projetos.',
                    'Esc fecha o input rápido.',
                  ]}
                />
                <FeatureCard
                  icon={ClipboardList}
                  title="Múltiplas tarefas"
                  items={[
                    'Uma task por linha.',
                    'Preview por linha com erros.',
                    'Ctrl/Cmd + Shift + Enter cria todas.',
                    'Ctrl/Cmd + Enter cria nova linha.',
                  ]}
                />
                <FeatureCard
                  icon={KanbanSquare}
                  title="Visualizações"
                  items={[
                    'Lista para operação detalhada.',
                    'Kanban para fluxo por status.',
                    'Teclas 1 e 2 alternam a visualização.',
                    'Seleção múltipla para ações em lote.',
                  ]}
                />
              </div>

              <DocCard title="Sintaxe Quick Add" icon={Hash}>
                <p>
                  A linha é interpretada por tokens. O que não for comando vira
                  título.
                </p>
                <CodeBlock code="Criar documentação @Projeto !alta amanhã 1h #docs #frontend" />
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
                  <Token label="@Projeto" text="vincula a projeto existente" />
                  <Token label="!alta" text="define prioridade" />
                  <Token label="amanhã" text="define data" />
                  <Token label="1h / 30min" text="define horas estimadas" />
                  <Token label="#docs" text="adiciona tag" />
                  <Token label="!done" text="define status concluído" />
                  <Token label="terça" text="próximo dia da semana" />
                  <Token label="13/03" text="data numérica" />
                </div>
              </DocCard>

              <DocCard title="Filtros e campos" icon={Search}>
                <FeatureList
                  items={[
                    'Busca textual com Ctrl/Cmd + K.',
                    'Filtros rápidos: Alta Prioridade, Urgentes, Vence Hoje, Atrasadas e Esta Semana.',
                    'Filtros múltiplos por status, prioridade, projetos e tags.',
                    'Intervalo de datas, Sem projeto e Sem tag.',
                    'Modo de tags: qualquer tag ou todas as tags selecionadas.',
                    'Campos de horas estimadas e reais aparecem na edição da task.',
                  ]}
                />
              </DocCard>
            </DocSection>

            <DocSection
              id="checklist"
              icon={ListChecks}
              title="Checklist Diário"
              description="Rotina diária por períodos, com histórico e edição dos itens."
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <FeatureCard
                  icon={CheckCircle2}
                  title="Uso diário"
                  items={[
                    'Escolha a data no topo.',
                    'Marque itens como concluídos.',
                    'Acompanhe concluídos e percentual do dia.',
                  ]}
                />
                <FeatureCard
                  icon={Clock3}
                  title="Períodos"
                  items={[
                    'Morning, Afternoon e Night.',
                    'Cada item pode ter horário inicial/final.',
                    'Itens sagrados recebem badge visual.',
                  ]}
                />
                <FeatureCard
                  icon={Settings}
                  title="Edição"
                  items={[
                    'Modo de edição para criar, arquivar e reordenar itens.',
                    'Itens inativos saem do checklist diário normal.',
                    'Histórico mostra progresso dos dias recentes.',
                  ]}
                />
              </div>
            </DocSection>

            <DocSection
              id="projects"
              icon={Folder}
              title="Projects"
              description="Cadastro e curadoria dos projetos usados no portfólio e nas tasks."
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <DocCard title="Cadastro" icon={Folder}>
                  <FeatureList
                    items={[
                      'Título, categoria, descrição curta e descrição completa.',
                      'Imagem, live URL, GitHub URL e tecnologias.',
                      'Status: Concluído, Em desenvolvimento ou Planejado.',
                      'Cor de destaque e campos avançados.',
                    ]}
                  />
                </DocCard>
                <DocCard title="Organização" icon={Target}>
                  <FeatureList
                    items={[
                      'Projeto ativo/inativo controla exibição.',
                      'Featured destaca projeto no portfólio.',
                      'Filtros por busca, ativo, status, categoria e featured.',
                      'Reordenação por setas.',
                      'Projetos podem ter tasks, features e sprints vinculadas.',
                    ]}
                  />
                </DocCard>
              </div>
            </DocSection>

            <DocSection
              id="portfolio"
              icon={Globe}
              title="CMS / Portfólio"
              description="Configurações editáveis da página pública sem alterar código."
            >
              <div className="grid gap-3 xl:grid-cols-3">
                <FeatureCard
                  icon={Globe}
                  title="Geral"
                  items={[
                    'Nome, slug, descrição/bio.',
                    'Avatar URL e cover URL.',
                    'Botão Ver página abre o portfólio público.',
                  ]}
                />
                <FeatureCard
                  icon={PenLine}
                  title="Seções editáveis"
                  items={[
                    'Hero.',
                    'Sobre.',
                    'Serviços.',
                    'Processo.',
                    'Contato final.',
                  ]}
                />
                <FeatureCard
                  icon={ExternalLink}
                  title="Contato"
                  items={[
                    'Email, telefone e WhatsApp.',
                    'Instagram, Facebook e LinkedIn.',
                    'Projetos exibidos vêm do tab Projetos.',
                  ]}
                />
              </div>
              <Callout tone="warning">
                O slug público precisa ficar único. Se você trocar para um slug
                já usado, o sistema bloqueia o salvamento.
              </Callout>
            </DocSection>

            <DocSection
              id="settings"
              icon={Settings}
              title="Configurações"
              description="Onde ficam ajustes de conteúdo e dados úteis da conta."
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <DocCard title="Dentro do tab Configurações" icon={Settings}>
                  <FeatureList
                    items={[
                      'CMS do Portfólio.',
                      'Salvar seção ativa com botão Salvar ou Ctrl/Cmd + Enter.',
                      'Cancelar alterações com Esc.',
                      'Restaurar seção para padrão quando disponível.',
                    ]}
                  />
                </DocCard>
                <DocCard title="Sidebar do admin" icon={PanelLeft}>
                  <FeatureList
                    items={[
                      'Nome do usuário.',
                      'Username e email.',
                      'Link público do portfólio.',
                      'Botão copiar link público.',
                      'Logout.',
                    ]}
                  />
                </DocCard>
              </div>
            </DocSection>

            <DocSection
              id="multiuser"
              icon={ShieldCheck}
              title="Multiusuário"
              description="Cada usuário opera seu próprio workspace e seu próprio portfólio público."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <FeatureCard
                  icon={UserPlus}
                  title="Cadastro"
                  items={[
                    'Nome, username, email e senha.',
                    'Username vira slug inicial do portfólio.',
                    'Landing page inicial é criada automaticamente.',
                  ]}
                />
                <FeatureCard
                  icon={Lock}
                  title="Login"
                  items={[
                    'Entrada com email + senha.',
                    'Entrada com username + senha.',
                    'Sessão protegida por cookie httpOnly.',
                  ]}
                />
                <FeatureCard
                  icon={ShieldCheck}
                  title="Isolamento"
                  items={[
                    'Notas, pastas, anexos e graph por usuário.',
                    'Tasks, projetos, checklist e CMS por usuário.',
                    'Server Actions usam usuário da sessão, não userId do client.',
                  ]}
                />
              </div>
            </DocSection>

            <DocSection
              id="shortcuts"
              icon={Keyboard}
              title="Atalhos"
              description="Atalhos existentes no projeto hoje."
            >
              <div className="overflow-x-auto rounded-xl border border-[#2f2f35] bg-[#19191d]">
                <div className="min-w-[620px]">
                  <div className="grid grid-cols-[130px_minmax(120px,180px)_1fr] border-b border-[#2f2f35] bg-[#202024] px-3 py-2 text-[11px] font-medium tracking-[0.12em] text-[#777780] uppercase">
                    <span>Área</span>
                    <span>Teclas</span>
                    <span>Ação</span>
                  </div>
                  <div className="divide-y divide-[#2f2f35]">
                    {shortcuts.map((shortcut) => (
                      <ShortcutRow
                        key={`${shortcut.scope}-${shortcut.keys}`}
                        {...shortcut}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </DocSection>

            <DocSection
              id="quick-tips"
              icon={Sparkles}
              title="Dicas rápidas"
              description="Pequenos fluxos que economizam tempo."
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <TipCard
                  title="Use projetos como eixo"
                  text="Vincule notes e tasks ao projeto. Isso melhora filtros, contexto e revisão."
                />
                <TipCard
                  title="Capture rápido"
                  text="No Notes, Ctrl/Cmd + B captura uma ideia. Depois conecte com wikilinks."
                />
                <TipCard
                  title="Publique com intenção"
                  text="Marque projetos ativos e featured para controlar o que aparece no portfólio."
                />
              </div>
            </DocSection>

            <DocSection
              id="common-issues"
              icon={HelpCircle}
              title="Problemas comuns"
              description="Diagnóstico rápido quando algo parece errado."
            >
              <div className="grid gap-3 lg:grid-cols-2">
                <IssueCard
                  title="Não vejo meus dados"
                  answer="Confirme se você está logado na conta correta. O sistema isola dados por usuário."
                />
                <IssueCard
                  title="Wikilink aparece unresolved"
                  answer="A nota de destino ainda não existe ou o título/slug não corresponde ao link."
                />
                <IssueCard
                  title="Projeto não aparece no portfólio"
                  answer="Verifique se o projeto está ativo. Use featured apenas para destacar, não para ativar."
                />
                <IssueCard
                  title="Importação ZIP ignorou arquivos"
                  answer="O importador ignora caminhos inseguros, tipos não suportados e anexos muito grandes."
                />
                <IssueCard
                  title="Atalho não funciona"
                  answer="Atalhos globais são bloqueados dentro de inputs, textareas e editores para evitar perda de texto."
                />
                <IssueCard
                  title="Slug público indisponível"
                  answer="Escolha outro slug em Configurações. Slugs públicos são únicos em todo o sistema."
                />
              </div>
            </DocSection>
          </main>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2f2f35] bg-[#19191d]/80 p-3">
      <p className="text-[11px] text-[#777780]">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function DocSection({
  id,
  icon: Icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#6f55d9]/30 bg-[#6f55d9]/10 text-[#c9b8ff]">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#9b9ba3]">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function DocCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-[#2f2f35] bg-[#19191d] p-4 text-sm leading-6 text-[#b9b9c1]">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f2f2f3]">
        <Icon className="h-4 w-4 text-[#9a8cff]" aria-hidden="true" />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </article>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  items,
}: {
  icon: LucideIcon;
  title: string;
  items: string[];
}) {
  return (
    <DocCard title={title} icon={Icon}>
      <FeatureList items={items} />
    </DocCard>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-[#9a8cff]"
            aria-hidden="true"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StepCard({
  number,
  title,
  items,
}: {
  number: string;
  title: string;
  items: string[];
}) {
  return (
    <article className="rounded-xl border border-[#2f2f35] bg-[#19191d] p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2d2940] font-mono text-xs text-[#c9b8ff]">
          {number}
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <FeatureList items={items} />
    </article>
  );
}

function Callout({
  tone,
  children,
}: {
  tone: 'info' | 'warning';
  children: ReactNode;
}) {
  const isWarning = tone === 'warning';
  const Icon = isWarning ? Archive : Info;

  return (
    <div
      className={`flex gap-3 rounded-xl border p-3 text-sm leading-6 ${
        isWarning
          ? 'border-amber-500/25 bg-amber-500/10 text-amber-100'
          : 'border-[#6f55d9]/25 bg-[#6f55d9]/10 text-[#d7ccff]'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-[#303036] bg-[#101014] p-3 text-xs leading-5 text-[#d7ccff]">
      <code>{code}</code>
    </pre>
  );
}

function Token({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-[#303036] bg-[#101014] p-3">
      <code className="text-xs text-[#c9b8ff]">{label}</code>
      <p className="mt-1 text-xs text-[#9b9ba3]">{text}</p>
    </div>
  );
}

function ShortcutRow({ scope, keys, action }: Shortcut) {
  return (
    <div className="grid grid-cols-[130px_minmax(120px,180px)_1fr] gap-2 px-3 py-2 text-xs">
      <span className="text-[#9b9ba3]">{scope}</span>
      <kbd className="w-fit rounded border border-[#303036] bg-[#101014] px-2 py-1 font-mono text-[11px] text-[#d7ccff]">
        {keys}
      </kbd>
      <span className="text-[#c9c9d1]">{action}</span>
    </div>
  );
}

function TipCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-xl border border-[#6f55d9]/25 bg-[#6f55d9]/10 p-4">
      <h3 className="text-sm font-semibold text-[#f2f2f3]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#c9b8ff]">{text}</p>
    </article>
  );
}

function IssueCard({ title, answer }: { title: string; answer: string }) {
  return (
    <article className="rounded-xl border border-[#2f2f35] bg-[#19191d] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <HelpCircle className="h-4 w-4 text-[#9a8cff]" aria-hidden="true" />
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#9b9ba3]">{answer}</p>
    </article>
  );
}
