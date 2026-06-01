"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Boxes,
  Building2,
  ChevronDown,
  Coins,
  FileCheck2,
  Gem,
  Globe,
  HardDrive,
  Key,
  Layers,
  Menu,
  ShieldCheck,
  Sparkles,
  Store,
  Terminal,
  X,
} from "lucide-react";
import MegaMenu, { type MegaMenuItem } from "./mega-menu";

const featuresItems: MegaMenuItem[] = [
  {
    title: "Blockchain Indexing",
    description: "Subscribe to EVM contract events.",
    href: "/features#indexing",
    icon: Boxes,
  },
  {
    title: "IPFS Storage",
    description: "Content-addressed storage for indexed data.",
    href: "/features#ipfs",
    icon: HardDrive,
  },
  {
    title: "On-Chain Proof",
    description: "Merkle root committed per event batch.",
    href: "/features#proof",
    icon: ShieldCheck,
  },
  {
    title: "AI Extraction",
    description: "Structured data from raw events.",
    href: "/features#ai",
    icon: Sparkles,
  },
  {
    title: "Data Marketplace",
    description: "Buy and sell verified datasets.",
    href: "/features#marketplace",
    icon: Store,
  },
];

const useCasesItems: MegaMenuItem[] = [
  {
    title: "DeFi Protocols",
    description: "Audit-ready event history.",
    href: "/use-cases#defi",
    icon: Coins,
  },
  {
    title: "Compliance Teams",
    description: "Verifiable regulatory reporting.",
    href: "/use-cases#compliance",
    icon: FileCheck2,
  },
  {
    title: "NFT Platforms",
    description: "Provenance for digital assets.",
    href: "/use-cases#nft",
    icon: Gem,
  },
  {
    title: "Data Providers",
    description: "Monetize indexed datasets.",
    href: "/use-cases#data-providers",
    icon: Layers,
  },
  {
    title: "Enterprise",
    description: "Custom pipelines and SLAs.",
    href: "/use-cases#enterprise",
    icon: Building2,
  },
];

const docsItems: MegaMenuItem[] = [
  {
    title: "Authentication",
    description: "Cookie + Bearer API keys.",
    href: "/docs#authentication",
    icon: Key,
  },
  {
    title: "Indexing jobs",
    description: "Create your first job.",
    href: "/docs#jobs",
    icon: Boxes,
  },
  {
    title: "GraphQL API",
    description: "Queries, mutations, subscriptions.",
    href: "/docs#graphql",
    icon: Terminal,
  },
  {
    title: "REST API",
    description: "All 16 endpoints.",
    href: "/docs#rest",
    icon: Globe,
  },
  {
    title: "Verify a proof",
    description: "Independently verify any event.",
    href: "/docs#verify",
    icon: ShieldCheck,
  },
];

const flatLinks = [
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

function Logo() {
  return (
    <Link href="/" className="text-lg font-bold tracking-tight">
      <span className="text-gray-100">Index</span>
      <span className="text-amber-500">Node</span>
    </Link>
  );
}

interface NavDropdownProps {
  label: string;
  items: MegaMenuItem[];
}

function NavDropdown({ label, items }: NavDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = React.useCallback(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = React.useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 100);
  }, [cancelClose]);

  React.useEffect(() => () => cancelClose(), [cancelClose]);

  return (
    <div
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onFocus={() => {
          cancelClose();
          setOpen(true);
        }}
        onBlur={scheduleClose}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm transition ${
          open ? "text-amber-400" : "text-gray-300 hover:text-amber-400"
        }`}
      >
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open ? (
          <MegaMenu
            items={items}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            onItemClick={() => setOpen(false)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navBackground = scrolled
    ? "bg-gray-950/95 backdrop-blur-sm border-b border-gray-800"
    : "bg-transparent";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${navBackground}`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          <NavDropdown label="Features" items={featuresItems} />
          <NavDropdown label="Use cases" items={useCasesItems} />
          <NavDropdown label="Docs" items={docsItems} />
          {flatLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-gray-300 transition hover:text-amber-400"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-4 py-2 text-sm text-gray-300 transition hover:text-amber-400"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700"
          >
            Get Started
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden rounded-md p-2 text-gray-300 transition hover:text-amber-400"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="border-b border-gray-800 bg-gray-950 md:hidden"
          >
            <div className="mx-auto max-w-7xl space-y-4 px-6 py-6">
              <MobileSection title="Features" items={featuresItems} />
              <MobileSection title="Use cases" items={useCasesItems} />
              <MobileSection title="Docs" items={docsItems} />
              <div className="border-t border-gray-800 pt-4">
                {flatLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 text-base text-gray-200 hover:text-amber-400"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              <div className="flex flex-col gap-2 border-t border-gray-800 pt-4">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md border border-gray-700 px-4 py-2 text-center text-sm text-gray-200 transition hover:border-amber-500 hover:text-amber-400"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white transition hover:bg-amber-700"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

function MobileSection({
  title,
  items,
}: {
  title: string;
  items: MegaMenuItem[];
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block py-2 text-sm text-gray-300 hover:text-amber-400"
            >
              {item.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
