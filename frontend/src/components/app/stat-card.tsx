import * as React from "react";

type Tone = "blue" | "amber" | "green" | "purple";

interface StatCardProps {
  label: string;
  value: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  sub?: string;
}

const toneClasses: Record<Tone, { value: string; tile: string }> = {
  blue: {
    value: "text-blue-400",
    tile: "bg-blue-500/10 text-blue-400",
  },
  amber: {
    value: "text-amber-400",
    tile: "bg-amber-500/10 text-amber-400",
  },
  green: {
    value: "text-green-400",
    tile: "bg-green-500/10 text-green-400",
  },
  purple: {
    value: "text-purple-400",
    tile: "bg-purple-500/10 text-purple-400",
  },
};

export default function StatCard({
  label,
  value,
  tone,
  icon: Icon,
  sub,
}: StatCardProps) {
  const tones = toneClasses[tone];
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className={`mt-3 text-3xl font-bold ${tones.value}`}>{value}</p>
          {sub ? <p className="mt-1 text-xs text-gray-500">{sub}</p> : null}
        </div>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-md ${tones.tile}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </div>
  );
}
