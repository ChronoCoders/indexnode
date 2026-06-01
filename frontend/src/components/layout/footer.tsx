import Link from "next/link";
import NewsletterForm from "@/components/layout/newsletter-form";

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path d="M18.244 2H21l-6.52 7.45L22 22h-6.79l-4.73-6.18L4.97 22H2.21l6.97-7.97L2 2h6.91l4.28 5.66L18.244 2Zm-1.19 18h1.88L7.05 4H5.05l11.999 16Z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.69-3.87-1.54-3.87-1.54-.52-1.32-1.28-1.67-1.28-1.67-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.07.78 2.16 0 1.56-.01 2.81-.01 3.19 0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

interface FooterLink {
  href: string;
  label: string;
  external?: boolean;
}

interface FooterSection {
  title: string;
  links: FooterLink[];
}

const sections: FooterSection[] = [
  {
    title: "Product",
    links: [
      { href: "/features#indexing", label: "Blockchain Indexing" },
      { href: "/features#ipfs", label: "IPFS Storage" },
      { href: "/features#proof", label: "On-Chain Proof" },
      { href: "/features#ai", label: "AI Extraction" },
      { href: "/features#marketplace", label: "Data Marketplace" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/blog", label: "Blog" },
      { href: "/docs", label: "Docs" },
      {
        href: "https://github.com/ChronoCoders/indexnode",
        label: "GitHub",
        external: true,
      },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/disclaimer", label: "Disclaimer" },
    ],
  },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  return (
    <li>
      <Link
        href={link.href}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
        className="text-sm text-gray-500 transition-colors hover:text-gray-100"
      >
        {link.label}
      </Link>
    </li>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link href="/" className="text-lg font-bold tracking-tight">
              <span className="text-gray-100">Index</span>
              <span className="text-amber-500">Node</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-gray-500">
              The only blockchain indexing platform that cryptographically
              proves what it stores.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Link
                href="https://x.com/indexnode"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="IndexNode on X"
                className="text-gray-500 transition-colors hover:text-gray-100"
              >
                <XIcon className="h-4 w-4" />
              </Link>
              <Link
                href="https://github.com/ChronoCoders/indexnode"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="IndexNode on GitHub"
                className="text-gray-500 transition-colors hover:text-gray-100"
              >
                <GithubIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <FooterLinkItem key={link.href} link={link} />
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-md">
          <NewsletterForm />
        </div>

        <div className="mt-12 border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-500">
            &copy; 2026 Distributed Systems Labs, LLC. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
