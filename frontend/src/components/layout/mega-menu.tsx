"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export interface MegaMenuItem {
  title: string;
  description?: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface MegaMenuProps {
  items: MegaMenuItem[];
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onItemClick?: () => void;
}

export default function MegaMenu({
  items,
  onMouseEnter,
  onMouseLeave,
  onItemClick,
}: MegaMenuProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="menu"
      className="absolute left-0 top-full z-50 mt-2 w-72 max-w-sm rounded-xl border border-gray-800 bg-gray-900 p-2 shadow-xl"
    >
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onItemClick}
                role="menuitem"
                className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-gray-800/70"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-gray-100 group-hover:text-amber-400">
                    {item.title}
                  </span>
                  {item.description ? (
                    <span className="mt-0.5 block text-xs text-gray-500">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
