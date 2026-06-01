import { Check } from "lucide-react";

export interface OutcomesCardProps {
  eyebrow?: string;
  items: string[];
}

export default function OutcomesCard({ eyebrow, items }: OutcomesCardProps) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {eyebrow}
        </p>
      ) : null}
      <ul className={`space-y-3 ${eyebrow ? "mt-4" : ""}`}>
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-3 text-sm text-gray-300"
          >
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <Check className="h-3 w-3" />
            </span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
