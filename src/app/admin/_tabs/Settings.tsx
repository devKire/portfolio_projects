'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';

import {
  getPortfolioContent,
  resetPortfolioSectionToDefault,
  updateContactInfo,
  updateLandingPageInfo,
  updatePortfolioSection,
  type ContactInfoInput,
  type LandingPageInfoInput,
} from '@/app/actions/portfolio-content';
import type {
  PortfolioAboutContent,
  PortfolioContactContent,
  PortfolioContentData,
  PortfolioHeroContent,
  PortfolioProcessContent,
  PortfolioProcessStep,
  PortfolioSectionKey,
  PortfolioServiceItem,
  PortfolioServicesContent,
} from '@/lib/portfolio-content/types';

import { EditableList } from './settings/_components/editable-list';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const SECTION_TABS: {
  id: PortfolioSectionKey | 'general' | 'contactInfo';
  label: string;
}[] = [
  { id: 'general', label: 'Geral' },
  { id: 'contactInfo', label: 'Contato' },
  { id: 'hero', label: 'Hero' },
  { id: 'about', label: 'Sobre' },
  { id: 'services', label: 'Serviços' },
  { id: 'process', label: 'Processo' },
  { id: 'contact', label: 'Contato final' },
];

const DEFAULT_LANDINGPAGE_ID = '3eb3839d-eb78-43ed-9eb7-8f39352d64bb';

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#f2f2f3]">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-[#303036] bg-[#19191d]/60 px-3 text-sm text-white transition-colors outline-none placeholder:text-[#777780] focus:border-[#9a8cff]/50"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[#f2f2f3]">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-lg border border-[#303036] bg-[#19191d]/60 px-3 py-3 text-sm text-white transition-colors outline-none placeholder:text-[#777780] focus:border-[#9a8cff]/50"
      />
    </label>
  );
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-1 text-sm text-[#777780]">{description}</p>
      </div>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}

function moveItem<T extends { position?: number }>(
  items: T[],
  index: number,
  direction: -1 | 1
) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;

  const next = [...items];
  const current = next[index];
  next[index] = next[nextIndex];
  next[nextIndex] = current;
  return next.map((item, itemIndex) => ({ ...item, position: itemIndex }));
}

