export type DailyChecklistPeriod = 'Morning' | 'Afternoon' | 'Night';

export interface DailyChecklistTemplateItem {
  slug: string;
  title: string;
  description: string;
  period: DailyChecklistPeriod;
  timeRange: string;
  startTime: string;
  endTime: string;
  position: number;
  isSacred?: boolean;
}

export const DAILY_CHECKLIST_ITEMS: DailyChecklistTemplateItem[] = [
  {
    slug: 'wakeup',
    title: 'WakeUp',
    description: 'Acordar + 5 minutos de alongamento.',
    period: 'Morning',
    timeRange: '7h - 8h',
    startTime: '7h',
    endTime: '8h',
    position: 10,
  },
  {
    slug: 'pray-morning',
    title: 'Pray',
    description: 'Devocional / Oracao / Leitura Biblica.',
    period: 'Morning',
    timeRange: '8h - 9h',
    startTime: '8h',
    endTime: '9h',
    position: 20,
  },
  {
    slug: 'setup-fechado',
    title: 'Setup Fechado',
    description:
      'Ligar notebook. Abrir apenas as abas do Portfolio. Nao abrir e-mail. Verificar somente a planilha do dia.',
    period: 'Morning',
    timeRange: '9h - 9h30',
    startTime: '9h',
    endTime: '9h30',
    position: 30,
  },
  {
    slug: 'deep-work-leve',
    title: 'Deep Work Leve',
    description:
      'Aquecimento para o Portfolio. Organizar assets, revisar o que fez ontem.',
    period: 'Morning',
    timeRange: '9h30 - 10h',
    startTime: '9h30',
    endTime: '10h',
    position: 40,
  },
  {
    slug: 'breakfast',
    title: 'Breakfast',
    description: 'Cafe da manha.',
    period: 'Morning',
    timeRange: '10h - 10h30',
    startTime: '10h',
    endTime: '10h30',
    position: 50,
  },
  {
    slug: 'portfolio',
    title: 'PORTFOLIO',
    description: 'Horario sagrado. Zero distracoes.',
    period: 'Morning',
    timeRange: '10h30 - 12h',
    startTime: '10h30',
    endTime: '12h',
    position: 60,
    isSacred: true,
  },
  {
    slug: 'foco-secundario',
    title: 'Foco Secundario',
    description:
      'Escolher uma opcao: adiantar disparo de e-mails, Neodoxa leve, caminhada ou tarefa domestica leve.',
    period: 'Afternoon',
    timeRange: '12h - 13h',
    startTime: '12h',
    endTime: '13h',
    position: 70,
  },
  {
    slug: 'lunch',
    title: 'Lunch',
    description: 'Almoco.',
    period: 'Afternoon',
    timeRange: '13h - 14h',
    startTime: '13h',
    endTime: '14h',
    position: 80,
  },
  {
    slug: 'disparo-emails',
    title: 'Disparo de E-mails',
    description: 'Se ja fez as 12h, usar para prospeccao ou networking.',
    period: 'Afternoon',
    timeRange: '14h - 15h',
    startTime: '14h',
    endTime: '15h',
    position: 90,
  },
  {
    slug: 'neodoxa',
    title: 'Neodoxa',
    description:
      'Bloco fechado. Timer sugerido: 50 minutos de foco + 10 minutos de pausa.',
    period: 'Afternoon',
    timeRange: '15h - 17h',
    startTime: '15h',
    endTime: '17h',
    position: 100,
    isSacred: true,
  },
  {
    slug: 'publicacoes-divulgacoes',
    title: 'Publicacoes e Divulgacoes',
    description: 'Horario nobre para engajamento organico.',
    period: 'Afternoon',
    timeRange: '17h - 18h',
    startTime: '17h',
    endTime: '18h',
    position: 110,
  },
  {
    slug: 'coffee-fechamento',
    title: 'Afternoon Coffee + Fechamento do Dia',
    description:
      'Enquanto toma cafe, desligar notebook. Fechar abas de trabalho.',
    period: 'Night',
    timeRange: '18h - 19h',
    startTime: '18h',
    endTime: '19h',
    position: 120,
  },
  {
    slug: 'church-reading-guitar',
    title: 'Church / Reading / Guitar',
    description: 'Igreja, leitura ou violao.',
    period: 'Night',
    timeRange: '19h - 21h',
    startTime: '19h',
    endTime: '21h',
    position: 130,
  },
  {
    slug: 'talk-with-my-lady',
    title: 'Talk with my lady',
    description: 'Tempo de qualidade.',
    period: 'Night',
    timeRange: '21h - 22h',
    startTime: '21h',
    endTime: '22h',
    position: 140,
  },
  {
    slug: 'pray-sleep',
    title: 'Pray and Sleep',
    description: 'Oracao e desligar para dormir.',
    period: 'Night',
    timeRange: '22h - 23h',
    startTime: '22h',
    endTime: '23h',
    position: 150,
  },
];

export const DAILY_CHECKLIST_REMINDERS = [
  'Regra dos 5 Minutos',
  'Batching de E-mail',
  'Visualizacao / marcar progresso',
];
