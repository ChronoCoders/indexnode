"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Plus, X } from "lucide-react";
import { gql } from "@/lib/api";

const CREATE_JOB_MUTATION = `mutation CreateJob($input: CreateBlockchainJobInput!) {
  createBlockchainJob(input: $input) {
    id
    status
  }
}`;

interface CreateJobInput {
  chain: string;
  contractAddress: string;
  events: string[];
  fromBlock: number;
}

interface CreateJobResponse {
  createBlockchainJob: { id: string; status: string };
}

export default function NewJobButton() {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting]);

  function closePanel() {
    if (submitting) return;
    setOpen(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);
    const contractAddress = String(data.get("contract") ?? "").trim();
    const chain = String(data.get("chain") ?? "ethereum");
    const eventsRaw = String(data.get("events") ?? "");
    const fromBlockRaw = String(data.get("fromBlock") ?? "").trim();

    const events = eventsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const fromBlock = fromBlockRaw === "" ? 0 : Number(fromBlockRaw);
    if (Number.isNaN(fromBlock) || fromBlock < 0) {
      setError("From block must be a non-negative number.");
      return;
    }

    const input: CreateJobInput = {
      chain,
      contractAddress,
      events,
      fromBlock,
    };

    setSubmitting(true);
    try {
      await gql<CreateJobResponse>(CREATE_JOB_MUTATION, { input });
      setOpen(false);
      window.location.reload();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create job.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-amber-400"
      >
        <Plus className="h-4 w-4" />
        New job
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closePanel}
              className="fixed inset-0 z-40 bg-gray-950/70 backdrop-blur-sm"
            />
            <motion.aside
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
              role="dialog"
              aria-modal="true"
              aria-label="Create new job"
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-800 bg-gray-950"
            >
              <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-100">
                    New blockchain index job
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Costs 50 INC. Deducted on submit.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePanel}
                  disabled={submitting}
                  aria-label="Close"
                  className="rounded-md p-1 text-gray-400 transition hover:bg-gray-900 hover:text-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form
                className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6"
                onSubmit={handleSubmit}
              >
                {error ? (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-300"
                  >
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div>
                  <label
                    htmlFor="job-contract"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    Contract address
                  </label>
                  <input
                    id="job-contract"
                    name="contract"
                    type="text"
                    required
                    placeholder="0x6b17…1d0f"
                    className="mt-2 h-10 w-full rounded-md border border-gray-800 bg-gray-900 px-3 font-mono text-sm text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="job-chain"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    Chain
                  </label>
                  <select
                    id="job-chain"
                    name="chain"
                    defaultValue="ethereum"
                    className="mt-2 h-10 w-full rounded-md border border-gray-800 bg-gray-900 px-3 text-sm text-gray-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="polygon">Polygon</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="job-events"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    Event signatures
                  </label>
                  <textarea
                    id="job-events"
                    name="events"
                    rows={3}
                    placeholder="Transfer(address,address,uint256)"
                    className="mt-2 w-full rounded-md border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-xs text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">
                    One signature per line. Leave empty to index every event.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="job-from-block"
                    className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
                  >
                    From block
                  </label>
                  <input
                    id="job-from-block"
                    name="fromBlock"
                    type="number"
                    placeholder="0"
                    min={0}
                    className="mt-2 h-10 w-full rounded-md border border-gray-800 bg-gray-900 px-3 font-mono text-sm text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="mt-auto flex flex-col gap-3 border-t border-gray-800 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closePanel}
                    disabled={submitting}
                    className="rounded-md border border-gray-800 px-4 py-2 text-sm text-gray-200 transition hover:border-gray-700 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Starting…" : "Start indexing · 50 INC"}
                  </button>
                </div>
              </form>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
