import FeaturesHero from "@/components/marketing/features-hero";
import FeaturesDeepDives from "@/components/marketing/features-deep-dives";
import CreditSystem from "@/components/marketing/credit-system";
import FinalCta from "@/components/marketing/final-cta";
import TrustPipeline from "@/components/marketing/visuals/trust-pipeline";

export const metadata = {
  title: "Features",
  description:
    "Real-time event indexing, on-chain proof, IPFS storage, AI extraction, and a data marketplace — every feature in IndexNode is built around verifiable blockchain data.",
};

export default function FeaturesPage() {
  return (
    <>
      <FeaturesHero />
      <section className="border-y border-gray-800 bg-gray-900/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
              How IndexNode works
            </h2>
            <p className="mt-3 text-gray-400">
              The pipeline every event flows through, end to end.
            </p>
          </div>
          <div className="mt-12">
            <TrustPipeline />
          </div>
        </div>
      </section>
      <FeaturesDeepDives />
      <CreditSystem />
      <FinalCta />
    </>
  );
}
