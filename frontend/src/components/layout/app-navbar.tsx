import Link from "next/link";

export function AppNavbar() {
  return (
    <header className="fixed top-0 z-40 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          IndexNode
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-gray-400 transition hover:text-amber-400"
          >
            Dashboard
          </Link>
          <Link
            href="/account"
            className="text-sm text-gray-400 transition hover:text-amber-400"
          >
            Account
          </Link>
        </nav>
      </div>
    </header>
  );
}
