export type CtaHrefType = 'whatsapp' | 'section' | 'custom';

export interface PortfolioCta {
  label: string;
  hrefType?: CtaHrefType;
  href?: string;
  targetSection?: string;
}

export interface PortfolioMetric {
  value: string;
  label: string;
}

export interface PortfolioIconLabelItem {
  label: string;
  icon?: string;
  active?: boolean;
}

export interface PortfolioHeroContent {
  verifiedBadge: string;
  headlineLine1: string;
  headlineLine2: string;
  headlineLine3: string;
  rotatingWords: string[];
  subheadline: string;
  serviceHighlights: PortfolioIconLabelItem[];
  primaryCta: PortfolioCta;
  secondaryCta: PortfolioCta;
  microcopy: string;
  dashboardPreview: {
    searchLabel: string;
    statusLabel: string;
    badge: string;
    title: string;
    progressLabel: string;
    progressValue: number;
    secondaryProgressLabel: string;
    cards: {
      label: string;
      value: string;
      icon?: string;
      tone?: string;
    }[];
    processLabel: string;
    processMicrocopy: string;
    desktopProcessSteps: string[];
    mobileProcessSteps: string[];
    previewTitle: string;
    previewBadge: string;
    metricsTitle: string;
    metrics: PortfolioMetric[];
  };
}

export interface PortfolioAboutContent {
  badge: string;
  titleLine1: string;
  titleHighlight: string;
  subtitleTemplate: string;
  availabilityLabel: string;
  techTitle: string;
  technologies: string[];
  satisfaction: {
    value: string;
    label: string;
    microcopy: string;
  };
  differentiator: {
    title: string;
    description: string;
    items: PortfolioIconLabelItem[];
  };
  cta: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
    copiedLabel: string;
  };
}

export interface PortfolioServiceItem {
  name: string;
  icon?: string;
  description: string;
  features: string[];
  price: string;
  delivery: string;
  popular: boolean;
  badge: string;
  cta: string;
  results: string;
  guarantee: string;
  active: boolean;
  position: number;
  bgColor: string;
  borderColor: string;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  priceColor: string;
  tagColor: string;
  featureDot: string;
}

export interface PortfolioServicesContent {
  titlePrefix: string;
  titleHighlight: string;
  subtitle: string;
  services: PortfolioServiceItem[];
  finalCta: {
    title: string;
    description: string;
    label: string;
    microcopy: string;
  };
}

export interface PortfolioProcessStep {
  step: string;
  title: string;
  description: string;
  details: string[];
  duration: string;
  image: string;
  color: string;
  active: boolean;
  position: number;
}

export interface PortfolioProcessContent {
  badge: string;
  titlePrefix: string;
  titleHighlight: string;
  titleSuffix: string;
  subtitle: string;
  includedLabel: string;
  steps: PortfolioProcessStep[];
  guarantees: PortfolioIconLabelItem[];
  finalCta: {
    title: string;
    description: string;
    label: string;
  };
}

export interface PortfolioContactContent {
  titlePrefix: string;
  titleHighlight: string;
  subtitlePrefix: string;
  subtitleHighlight: string;
  subtitleSuffix: string;
  primaryCtaLabel: string;
  separatorLabel: string;
  emailLabel: string;
  copiedEmailLabel: string;
  phoneLabel: string;
  trustMicrocopy: string;
}

export interface PortfolioProjectsContent {
  organizerTabs: string[];
}

export interface PortfolioSettingsContent {
  publicPageButtonLabel: string;
  defaultWhatsappMessage: string;
}

export interface PortfolioContentData {
  hero: PortfolioHeroContent;
  about: PortfolioAboutContent;
  services: PortfolioServicesContent;
  process: PortfolioProcessContent;
  contact: PortfolioContactContent;
  projects: PortfolioProjectsContent;
  settings: PortfolioSettingsContent;
}

export type PortfolioSectionKey = keyof PortfolioContentData;
