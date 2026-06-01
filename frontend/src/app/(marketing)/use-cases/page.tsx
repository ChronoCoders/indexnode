import UseCasesHero from "@/components/marketing/use-cases-hero";
import UseCasesDeepDives from "@/components/marketing/use-cases-deep-dives";
import UseCasesIndustries from "@/components/marketing/use-cases-industries";
import FinalCta from "@/components/marketing/final-cta";

export const metadata = {
  title: "Use cases",
  description:
    "DeFi protocols, compliance teams, NFT platforms, data providers — see how IndexNode delivers provable blockchain data for teams where data integrity is the product.",
};

export default function UseCasesPage() {
  return (
    <>
      <UseCasesHero />
      <UseCasesDeepDives />
      <UseCasesIndustries />
      <FinalCta />
    </>
  );
}
