/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prismaClient = new PrismaClient();

const projects = [
  {
    title: 'Neodoxa Delivery',
    category: 'Sistema Web',
    description:
      'Sistema de delivery moderno e responsivo para restaurante especializado em marmitas.',
    fullDescription:
      'Plataforma completa desenvolvida para a Neodoxa Delivery, apresentando cardápio, pedidos online e integração com WhatsApp. Otimizada para conversão e experiência mobile, com pagamentos via Stripe e painel administrativo.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_neodoxadelivery.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Prisma',
      'Stripe',
      'Tailwind CSS',
      'NeonDB',
      'Google Auth',
      'ShadCN',
    ],
    liveUrl: 'https://neodoxa-delivery.vercel.app/',
    githubUrl: null,
    featured: true,
    status: 'in-progress',
    accentColor: 'from-blue-500/20 to-purple-600/20',
  },
  {
    title: 'EPI System',
    category: 'Sistema Web',
    description: 'Sistema web para controle e gestão de EPIs em empresas',
    fullDescription:
      'Sistema web para gestão integral de EPIs, incluindo controle de estoque, registro de entregas, devoluções com assinatura digital e geração de relatórios PDF. A arquitetura utiliza Next.js com TypeScript no frontend e NeonDB como banco de dados PostgreSQL com ORM Prisma de suporte. A aplicação está hospedada na Vercel com integração contínua.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_episystem.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Lucide React',
      'ShadCN',
      'Bcryptjs',
      'Jspdf',
      'Recharts',
      'Prisma',
      'NeonDB',
      'Vercel',
    ],
    liveUrl: 'https://episystem.vercel.app/',
    githubUrl: null,
    featured: true,
    status: 'in-progress',
    accentColor: 'from-purple-500/20 to-pink-600/20',
  },
  {
    title: 'Nazario Cicles',
    category: 'Sistema Web',
    description: 'Sistema web de auto agendamento para oficina de bicicletas',
    fullDescription:
      'Sistema web desenvolvido para a Nazario Cicles, permitindo o auto agendamento de serviços de manutenção e reparo de bicicletas de forma prática e organizada. A plataforma conta com autenticação via Google, gerenciamento de horários disponíveis, cadastro de serviços e controle de agendamentos. Desenvolvido com Next.js e TypeScript, utilizando Prisma e NeonDB para persistência de dados, com foco em performance, usabilidade e experiência do usuário, especialmente em dispositivos móveis.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_nazariocicles.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Lucide React',
      'Google Auth',
      'Prisma',
      'NeonDB',
      'Vercel',
    ],
    liveUrl: 'https://nazariocicles.vercel.app/',
    githubUrl: null,
    featured: true,
    status: 'in-progress',
    accentColor: 'from-purple-500/20 to-pink-600/20',
  },
  {
    title: 'Tarefando',
    category: 'Sistema Web',
    description:
      'Gerenciador de tarefas simples e eficiente para organizar o dia a dia.',
    fullDescription:
      'Sistema web com funcionalidades de adicionar, editar e concluir tarefas. Interface intuitiva e responsiva, com armazenamento local e design minimalista.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_tarefando.png',
    technologies: ['Python', 'Django', 'NeonDb'],
    liveUrl: 'https://tarefando-one.vercel.app/',
    githubUrl: null,
    featured: false,
    status: 'completed',
    accentColor: 'from-indigo-500/20 to-sky-600/20',
  },
  {
    title: 'Insertion 3D Studio',
    category: 'Serviços Profissionais',
    description:
      'Landing Page moderna e otimizada desenvolvida para um estúdio nacional de design imobiliário 3D.',
    fullDescription:
      'Projeto com foco em SEO, acessibilidade, alta performance e experiência do usuário. Totalmente responsivo e integrado a ferramentas modernas de envio e gestão de conteúdo.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_insertion.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Lucide React',
      'Resend',
      'Artifact UI',
      'Aceternity UI',
      'Framer Motion',
      'Supabase',
      'NeonDB',
      'Prisma',
      'Vercel',
    ],
    liveUrl: 'https://insertion.com.br/',
    githubUrl: null,
    featured: true,
    status: 'completed',
    accentColor: 'from-teal-400 to-emerald-500',
  },
  {
    title: 'Fran Costa | Mentora & Designer de Olhar',
    category: 'Serviços Profissionais',
    description:
      'Divulgação de serviços e curso de beleza da Mentora Fran Costa.',
    fullDescription:
      'Foco em designer premium e elegante, palheta de cores seguindo as redes sociais da Fran Costa, navegação fluida e responsiva. Desenvolvido com animações suaves via Framer Motion e SEO otimizado.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_francostaacademy.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Framer Motion',
      'Tailwind CSS',
      'Lucide React',
      'Artifact UI',
      'Aceternity UI',
      'Supabase',
      'NeonDB',
      'Prisma',
      'Vercel',
    ],
    liveUrl: 'https://francostaacademy.vercel.app/francostaacademy',
    githubUrl: null,
    featured: true,
    status: 'completed',
    accentColor: 'from-purple-500/20 to-pink-600/20',
  },
  {
    title: 'Erik Santos',
    category: 'Portfólio Pessoal',
    description:
      'Portfólio moderno e minimalista para desenvolvedor web full-stack.',
    fullDescription:
      'Portfólio pessoal com foco em design limpo, navegação fluida e destaque para projetos, tecnologias dominadas e formas de contato. Desenvolvido com animações suaves via Framer Motion e SEO otimizado.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_eriksantos.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Framer Motion',
      'Tailwind CSS',
      'Lucide React',
      'ShadCN',
      'Prisma',
      'NeonDB',
      'Vercel',
    ],
    liveUrl: 'https://eriksantos.vercel.app',
    githubUrl: null,
    featured: true,
    status: 'completed',
    accentColor: 'from-purple-500/20 to-pink-600/20',
  },
  {
    title: 'Sendo Metanoiamente Bíblico',
    category: 'Página de Vendas',
    description:
      'Landing page para e-book focado em crescimento espiritual e estudo bíblico.',
    fullDescription:
      'Página de vendas otimizada para conversão, com design limpo e foco na mensagem do e-book. Inclui seções estratégicas para destacar benefícios, conteúdo e chamada para ação clara.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_metanoiamentebiblico.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Framer Motion',
      'Prisma',
      'NeonDB',
      'Aceternity UI',
    ],
    liveUrl: 'https://metanoiamentebiblico.vercel.app',
    githubUrl: null,
    featured: true,
    status: 'completed',
    accentColor: 'from-pink-500/20 to-purple-600/20',
  },
  {
    title: 'Neodoxa',
    category: 'Serviços Profissionais',
    description:
      'Landing page para agência de marketing e desenvolvimento digital.',
    fullDescription:
      'Landing page institucional da Neodoxa, criada para reforçar presença digital e captar leads. Interface moderna com animações suaves e seções estratégicas.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_neodoxa.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Framer Motion',
      'Prisma',
      'NeonDB',
      'ShadCN',
    ],
    liveUrl: 'https://neodoxa.vercel.app/neodoxa',
    githubUrl: null,
    featured: true,
    status: 'in-progress',
    accentColor: 'from-pink-500/20 to-purple-600/20',
  },
  {
    title: 'Projeto Cafarnaum Em Ação',
    category: 'Institucional',
    description:
      'Landing page simples e eficaz para organização sem fins lucrativos.',
    fullDescription:
      'Landing page desenvolvida para o Projeto Cafarnaum Em Ação, com foco em apresentar a missão, projetos e formas de apoio. Design limpo, responsivo e otimizado para engajamento.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_projetocafarnaum.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Prisma',
      'Tailwind CSS',
      'NeonDB',
      'Supabase',
    ],
    liveUrl: 'https://projetocafarnaum.vercel.app/',
    githubUrl: null,
    featured: false,
    status: 'completed',
    accentColor: 'from-yellow-500/20 to-orange-600/20',
  },
  {
    title: 'Gil Schinaider Terceirizações',
    category: 'Serviços Profissionais',
    description:
      'Landing page institucional desenvolvida para empresa de terceirização e serviços de limpeza profissional.',
    fullDescription:
      'Projeto focado em transmitir confiança e credibilidade, com design limpo, responsivo e otimizado para conversão via WhatsApp. Estruturado com tecnologias modernas e performance aprimorada.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_gilshinaider.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Artifact UI',
      'Aceternity UI',
      'NeonDB',
      'Prisma',
      'Vercel',
    ],
    liveUrl: 'https://gilschinaider.vercel.app/',
    githubUrl: null,
    featured: false,
    status: 'completed',
    accentColor: 'from-sky-400/30 to-blue-600/40',
  },
  {
    title: 'RDS Eletricista',
    category: 'Serviços Profissionais',
    description:
      'Landing page institucional para profissional autônomo da área elétrica.',
    fullDescription:
      'Site criado para o eletricista RDS, com foco em autoridade, confiança e conversão. Design escuro, moderno e integração direta com WhatsApp para orçamentos.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_rdseletrecista.png',
    technologies: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Vercel'],
    liveUrl: 'https://rds-psi.vercel.app/rds',
    githubUrl: null,
    featured: false,
    status: 'completed',
    accentColor: 'from-yellow-400/20 to-orange-500/20',
  },
  {
    title: 'Rafa Manicure & Pedicure',
    category: 'Serviços Profissionais',
    description: 'Landing page para profissionais em limpeza e zeladoria',
    fullDescription:
      'Desenvolvido para Rafa Manicure, com um design feminino e elegante. Inclui galeria de serviços, integração para contato rápido e layout 100% responsivo.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_rafamanicure.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Prisma',
      'NeonDB',
      'Vercel',
    ],
    liveUrl: 'https://rafamanicurepedicure.vercel.app/rafamanicurepedicure',
    githubUrl: null,
    featured: false,
    status: 'completed',
    accentColor: 'from-rose-500/20 to-pink-600/20',
  },
  {
    title: 'Itajuba Casamar',
    category: 'Serviços Profissionais',
    description:
      'Landing page desenvolvida para destacar empreendimentos imobiliários com design moderno e foco em performance.',
    fullDescription:
      'Projeto desenvolvido para a construtora Rottas, apresentando o empreendimento Itajuba Casamar com ênfase em experiência do usuário, responsividade e carregamento otimizado. A página foi criada para valorizar o alto padrão do empreendimento e fortalecer a presença digital da marca.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_itajubacasamar.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'NeonDB',
      'Prisma',
      'Vercel',
    ],
    liveUrl: 'https://itajubacasamar.vercel.app/',
    githubUrl: null,
    featured: false,
    status: 'completed',
    accentColor: 'from-blue-700/30 to-sky-400/30',
  },
  {
    title: 'Marivaldo Corretor de Imóveis',
    category: 'Serviços Profissionais',
    description:
      'Landing page moderna e estratégica para corretores de imóveis.',
    fullDescription:
      'Desenvolvimento de uma landing page com foco em conversão e autoridade. Inclui apresentação profissional, portfólio de imóveis, formulário de contato e integração com WhatsApp.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_marivaldo.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Tailwind CSS',
      'Prisma',
      'NeonDB',
      'ShadCN',
      'Vercel',
    ],
    liveUrl: 'https://corretor-landing-page.vercel.app/',
    githubUrl: null,
    featured: false,
    status: 'completed',
    accentColor: 'from-green-500/20 to-emerald-600/20',
  },
  {
    title: 'João Garcia Fotografia',
    category: 'Serviços Profissionais',
    description:
      'Landing page artística e elegante para fotógrafo profissional.',
    fullDescription:
      'Landing page desenvolvida para o fotógrafo João Garcia, com galeria categorizada, depoimentos e contato direto via WhatsApp. Layout moderno, foco visual e excelente responsividade.',
    image:
      'https://gudqtxvqbcdmtamnilpl.supabase.co/storage/v1/object/public/images/featured_joaogarcia.png',
    technologies: [
      'Next.js',
      'TypeScript',
      'Prisma',
      'Tailwind CSS',
      'NeonDB',
      'ShadCN',
      'Vercel',
    ],
    liveUrl: 'https://joaogarcia.vercel.app/joaogarcia',
    githubUrl: null,
    featured: false,
    status: 'completed',
    accentColor: 'from-yellow-500/20 to-orange-600/20',
  },
];

