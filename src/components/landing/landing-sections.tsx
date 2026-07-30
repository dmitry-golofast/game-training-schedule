import { CheckIcon, StarIcon } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

// ── Types ──
type TextItem = { text: string }
type IconText = { icon?: string | null; text: string }
type ArrayItem = { item: string }
type AudienceCard = {
  icon: string
  title: string
  subtitle?: string | null
  features?: ArrayItem[] | null
}
type FeatureCard = { icon: string; title: string; items?: ArrayItem[] | null }
type ExtraCard = { title: string; items?: ArrayItem[] | null }
type StatItem = { value: string; label: string }
type Testimonial = { text: string; rating?: number | null }
type PricingTier = {
  name: string
  price: string
  features?: ArrayItem[] | null
  popular?: boolean | null
}
type FaqItem = { question: string; answer: string }

type Content = {
  hero?: {
    heading?: string | null
    subheading?: string | null
    ctaText?: string | null
    ctaTextSecondary?: string | null
  } | null
  audience?: AudienceCard[] | null
  problems?: { heading?: string | null; items?: TextItem[] | null } | null
  features?: FeatureCard[] | null
  gamification?: {
    heading?: string | null
    subtitle?: string | null
    stats?: StatItem[] | null
  } | null
  parentControl?: { heading?: string | null; items?: TextItem[] | null } | null
  trainerDashboard?: {
    heading?: string | null
    subtitle?: string | null
    cards?: { label: string; id?: string | null }[] | null
  } | null
  aiAssistant?: { heading?: string | null; items?: TextItem[] | null } | null
  extraFeatures?: ExtraCard[] | null
  howItWorks?: { heading?: string | null; steps?: TextItem[] | null } | null
  advantages?: IconText[] | null
  testimonials?: Testimonial[] | null
  pricing?: PricingTier[] | null
  faq?: FaqItem[] | null
  finalCta?: {
    heading?: string | null
    subheading?: string | null
    ctaText?: string | null
    ctaTextSecondary?: string | null
  } | null
}

// ── Section wrapper ──
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`mx-auto w-full max-w-6xl px-4 py-16 ${className}`}>{children}</section>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">{children}</h2>
  )
}

