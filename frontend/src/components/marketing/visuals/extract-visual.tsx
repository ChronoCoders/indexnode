"use client";

import { ArrowRight } from "lucide-react";

export default function ExtractVisual() {
  return (
    <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900 p-4 font-mono text-[11px] leading-relaxed text-gray-500">
        <code>
          0xa9059cbb000000000{"\n"}
          0000abcdef01234567{"\n"}
          89abcdef012345678{"\n"}
          900000000000000000{"\n"}
          0000000000000064
        </code>
      </pre>
      <div className="flex items-center justify-center">
        <ArrowRight className="h-5 w-5 text-amber-500" />
      </div>
      <pre className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900 p-4 font-mono text-xs leading-relaxed text-gray-300">
        <code>
          {"{ "}
          {"\n"}
          {"  "}
          <span className="text-amber-300">&quot;method&quot;</span>:{" "}
          <span className="text-green-400">&quot;transfer&quot;</span>,{"\n"}
          {"  "}
          <span className="text-amber-300">&quot;to&quot;</span>:{" "}
          <span className="text-green-400">&quot;0xabcd…&quot;</span>,{"\n"}
          {"  "}
          <span className="text-amber-300">&quot;amount&quot;</span>:{" "}
          <span className="text-green-400">&quot;100.0&quot;</span>
          {"\n"}
          {"}"}
        </code>
      </pre>
    </div>
  );
}
