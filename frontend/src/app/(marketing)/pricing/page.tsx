import PricingHero from "@/components/marketing/pricing-hero";
import PricingTiers from "@/components/marketing/pricing-tiers";
import PricingCreditPacks from "@/components/marketing/pricing-credit-packs";
import PricingComparison from "@/components/marketing/pricing-comparison";
import PricingEnterprise from "@/components/marketing/pricing-enterprise";
import PricingFaq from "@/components/marketing/pricing-faq";

export const metadata = {
  title: "Pricing",
  description:
    "Simple pricing for IndexNode. Free, Growth, and Scale plans. Every plan includes on-chain proof, IPFS storage, and AI extraction. No hidden fees.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <PricingTiers />
      <PricingCreditPacks />
      <PricingComparison />
      <PricingEnterprise />
      <PricingFaq />
    </>
  );
}