// ── 1. Hero ──
export function Hero({
  hero,
  backgroundImageUrl,
}: {
  hero?: Content['hero']
  backgroundImageUrl?: string | null
}) {
  const bgStyle = backgroundImageUrl
    ? {
        backgroundImage: `linear-gradient(rgba(8,8,8,0.7), rgba(8,8,8,0.85)), url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : undefined

  return (
    <div
      className="flex min-h-svh w-full flex-col justify-center px-10 text-center sm:p-50 sm:text-start"
      style={bgStyle}
    >
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
        {hero?.heading ?? 'Slotory'}
      </h1>
      {hero?.subheading ? (
        <p className="text-muted-landing mt-6 max-w-2xl text-lg">{hero.subheading}</p>
      ) : null}
      <div className="mt-8 flex justify-center gap-4 sm:justify-start">
        <Link
          href="/register"
          className="rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--landing-accent)' }}
        >
          {hero?.ctaText ?? 'Попробовать бесплатно'}
        </Link>
        {hero?.ctaTextSecondary ? (
          <p className="text-muted-landing text-sm">{hero.ctaTextSecondary}</p>
        ) : null}
      </div>
    </div>
  )
}

// ── 2. Audience ──
export function AudienceSection({ items }: { items?: AudienceCard[] | null }) {
  if (!items?.length) return null
  return (
    <Section>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((card, i) => (
          <div key={i} className="landing-card p-6">
            <div className="mb-3 text-3xl">{card.icon}</div>
            <h3 className="text-xl font-bold">{card.title}</h3>
            {card.subtitle ? (
              <p className="text-accent-landing mt-1 text-sm font-medium">{card.subtitle}</p>
            ) : null}
            <ul className="mt-4 flex flex-col gap-2">
              {card.features?.map((f, j) => (
                <li key={j} className="text-muted-landing flex items-center gap-2 text-sm">
                  <CheckIcon
                    className="text-accent-landing size-4 shrink-0"
                    style={{ color: 'var(--landing-accent)' }}
                  />
                  {f.item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 3. Problems ──
export function ProblemsSection({ problems }: { problems?: Content['problems'] }) {
  if (!problems?.items?.length) return null
  return (
    <Section>
      {problems.heading ? <SectionTitle>{problems.heading}</SectionTitle> : null}
      <div className="mx-auto max-w-2xl space-y-4">
        {problems.items.map((item, i) => (
          <div key={i} className="landing-card flex items-center gap-3 p-4">
            <span className="text-xl text-red-500">❌</span>
            <span className="text-muted-landing">{item.text}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 4. Features (8 cards) ──
export function FeaturesSection({ items }: { items?: FeatureCard[] | null }) {
  if (!items?.length) return null
  return (
    <Section>
      <SectionTitle>Возможности Slotory</SectionTitle>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((card, i) => (
          <div key={i} className="landing-card p-5">
            <div className="mb-2 text-2xl">{card.icon}</div>
            <h3 className="font-semibold">{card.title}</h3>
            <ul className="mt-2 flex flex-col gap-1">
              {card.items?.map((item, j) => (
                <li key={j} className="text-muted-landing text-sm">
                  • {item.item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 5. Gamification ──
export function GamificationSection({ data }: { data?: Content['gamification'] }) {
  if (!data) return null
  return (
    <Section>
      {data.heading ? <SectionTitle>{data.heading}</SectionTitle> : null}
      <div className="landing-card mx-auto max-w-md p-8">
        <div className="grid grid-cols-2 gap-6 text-center">
          {data.stats?.map((stat, i) => (
            <div key={i}>
              <div className="text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-muted-landing mt-1 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      {data.subtitle ? (
        <p className="text-muted-landing mt-6 text-center">{data.subtitle}</p>
      ) : null}
    </Section>
  )
}

// ── 6. Parent Control ──
export function ParentControlSection({ data }: { data?: Content['parentControl'] }) {
  if (!data?.items?.length) return null
  return (
    <Section>
      {data.heading ? <SectionTitle>{data.heading}</SectionTitle> : null}
      <div className="mx-auto max-w-xl space-y-3">
        {data.items.map((item, i) => (
          <div key={i} className="landing-card flex items-center gap-3 p-4">
            <span
              className="text-accent-landing text-lg"
              style={{ color: 'var(--landing-accent)' }}
            >
              ✅
            </span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 7. Trainer Dashboard ──
export function TrainerDashboardSection({ data }: { data?: Content['trainerDashboard'] }) {
  if (!data?.cards?.length) return null
  return (
    <Section>
      {data.heading ? <SectionTitle>{data.heading}</SectionTitle> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.cards.map((card, i) => (
          <div key={i} className="landing-card p-5 text-center">
            <div
              className="text-accent-landing text-2xl font-bold"
              style={{ color: 'var(--landing-accent)' }}
            >
              —
            </div>
            <div className="text-muted-landing mt-1 text-sm">{card.label}</div>
          </div>
        ))}
      </div>
      {data.subtitle ? (
        <p className="text-muted-landing mt-6 text-center text-sm">{data.subtitle}</p>
      ) : null}
    </Section>
  )
}

// ── 8. AI Assistant ──
export function AiAssistantSection({ data }: { data?: Content['aiAssistant'] }) {
  if (!data?.items?.length) return null
  return (
    <Section>
      {data.heading ? <SectionTitle>{data.heading}</SectionTitle> : null}
      <div className="mx-auto max-w-2xl space-y-4">
        {data.items.map((item, i) => (
          <div key={i} className="landing-card p-4">
            {item.text}
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 9. Extra Features ──
export function ExtraFeaturesSection({ items }: { items?: ExtraCard[] | null }) {
  if (!items?.length) return null
  return (
    <Section>
      <SectionTitle>Дополнительные функции</SectionTitle>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((card, i) => (
          <div key={i} className="landing-card p-5">
            <h3 className="font-semibold">{card.title}</h3>
            <ul className="mt-2 flex flex-col gap-1">
              {card.items?.map((item, j) => (
                <li key={j} className="text-muted-landing text-sm">
                  • {item.item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 10. How It Works ──
export function HowItWorksSection({ data }: { data?: Content['howItWorks'] }) {
  if (!data?.steps?.length) return null
  return (
    <Section>
      {data.heading ? <SectionTitle>{data.heading}</SectionTitle> : null}
      <div className="mx-auto max-w-2xl space-y-6">
        {data.steps.map((step, i) => (
          <div key={i} className="flex items-center gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
              style={{ backgroundColor: 'var(--landing-accent)' }}
            >
              {i + 1}
            </div>
            <span className="text-lg">{step.text}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 11. Advantages ──
export function AdvantagesSection({ items }: { items?: IconText[] | null }) {
  if (!items?.length) return null
  return (
    <Section>
      <SectionTitle>Почему выбирают Slotory</SectionTitle>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {items.map((item, i) => (
          <div key={i} className="landing-card p-4 text-center">
            <div className="text-2xl">{item.icon}</div>
            <div className="mt-2 text-sm font-medium">{item.text}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 12. Testimonials ──
export function TestimonialsSection({ items }: { items?: Testimonial[] | null }) {
  if (!items?.length) return null
  return (
    <Section>
      <SectionTitle>Отзывы</SectionTitle>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((item, i) => (
          <div key={i} className="landing-card p-6">
            <div className="mb-2 flex gap-0.5">
              {Array.from({ length: item.rating ?? 5 }).map((_, j) => (
                <StarIcon key={j} className="size-4 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
            <p className="text-muted-landing italic">«{item.text}»</p>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 13. Pricing ──
export function PricingSection({ items }: { items?: PricingTier[] | null }) {
  if (!items?.length) return null
  return (
    <Section>
      <SectionTitle>Тарифы</SectionTitle>
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((tier, i) => (
          <div
            key={i}
            className={`landing-card relative p-6 ${tier.popular ? 'border-accent-landing' : ''}`}
            style={tier.popular ? { borderColor: 'var(--landing-accent)' } : undefined}
          >
            {tier.popular ? (
              <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              >
                Популярный
              </div>
            ) : null}
            <h3 className="text-xl font-bold">{tier.name}</h3>
            <div className="my-4 text-3xl font-bold">{tier.price}</div>
            <ul className="flex flex-col gap-2">
              {tier.features?.map((f, j) => (
                <li key={j} className="text-muted-landing flex items-center gap-2 text-sm">
                  <CheckIcon
                    className="size-4 shrink-0"
                    style={{ color: 'var(--landing-accent)' }}
                  />
                  {f.item}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="mt-6 block rounded-lg py-2.5 text-center text-sm font-semibold transition-colors"
              style={{
                backgroundColor: tier.popular ? 'var(--landing-accent)' : 'transparent',
                border: tier.popular ? 'none' : '1px solid var(--landing-border)',
                color: '#fff',
              }}
            >
              Выбрать
            </Link>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── 14. FAQ ──
export function FaqSection({ items }: { items?: FaqItem[] | null }) {
  if (!items?.length) return null
  return (
    <Section>
      <SectionTitle>Частые вопросы</SectionTitle>
      <div className="mx-auto max-w-2xl space-y-4">
        {items.map((item, i) => (
          <details key={i} className="landing-card group cursor-pointer p-4">
            <summary
              className="group-open:text-accent-landing font-medium transition-colors"
              style={{ color: undefined }}
            >
              {item.question}
            </summary>
            <p className="text-muted-landing mt-2 text-sm">{item.answer}</p>
          </details>
        ))}
      </div>
    </Section>
  )
}

// ── 15. Final CTA ──
export function FinalCtaSection({ data }: { data?: Content['finalCta'] }) {
  if (!data) return null
  return (
    <Section className="text-center">
      {data.heading ? (
        <h2 className="mx-auto mb-4 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          {data.heading}
        </h2>
      ) : null}
      {data.subheading ? (
        <p className="text-muted-landing mx-auto mb-8 max-w-xl">{data.subheading}</p>
      ) : null}
      <Link
        href="/register"
        className="inline-block rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-colors"
        style={{ backgroundColor: 'var(--landing-accent)' }}
      >
        {data.ctaText ?? 'Попробовать бесплатно'}
      </Link>
      {data.ctaTextSecondary ? (
        <p className="text-muted-landing mt-4 text-sm">{data.ctaTextSecondary}</p>
      ) : null}
    </Section>
  )
}

// ── Nav ──
export function LandingNav() {
  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        borderColor: 'var(--landing-border)',
        backgroundColor: 'rgba(8, 8, 8, 0.8)',
      }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-white">
          Slotory
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-muted-landing text-sm font-medium transition-colors hover:text-white"
          >
            Войти
          </Link>
          <Link
            href="/register"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: 'var(--landing-accent)' }}
          >
            Регистрация
          </Link>
        </nav>
      </div>
    </header>
  )
}

// ── Footer ──
export function LandingFooter() {
  return (
    <footer className="border-t" style={{ borderColor: 'var(--landing-border)' }}>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 text-center">
        <p className="text-muted-landing text-sm">
          © {new Date().getFullYear()} Slotory — система управления тренировками
        </p>
      </div>
    </footer>
  )
}
