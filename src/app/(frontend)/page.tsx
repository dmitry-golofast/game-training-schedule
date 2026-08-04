import { getPayloadClient, getCurrentUser } from '@/lib/payload'
import {
  AdvantagesSection,
  AiAssistantSection,
  AudienceSection,
  ExtraFeaturesSection,
  FaqSection,
  FeaturesSection,
  FinalCtaSection,
  GamificationSection,
  Hero,
  HowItWorksSection,
  LandingFooter,
  LandingNav,
  ParentControlSection,
  PricingSection,
  ProblemsSection,
  TestimonialsSection,
  TrainerDashboardSection,
} from '@/components/landing/landing-sections'

import './landing.css'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Block = any

function getBgUrl(bg: unknown): string | null {
  if (!bg || typeof bg === 'string') return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (bg as any).url ?? null
}

function renderBlock(block: Block) {
  switch (block.blockType) {
    case 'hero':
      return (
        <Hero
          hero={{
            heading: block.heading,
            subheading: block.subheading,
            ctaText: block.ctaText,
            ctaTextSecondary: block.ctaTextSecondary,
          }}
          backgroundImageUrl={getBgUrl(block.backgroundImage)}
        />
      )
    case 'audience':
      return <AudienceSection items={block.cards} />
    case 'problems':
      return <ProblemsSection problems={{ heading: block.heading, items: block.items }} />
    case 'features':
      return <FeaturesSection items={block.cards} />
    case 'gamification':
      return (
        <GamificationSection
          data={{ heading: block.heading, subtitle: block.subheading, stats: block.stats }}
        />
      )
    case 'parentControl':
      return <ParentControlSection data={{ heading: block.heading, items: block.items }} />
    case 'trainerDashboard':
      return (
        <TrainerDashboardSection
          data={{ heading: block.heading, subtitle: block.subheading, cards: block.dashboardCards }}
        />
      )
    case 'aiAssistant':
      return <AiAssistantSection data={{ heading: block.heading, items: block.items }} />
    case 'extraFeatures':
      return <ExtraFeaturesSection items={block.cards} />
    case 'howItWorks':
      return <HowItWorksSection data={{ heading: block.heading, steps: block.steps }} />
    case 'advantages':
      return <AdvantagesSection items={block.advantages} />
    case 'testimonials':
      return <TestimonialsSection items={block.testimonials} />
    case 'pricing':
      return <PricingSection items={block.pricing} />
    case 'faq':
      return <FaqSection items={block.faq} />
    case 'finalCta':
      return (
        <FinalCtaSection
          data={{
            heading: block.heading,
            subheading: block.subheading,
            ctaText: block.ctaText,
            ctaTextSecondary: block.ctaTextSecondary,
          }}
        />
      )
    default:
      return null
  }
}

export default async function HomePage() {
  await getCurrentUser()

  let blocks: Block[] = []
  try {
    const payload = await getPayloadClient()
    // Find the active landing page.
    const pageResult = await payload.find({
      collection: 'landing-pages',
      where: { isActive: { equals: true } },
      limit: 1,
      depth: 3,
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = pageResult.docs[0] as any
    if (page?.blocks?.length) {
      // Each entry in page.blocks has a populated `block` relationship.
      blocks = page.blocks
        .map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (entry: any) => entry.block,
        )
        .filter(Boolean)
    }
  } catch {
    // DB unavailable — render fallback.
  }

  return (
    <div className="landing-page flex min-h-svh flex-col">
      <LandingNav />
      <main className="flex-1">
        {blocks.length === 0 ? (
          <div className="flex min-h-svh items-center justify-center px-4 text-center">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">eventFit</h1>
              <p className="text-muted-landing mt-4 text-lg">Sistema upravleniya trenirovkami</p>
              <a
                href="/register"
                className="mt-8 inline-block rounded-xl px-8 py-3.5 text-base font-semibold text-white"
                style={{ backgroundColor: 'var(--landing-accent)' }}
              >
                Nachat besplatno
              </a>
            </div>
          </div>
        ) : (
          blocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)
        )}
      </main>
      <LandingFooter />
    </div>
  )
}
