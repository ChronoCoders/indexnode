import DocsHero from "@/components/marketing/docs-hero";
import DocsQuickstart from "@/components/marketing/docs-quickstart";
import DocsContent from "@/components/marketing/docs-content";
import ArchitectureDiagram from "@/components/marketing/visuals/architecture-diagram";

export const metadata = {
  title: "Documentation",
  description:
    "IndexNode developer documentation — architecture, authentication, indexing jobs, GraphQL queries and subscriptions, REST API reference, on-chain proof verification, and credit pricing.",
};

export default function DocsPage() {
  return (
    <>
      <DocsHero />

      <section
        id="architecture"
        className="scroll-mt-24 border-y border-gray-800 bg-gray-900/40 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
              Architecture
            </p>
            <div
              aria-hidden="true"
              className="mx-auto mt-3 h-0.5 w-12 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0"
            />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-100 sm:text-4xl">
              How a request flows through IndexNode
            </h2>
            <p className="mt-3 text-gray-400">
              A single Rust binary handles every request. The HTTP server and
              the job worker run as concurrent components of the same process
              and share a Postgres connection pool.
            </p>
          </div>
          <ArchitectureDiagram />
        </div>
      </section>

      <DocsQuickstart />
      <DocsContent />
    </>
  );
}
