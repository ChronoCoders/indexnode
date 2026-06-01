import { UserCircle } from "lucide-react";

export interface Profile {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function roleClass(role: string): string {
  if (role === "admin")
    return "bg-red-500/10 text-red-300 border-red-500/30";
  if (role === "premium")
    return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  return "bg-gray-800 text-gray-300 border-gray-700";
}

export default function ProfileCard({ profile }: { profile: Profile | null }) {
  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900">
      <header className="flex items-center gap-3 border-b border-gray-800 px-5 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <UserCircle className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-gray-100">Profile</h2>
          <p className="text-xs text-gray-500">Your account identity</p>
        </div>
      </header>

      <div className="px-5 py-5">
        {profile === null ? (
          <p className="text-sm text-gray-400">
            Couldn&apos;t load profile. Try refreshing.
          </p>
        ) : (
          <dl className="grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Email
              </dt>
              <dd className="mt-1 break-all text-sm text-gray-100">
                {profile.email}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Role
              </dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${roleClass(profile.role)}`}
                >
                  {profile.role}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Member since
              </dt>
              <dd className="mt-1 text-sm text-gray-100">
                {formatDate(profile.createdAt)}
              </dd>
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
