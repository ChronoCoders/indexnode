import AboutHero from "@/components/marketing/about-hero";
import AboutStory from "@/components/marketing/about-story";
import AboutBeliefs from "@/components/marketing/about-beliefs";
import FinalCta from "@/components/marketing/final-cta";

export const metadata = {
  title: "About",
  description:
    "We built IndexNode because we needed it ourselves. Every blockchain project we worked on had the same problem — data was stored, but never provable. We decided to fix that.",
};

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutStory />
      <AboutBeliefs />
      <FinalCta />
    </>
  );
}
