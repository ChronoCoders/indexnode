import Hero from "@/components/marketing/hero";
import StatsBar from "@/components/marketing/stats-bar";
import ProblemSection from "@/components/marketing/problem-section";
import SolutionFeatures from "@/components/marketing/solution-features";
import TrustPipeline from "@/components/marketing/visuals/trust-pipeline";
import UseCases from "@/components/marketing/use-cases";
import MarketplaceTeaser from "@/components/marketing/marketplace-teaser";
import FinalCta from "@/components/marketing/final-cta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <ProblemSection />
      <SolutionFeatures />
      <section className="border-y border-gray-800 bg-gray-900/40 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">

          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
              The pipeline
            </p>
            <div
              aria-hidden="true"
              className="mx-auto mt-3 h-0.5 w-12 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0"
            />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
              From event to proof in seconds.
            </h2>
            <p className="mt-3 text-gray-400">
              Six steps. Every one of them happens automatically.
            </p>
          </div>
          <div className="mt-16">
            <TrustPipeline />
          </div>
        </div>
      </section>
      <UseCases />
      <MarketplaceTeaser />
      <FinalCta />
    </>
  );
}
