"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  LayoutDashboard,
  LogOut,
  User,
  Zap,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/events", label: "Events", icon: Zap },
  { href: "/account", label: "Account", icon: User },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

async function logout(): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
  }
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("user_id");
    window.location.href = "/login";
  }
}

export interface SidebarProps {
  creditBalance: number | null;
}

export default function Sidebar({ creditBalance }: SidebarProps) {
  const pathname = usePathname();
  const balanceDisplay =
    creditBalance === null ? "—" : `${creditBalance.toLocaleString()} INC`;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-800 bg-gray-950 md:flex">
        <div className="flex h-16 items-center border-b border-gray-800 px-6">
          <Link href="/" className="text-lg font-bold tracking-tight">
            <span className="text-gray-100">Index</span>
            <span className="text-amber-500">Node</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-gray-400 hover:bg-gray-900 hover:text-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-4">
          <div className="rounded-md border border-gray-800 bg-gray-900/60 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              Credit balance
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-amber-400">
              {balanceDisplay}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void logout();
            }}
            className="mt-3 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-400 transition hover:bg-gray-900 hover:text-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-gray-800 bg-gray-950 md:hidden"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] transition ${
                active ? "text-amber-400" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