const main = async () => {
  try {
    const name = process.env.SEED_USER_NAME?.trim();
    const username = process.env.SEED_USERNAME?.trim().toLowerCase();
    const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_USER_PASSWORD;

    if (!name || !username || !email || !password) {
      throw new Error(
        'Defina SEED_USER_NAME, SEED_USERNAME, SEED_USER_EMAIL e SEED_USER_PASSWORD.'
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await prismaClient.$transaction(
      async (tx: any) => {
        let user = await tx.user.findFirst({
          where: { OR: [{ username }, { email }] },
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              name,
              username,
              email,
              passwordHash,
              role: 'OWNER',
            },
          });
        }

        let landingPage = await tx.landingPage.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'asc' },
        });

        if (!landingPage) {
          landingPage = await tx.landingPage.create({
            data: {
              userId: user.id,
              name,
              slug: username,
              description: `Portfólio de ${name}`,
              avatarImageUrl: '',
              coverImageUrl: '',
            },
          });
        }

        await tx.contactInfo.upsert({
          where: { landingpageId: landingPage.id },
          create: { landingpageId: landingPage.id, email },
          update: {},
        });

        await tx.portfolioContent.upsert({
          where: { landingpageId: landingPage.id },
          create: { landingpageId: landingPage.id },
          update: {},
        });

        const projectCount = await tx.project.count({
          where: { userId: user.id },
        });
        if (projectCount === 0) {
          await tx.project.createMany({
            data: projects.map((project, position) => ({
              ...project,
              userId: user.id,
              landingpageId: landingPage.id,
              position,
            })),
          });
        }

        return { user, landingPage, projectsCreated: projectCount === 0 };
      },
      { timeout: 30000 }
    );

    console.log('Seed concluído.');
    console.log(`Usuário: ${result.user.username}`);
    console.log(`Portfólio: /${result.landingPage.slug}`);
    console.log(
      `Projetos: ${result.projectsCreated ? projects.length : 'já existentes'}`
    );
  } catch (error) {
    console.error('\n❌ Erro ao executar o seed:', error);
    process.exit(1);
  } finally {
    await prismaClient.$disconnect();
  }
};

main();