function ServiceEditor({
  services,
  onChange,
}: {
  services: PortfolioServiceItem[];
  onChange: (services: PortfolioServiceItem[]) => void;
}) {
  const addService = () => {
    onChange([
      ...services,
      {
        name: 'Novo serviço',
        icon: 'rocket',
        description: '',
        features: [],
        price: 'A partir de R$',
        delivery: '',
        popular: false,
        badge: 'Novo',
        cta: 'Solicitar proposta',
        results: '',
        guarantee: '',
        active: true,
        position: services.length,
        bgColor: 'bg-slate-100',
        borderColor: 'border-slate-300',
        iconBg: 'bg-slate-200',
        iconColor: 'text-slate-700',
        badgeBg: 'bg-slate-500',
        priceColor: 'text-slate-700',
        tagColor: 'bg-slate-50 text-slate-700',
        featureDot: 'text-[#777780]',
      },
    ]);
  };

  const updateService = (index: number, service: PortfolioServiceItem) => {
    onChange(
      services.map((item, itemIndex) => (itemIndex === index ? service : item))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[#f2f2f3]">
          Cards de serviço
        </span>
        <button
          type="button"
          onClick={addService}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#9a8cff]/30 bg-[#9a8cff]/10 px-3 text-xs text-cyan-100 transition-colors hover:bg-[#9a8cff]/15"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {services.map((service, index) => (
        <div
          key={`${service.name}-${index}`}
          className="rounded-xl border border-[#2f2f35] bg-[#1e1e22] p-4"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-[#dcddde]">
              <input
                type="checkbox"
                checked={service.active}
                onChange={(event) =>
                  updateService(index, {
                    ...service,
                    active: event.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-[#303036] bg-[#19191d]"
              />
              Ativo
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange(moveItem(services, index, -1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#303036] bg-[#19191d] text-[#dcddde] disabled:opacity-40"
                disabled={index === 0}
                aria-label="Subir serviço"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(moveItem(services, index, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#303036] bg-[#19191d] text-[#dcddde] disabled:opacity-40"
                disabled={index === services.length - 1}
                aria-label="Descer serviço"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    services.filter((_, itemIndex) => itemIndex !== index)
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-200"
                aria-label="Remover serviço"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Nome"
              value={service.name}
              onChange={(value) =>
                updateService(index, { ...service, name: value })
              }
            />
            <Field
              label="Ícone"
              value={service.icon || ''}
              onChange={(value) =>
                updateService(index, { ...service, icon: value })
              }
            />
            <Field
              label="Preço"
              value={service.price}
              onChange={(value) =>
                updateService(index, { ...service, price: value })
              }
            />
            <Field
              label="Prazo"
              value={service.delivery}
              onChange={(value) =>
                updateService(index, { ...service, delivery: value })
              }
            />
            <Field
              label="Badge"
              value={service.badge}
              onChange={(value) =>
                updateService(index, { ...service, badge: value })
              }
            />
            <Field
              label="CTA"
              value={service.cta}
              onChange={(value) =>
                updateService(index, { ...service, cta: value })
              }
            />
          </div>
          <div className="mt-4 grid gap-4">
            <TextArea
              label="Descrição"
              value={service.description}
              onChange={(value) =>
                updateService(index, { ...service, description: value })
              }
            />
            <Field
              label="Resultado"
              value={service.results}
              onChange={(value) =>
                updateService(index, { ...service, results: value })
              }
            />
            <Field
              label="Garantia"
              value={service.guarantee}
              onChange={(value) =>
                updateService(index, { ...service, guarantee: value })
              }
            />
            <EditableList
              label="Features"
              values={service.features}
              onChange={(features) =>
                updateService(index, { ...service, features })
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProcessStepEditor({
  steps,
  onChange,
}: {
  steps: PortfolioProcessStep[];
  onChange: (steps: PortfolioProcessStep[]) => void;
}) {
  const addStep = () => {
    onChange([
      ...steps,
      {
        step: String(steps.length + 1).padStart(2, '0'),
        title: 'Nova etapa',
        description: '',
        details: [],
        duration: '',
        image: '',
        color: 'from-[#6f55d9] to-[#6f55d9]',
        active: true,
        position: steps.length,
      },
    ]);
  };

  const updateStep = (index: number, step: PortfolioProcessStep) => {
    onChange(
      steps.map((item, itemIndex) => (itemIndex === index ? step : item))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[#f2f2f3]">Etapas</span>
        <button
          type="button"
          onClick={addStep}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#9a8cff]/30 bg-[#9a8cff]/10 px-3 text-xs text-cyan-100 transition-colors hover:bg-[#9a8cff]/15"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar
        </button>
      </div>

      {steps.map((step, index) => (
        <div
          key={`${step.step}-${index}`}
          className="rounded-xl border border-[#2f2f35] bg-[#1e1e22] p-4"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-[#dcddde]">
              <input
                type="checkbox"
                checked={step.active}
                onChange={(event) =>
                  updateStep(index, { ...step, active: event.target.checked })
                }
                className="h-4 w-4 rounded border-[#303036] bg-[#19191d]"
              />
              Ativa
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange(moveItem(steps, index, -1))}
                disabled={index === 0}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#303036] bg-[#19191d] text-[#dcddde] disabled:opacity-40"
                aria-label="Subir etapa"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onChange(moveItem(steps, index, 1))}
                disabled={index === steps.length - 1}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#303036] bg-[#19191d] text-[#dcddde] disabled:opacity-40"
                aria-label="Descer etapa"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(steps.filter((_, itemIndex) => itemIndex !== index))
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-200"
                aria-label="Remover etapa"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Número"
              value={step.step}
              onChange={(value) => updateStep(index, { ...step, step: value })}
            />
            <Field
              label="Título"
              value={step.title}
              onChange={(value) => updateStep(index, { ...step, title: value })}
            />
            <Field
              label="Duração"
              value={step.duration}
              onChange={(value) =>
                updateStep(index, { ...step, duration: value })
              }
            />
            <Field
              label="Gradiente"
              value={step.color}
              onChange={(value) => updateStep(index, { ...step, color: value })}
            />
          </div>
          <div className="mt-4 grid gap-4">
            <TextArea
              label="Descrição"
              value={step.description}
              onChange={(value) =>
                updateStep(index, { ...step, description: value })
              }
            />
            <Field
              label="Imagem"
              value={step.image}
              onChange={(value) => updateStep(index, { ...step, image: value })}
            />
            <EditableList
              label="Detalhes"
              values={step.details}
              onChange={(details) => updateStep(index, { ...step, details })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] =
    useState<(typeof SECTION_TABS)[number]['id']>('general');
  const [landingpage, setLandingpage] = useState<LandingPageInfoInput | null>(
    null
  );
  const [contactInfo, setContactInfo] = useState<ContactInfoInput | null>(null);
  const [content, setContent] = useState<PortfolioContentData | null>(null);
  const [baseline, setBaseline] = useState<{
    landingpage: LandingPageInfoInput | null;
    contactInfo: ContactInfoInput | null;
    content: PortfolioContentData | null;
  }>({ landingpage: null, contactInfo: null, content: null });
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    void loadContent();
  }, []);

  const publicUrl = useMemo(
    () => (landingpage?.slug ? `/${landingpage.slug}` : '/'),
    [landingpage?.slug]
  );

  const loadContent = async () => {
    setLoading(true);
    const result = await getPortfolioContent(DEFAULT_LANDINGPAGE_ID);
    if (result.success) {
      setLandingpage(result.data.landingpage);
      setContactInfo(result.data.contactInfo);
      setContent(result.data.content);
      setBaseline(result.data);
      setErrorMessage('');
    } else {
      setErrorMessage(result.error);
    }
    setLoading(false);
  };

  const cancelDraft = () => {
    setLandingpage(baseline.landingpage);
    setContactInfo(baseline.contactInfo);
    setContent(baseline.content);
    setSaveState('idle');
    setErrorMessage('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void saveActive();
    }
    if (event.key === 'Escape') {
      cancelDraft();
    }
  };

  const saveActive = async () => {
    if (!landingpage || !content) return;
    setSaveState('saving');
    setErrorMessage('');

    const result =
      activeTab === 'general'
        ? await updateLandingPageInfo(landingpage)
        : activeTab === 'contactInfo'
          ? await updateContactInfo({
              ...(contactInfo || { email: '' }),
              landingpageId: landingpage.id,
            })
          : await updatePortfolioSection(
              landingpage.id,
              activeTab,
              content[activeTab]
            );

    if (result.success) {
      setSaveState('saved');
      await loadContent();
      setTimeout(() => setSaveState('idle'), 1600);
    } else {
      setSaveState('error');
      setErrorMessage(result.error);
    }
  };

  const resetSection = async () => {
    if (!landingpage || activeTab === 'general' || activeTab === 'contactInfo')
      return;
    setSaveState('saving');
    const result = await resetPortfolioSectionToDefault(
      landingpage.id,
      activeTab
    );
    if (result.success) {
      await loadContent();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 1600);
    } else {
      setSaveState('error');
      setErrorMessage(result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center text-[#9b9ba3]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando CMS...
      </div>
    );
  }

  if (!landingpage || !content) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        {errorMessage || 'Não foi possível carregar o conteúdo.'}
      </div>
    );
  }

  const hero = content.hero;
  const about = content.about;
  const services = content.services;
  const process = content.process;
  const contactSection = content.contact;

  const updateContent = <K extends PortfolioSectionKey>(
    section: K,
    value: PortfolioContentData[K]
  ) => {
    setContent((current) =>
      current ? { ...current, [section]: value } : current
    );
    setSaveState('idle');
  };

  return (
    <div onKeyDown={handleKeyDown} className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-[#c9b8ff] uppercase">
            CMS do Portfólio
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Configurações de conteúdo
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[#777780]">
            Edite textos, CTAs, listas e cards da página pública sem alterar
            código. Projetos continuam no tab Projetos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#303036] bg-[#19191d] px-3 text-sm text-[#f2f2f3] transition-colors hover:border-[#33333a]"
          >
            <ExternalLink className="h-4 w-4" />
            Ver página
          </a>
          {activeTab !== 'general' && activeTab !== 'contactInfo' ? (
            <button
              type="button"
              onClick={resetSection}
              disabled={saveState === 'saving'}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-sm text-amber-100 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Restaurar seção
            </button>
          ) : null}
          <button
            type="button"
            onClick={cancelDraft}
            disabled={saveState === 'saving'}
            className="inline-flex h-10 items-center rounded-lg border border-[#303036] bg-[#19191d] px-3 text-sm text-[#f2f2f3] transition-colors hover:border-[#33333a] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void saveActive()}
            disabled={saveState === 'saving'}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#6f55d9] px-4 text-sm font-medium text-gray-950 transition-colors hover:bg-[#9a8cff] disabled:opacity-60"
          >
            {saveState === 'saving' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saveState === 'saved' ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saveState === 'saving'
              ? 'Salvando...'
              : saveState === 'saved'
                ? 'Salvo'
                : 'Salvar'}
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-2">
          {SECTION_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#6f55d9] text-gray-950'
                  : 'border border-[#2f2f35] bg-[#1e1e22] text-[#dcddde] hover:border-[#303036]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        <section className="rounded-xl border border-[#2f2f35] bg-[#1e1e22] p-4 md:p-5">
          {activeTab === 'general' ? (
            <SectionShell
              title="Geral"
              description="Dados básicos e imagens principais da landing page."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Nome"
                  value={landingpage.name}
                  onChange={(name) => setLandingpage({ ...landingpage, name })}
                />
                <Field
                  label="Slug"
                  value={landingpage.slug}
                  onChange={(slug) => setLandingpage({ ...landingpage, slug })}
                />
              </div>
              <TextArea
                label="Descrição/Bio"
                value={landingpage.description}
                onChange={(description) =>
                  setLandingpage({ ...landingpage, description })
                }
                rows={4}
              />
              <Field
                label="Avatar URL"
                value={landingpage.avatarImageUrl}
                onChange={(avatarImageUrl) =>
                  setLandingpage({ ...landingpage, avatarImageUrl })
                }
              />
              <Field
                label="Cover URL"
                value={landingpage.coverImageUrl}
                onChange={(coverImageUrl) =>
                  setLandingpage({ ...landingpage, coverImageUrl })
                }
              />
            </SectionShell>
          ) : null}

          {activeTab === 'contactInfo' ? (
            <SectionShell
              title="Contato"
              description="Dados de contato já usados nas CTAs e links sociais."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Email"
                  type="email"
                  value={contactInfo?.email || ''}
                  onChange={(email) =>
                    setContactInfo({
                      ...(contactInfo || {}),
                      email,
                      landingpageId: landingpage.id,
                    })
                  }
                />
                <Field
                  label="Telefone"
                  value={contactInfo?.phone || ''}
                  onChange={(phone) =>
                    setContactInfo({
                      ...(contactInfo || { email: '' }),
                      phone,
                      landingpageId: landingpage.id,
                    })
                  }
                />
                <Field
                  label="WhatsApp"
                  value={contactInfo?.whatsappLink || ''}
                  onChange={(whatsappLink) =>
                    setContactInfo({
                      ...(contactInfo || { email: '' }),
                      whatsappLink,
                      landingpageId: landingpage.id,
                    })
                  }
                />
                <Field
                  label="Instagram"
                  value={contactInfo?.instagramLink || ''}
                  onChange={(instagramLink) =>
                    setContactInfo({
                      ...(contactInfo || { email: '' }),
                      instagramLink,
                      landingpageId: landingpage.id,
                    })
                  }
                />
                <Field
                  label="Facebook"
                  value={contactInfo?.facebookLink || ''}
                  onChange={(facebookLink) =>
                    setContactInfo({
                      ...(contactInfo || { email: '' }),
                      facebookLink,
                      landingpageId: landingpage.id,
                    })
                  }
                />
                <Field
                  label="LinkedIn"
                  value={contactInfo?.linkedinLink || ''}
                  onChange={(linkedinLink) =>
                    setContactInfo({
                      ...(contactInfo || { email: '' }),
                      linkedinLink,
                      landingpageId: landingpage.id,
                    })
                  }
                />
              </div>
            </SectionShell>
          ) : null}

          {activeTab === 'hero' ? (
            <HeroForm
              hero={hero}
              onChange={(next) => updateContent('hero', next)}
            />
          ) : null}

          {activeTab === 'about' ? (
            <AboutForm
              about={about}
              onChange={(next) => updateContent('about', next)}
            />
          ) : null}

          {activeTab === 'services' ? (
            <ServicesForm
              services={services}
              onChange={(next) => updateContent('services', next)}
            />
          ) : null}

          {activeTab === 'process' ? (
            <ProcessForm
              process={process}
              onChange={(next) => updateContent('process', next)}
            />
          ) : null}

          {activeTab === 'contact' ? (
            <ContactSectionForm
              contact={contactSection}
              onChange={(next) => updateContent('contact', next)}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}

function HeroForm({
  hero,
  onChange,
}: {
  hero: PortfolioHeroContent;
  onChange: (hero: PortfolioHeroContent) => void;
}) {
  return (
    <SectionShell
      title="Hero"
      description="Headline, palavras rotativas, CTAs, métricas e preview fake."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Badge verificado"
          value={hero.verifiedBadge}
          onChange={(verifiedBadge) => onChange({ ...hero, verifiedBadge })}
        />
        <Field
          label="Linha 1"
          value={hero.headlineLine1}
          onChange={(headlineLine1) => onChange({ ...hero, headlineLine1 })}
        />
        <Field
          label="Linha 2"
          value={hero.headlineLine2}
          onChange={(headlineLine2) => onChange({ ...hero, headlineLine2 })}
        />
        <Field
          label="Linha 3"
          value={hero.headlineLine3}
          onChange={(headlineLine3) => onChange({ ...hero, headlineLine3 })}
        />
      </div>
      <TextArea
        label="Subheadline"
        value={hero.subheadline}
        onChange={(subheadline) => onChange({ ...hero, subheadline })}
      />
      <EditableList
        label="Palavras rotativas"
        values={hero.rotatingWords}
        onChange={(rotatingWords) => onChange({ ...hero, rotatingWords })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="CTA primário"
          value={hero.primaryCta.label}
          onChange={(label) =>
            onChange({ ...hero, primaryCta: { ...hero.primaryCta, label } })
          }
        />
        <Field
          label="CTA secundário"
          value={hero.secondaryCta.label}
          onChange={(label) =>
            onChange({ ...hero, secondaryCta: { ...hero.secondaryCta, label } })
          }
        />
        <Field
          label="Seção CTA secundário"
          value={hero.secondaryCta.targetSection || ''}
          onChange={(targetSection) =>
            onChange({
              ...hero,
              secondaryCta: { ...hero.secondaryCta, targetSection },
            })
          }
        />
        <Field
          label="Microcopy"
          value={hero.microcopy}
          onChange={(microcopy) => onChange({ ...hero, microcopy })}
        />
      </div>
      <EditableList
        label="Destaques de serviço"
        values={hero.serviceHighlights.map((item) => item.label)}
        onChange={(labels) =>
          onChange({
            ...hero,
            serviceHighlights: labels.map((label, index) => ({
              ...(hero.serviceHighlights[index] || {
                icon: 'sparkles',
                active: true,
              }),
              label,
            })),
          })
        }
      />
      <div className="rounded-xl border border-[#2f2f35] bg-black/20 p-4">
        <h4 className="mb-4 text-sm font-medium text-[#f2f2f3]">
          Preview do dashboard
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Título"
            value={hero.dashboardPreview.title}
            onChange={(title) =>
              onChange({
                ...hero,
                dashboardPreview: { ...hero.dashboardPreview, title },
              })
            }
          />
          <Field
            label="Progresso label"
            value={hero.dashboardPreview.progressLabel}
            onChange={(progressLabel) =>
              onChange({
                ...hero,
                dashboardPreview: { ...hero.dashboardPreview, progressLabel },
              })
            }
          />
          <Field
            label="Progresso valor"
            type="number"
            value={String(hero.dashboardPreview.progressValue)}
            onChange={(value) =>
              onChange({
                ...hero,
                dashboardPreview: {
                  ...hero.dashboardPreview,
                  progressValue: Number(value) || 0,
                },
              })
            }
          />
          <Field
            label="Título métricas"
            value={hero.dashboardPreview.metricsTitle}
            onChange={(metricsTitle) =>
              onChange({
                ...hero,
                dashboardPreview: { ...hero.dashboardPreview, metricsTitle },
              })
            }
          />
        </div>
        <div className="mt-4">
          <EditableList
            label="Etapas desktop"
            values={hero.dashboardPreview.desktopProcessSteps}
            onChange={(desktopProcessSteps) =>
              onChange({
                ...hero,
                dashboardPreview: {
                  ...hero.dashboardPreview,
                  desktopProcessSteps,
                },
              })
            }
          />
        </div>
      </div>
    </SectionShell>
  );
}

function AboutForm({
  about,
  onChange,
}: {
  about: PortfolioAboutContent;
  onChange: (about: PortfolioAboutContent) => void;
}) {
  return (
    <SectionShell
      title="Sobre"
      description="Textos da seção, tecnologias, diferenciais, estatísticas e CTA."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Badge"
          value={about.badge}
          onChange={(badge) => onChange({ ...about, badge })}
        />
        <Field
          label="Título"
          value={about.titleLine1}
          onChange={(titleLine1) => onChange({ ...about, titleLine1 })}
        />
        <Field
          label="Título destaque"
          value={about.titleHighlight}
          onChange={(titleHighlight) => onChange({ ...about, titleHighlight })}
        />
        <Field
          label="Subtítulo"
          value={about.subtitleTemplate}
          onChange={(subtitleTemplate) =>
            onChange({ ...about, subtitleTemplate })
          }
        />
        <Field
          label="Disponibilidade"
          value={about.availabilityLabel}
          onChange={(availabilityLabel) =>
            onChange({ ...about, availabilityLabel })
          }
        />
        <Field
          label="Título stack"
          value={about.techTitle}
          onChange={(techTitle) => onChange({ ...about, techTitle })}
        />
      </div>
      <EditableList
        label="Tecnologias"
        values={about.technologies}
        onChange={(technologies) => onChange({ ...about, technologies })}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Field
          label="Estatística"
          value={about.satisfaction.value}
          onChange={(value) =>
            onChange({
              ...about,
              satisfaction: { ...about.satisfaction, value },
            })
          }
        />
        <Field
          label="Label estatística"
          value={about.satisfaction.label}
          onChange={(label) =>
            onChange({
              ...about,
              satisfaction: { ...about.satisfaction, label },
            })
          }
        />
        <Field
          label="Microcopy"
          value={about.satisfaction.microcopy}
          onChange={(microcopy) =>
            onChange({
              ...about,
              satisfaction: { ...about.satisfaction, microcopy },
            })
          }
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Título diferencial"
          value={about.differentiator.title}
          onChange={(title) =>
            onChange({
              ...about,
              differentiator: { ...about.differentiator, title },
            })
          }
        />
        <Field
          label="CTA título"
          value={about.cta.title}
          onChange={(title) =>
            onChange({ ...about, cta: { ...about.cta, title } })
          }
        />
      </div>
      <TextArea
        label="Descrição diferencial"
        value={about.differentiator.description}
        onChange={(description) =>
          onChange({
            ...about,
            differentiator: { ...about.differentiator, description },
          })
        }
      />
      <TextArea
        label="Descrição CTA"
        value={about.cta.description}
        onChange={(description) =>
          onChange({ ...about, cta: { ...about.cta, description } })
        }
      />
      <EditableList
        label="Diferenciais"
        values={about.differentiator.items.map((item) => item.label)}
        onChange={(labels) =>
          onChange({
            ...about,
            differentiator: {
              ...about.differentiator,
              items: labels.map((label, index) => ({
                ...(about.differentiator.items[index] || {
                  icon: 'check-circle',
                  active: true,
                }),
                label,
              })),
            },
          })
        }
      />
    </SectionShell>
  );
}

function ServicesForm({
  services,
  onChange,
}: {
  services: PortfolioServicesContent;
  onChange: (services: PortfolioServicesContent) => void;
}) {
  return (
    <SectionShell
      title="Serviços"
      description="Título, cards, preços, features, garantias, CTAs e ordem."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Título prefixo"
          value={services.titlePrefix}
          onChange={(titlePrefix) => onChange({ ...services, titlePrefix })}
        />
        <Field
          label="Título destaque"
          value={services.titleHighlight}
          onChange={(titleHighlight) =>
            onChange({ ...services, titleHighlight })
          }
        />
      </div>
      <TextArea
        label="Subtítulo"
        value={services.subtitle}
        onChange={(subtitle) => onChange({ ...services, subtitle })}
      />
      <ServiceEditor
        services={services.services}
        onChange={(items) => onChange({ ...services, services: items })}
      />
      <div className="rounded-xl border border-[#2f2f35] bg-black/20 p-4">
        <h4 className="mb-4 text-sm font-medium text-[#f2f2f3]">CTA final</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Título"
            value={services.finalCta.title}
            onChange={(title) =>
              onChange({
                ...services,
                finalCta: { ...services.finalCta, title },
              })
            }
          />
          <Field
            label="Botão"
            value={services.finalCta.label}
            onChange={(label) =>
              onChange({
                ...services,
                finalCta: { ...services.finalCta, label },
              })
            }
          />
        </div>
        <div className="mt-4 grid gap-4">
          <TextArea
            label="Descrição"
            value={services.finalCta.description}
            onChange={(description) =>
              onChange({
                ...services,
                finalCta: { ...services.finalCta, description },
              })
            }
          />
          <Field
            label="Microcopy"
            value={services.finalCta.microcopy}
            onChange={(microcopy) =>
              onChange({
                ...services,
                finalCta: { ...services.finalCta, microcopy },
              })
            }
          />
        </div>
      </div>
    </SectionShell>
  );
}

function ProcessForm({
  process,
  onChange,
}: {
  process: PortfolioProcessContent;
  onChange: (process: PortfolioProcessContent) => void;
}) {
  return (
    <SectionShell
      title="Processo"
      description="Cabeçalho, etapas, detalhes, imagens, duração e CTA final."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Badge"
          value={process.badge}
          onChange={(badge) => onChange({ ...process, badge })}
        />
        <Field
          label="Título prefixo"
          value={process.titlePrefix}
          onChange={(titlePrefix) => onChange({ ...process, titlePrefix })}
        />
        <Field
          label="Título destaque"
          value={process.titleHighlight}
          onChange={(titleHighlight) =>
            onChange({ ...process, titleHighlight })
          }
        />
        <Field
          label="Título sufixo"
          value={process.titleSuffix}
          onChange={(titleSuffix) => onChange({ ...process, titleSuffix })}
        />
      </div>
      <TextArea
        label="Subtítulo"
        value={process.subtitle}
        onChange={(subtitle) => onChange({ ...process, subtitle })}
      />
      <Field
        label="Label detalhes"
        value={process.includedLabel}
        onChange={(includedLabel) => onChange({ ...process, includedLabel })}
      />
      <ProcessStepEditor
        steps={process.steps}
        onChange={(steps) => onChange({ ...process, steps })}
      />
      <div className="rounded-xl border border-[#2f2f35] bg-black/20 p-4">
        <h4 className="mb-4 text-sm font-medium text-[#f2f2f3]">CTA final</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Título"
            value={process.finalCta.title}
            onChange={(title) =>
              onChange({ ...process, finalCta: { ...process.finalCta, title } })
            }
          />
          <Field
            label="Botão"
            value={process.finalCta.label}
            onChange={(label) =>
              onChange({ ...process, finalCta: { ...process.finalCta, label } })
            }
          />
        </div>
        <div className="mt-4">
          <TextArea
            label="Descrição"
            value={process.finalCta.description}
            onChange={(description) =>
              onChange({
                ...process,
                finalCta: { ...process.finalCta, description },
              })
            }
          />
        </div>
      </div>
    </SectionShell>
  );
}

function ContactSectionForm({
  contact,
  onChange,
}: {
  contact: PortfolioContactContent;
  onChange: (contact: PortfolioContactContent) => void;
}) {
  return (
    <SectionShell
      title="Contato final"
      description="Textos finais, botões e microcopy de confiança."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Título prefixo"
          value={contact.titlePrefix}
          onChange={(titlePrefix) => onChange({ ...contact, titlePrefix })}
        />
        <Field
          label="Título destaque"
          value={contact.titleHighlight}
          onChange={(titleHighlight) =>
            onChange({ ...contact, titleHighlight })
          }
        />
        <Field
          label="Subtítulo prefixo"
          value={contact.subtitlePrefix}
          onChange={(subtitlePrefix) =>
            onChange({ ...contact, subtitlePrefix })
          }
        />
        <Field
          label="Subtítulo destaque"
          value={contact.subtitleHighlight}
          onChange={(subtitleHighlight) =>
            onChange({ ...contact, subtitleHighlight })
          }
        />
      </div>
      <TextArea
        label="Subtítulo sufixo"
        value={contact.subtitleSuffix}
        onChange={(subtitleSuffix) => onChange({ ...contact, subtitleSuffix })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Botão WhatsApp"
          value={contact.primaryCtaLabel}
          onChange={(primaryCtaLabel) =>
            onChange({ ...contact, primaryCtaLabel })
          }
        />
        <Field
          label="Separador"
          value={contact.separatorLabel}
          onChange={(separatorLabel) =>
            onChange({ ...contact, separatorLabel })
          }
        />
        <Field
          label="Email"
          value={contact.emailLabel}
          onChange={(emailLabel) => onChange({ ...contact, emailLabel })}
        />
        <Field
          label="Email copiado"
          value={contact.copiedEmailLabel}
          onChange={(copiedEmailLabel) =>
            onChange({ ...contact, copiedEmailLabel })
          }
        />
        <Field
          label="Telefone"
          value={contact.phoneLabel}
          onChange={(phoneLabel) => onChange({ ...contact, phoneLabel })}
        />
        <Field
          label="Microcopy"
          value={contact.trustMicrocopy}
          onChange={(trustMicrocopy) =>
            onChange({ ...contact, trustMicrocopy })
          }
        />
      </div>
    </SectionShell>
  );
}
