"use client";

import * as React from "react";
import { animate, useInView } from "framer-motion";

interface Stat {
  label: string;
  to: number;
  suffix: string;
  accent?: boolean;
}

const stats: Stat[] = [
  { label: "Events indexed", to: 1.2, suffix: "M+", accent: true },
  { label: "IPFS objects stored", to: 847, suffix: "K+" },
  { label: "On-chain proofs", to: 98, suffix: "K+" },
  { label: "Uptime", to: 99.9, suffix: "%" },
];

function formatValue(value: number, target: number): string {
  if (target >= 100) {
    return Math.round(value).toLocaleString();
  }
  return value.toFixed(1);
}

function CountUp({
  to,
  suffix,
  accent,
}: {
  to: number;
  suffix: string;
  accent?: boolean;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [display, setDisplay] = React.useState("0");

  React.useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration: 1.6,
      ease: "easeOut",
      onUpdate: (value) => setDisplay(formatValue(value, to)),
    });
    return () => controls.stop();
  }, [inView, to]);

  return (
    <span
      ref={ref}
      className={`text-4xl font-bold tabular-nums sm:text-5xl ${
        accent ? "text-amber-500" : "text-gray-100"
      }`}
    >
      {display}
      {suffix}
    </span>
  );
}

export default function StatsBar() {
  return (
    <section className="border-b border-t border-amber-800/20 border-b-gray-800 bg-gray-900/50 shadow-[0_-1px_0_rgba(217,119,6,0.1)]">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-2 text-center">
            <CountUp to={stat.to} suffix={stat.suffix} accent={stat.accent} />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              {stat.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
