"use client";

import * as React from "react";
import {
  AlertCircle,
  Copy,
  Plus,
  Trash2,
  Webhook as WebhookIcon,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

interface CreatedWebhook {
  id: string;
  url: string;
  secret: string;
  events: string[];
  created_at: string;
}

const ALLOWED_EVENTS: { value: string; label: string }[] = [
  { value: "job.completed", label: "Job completed" },
  { value: "job.failed", label: "Job failed" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function WebhooksCard({
  initialWebhooks,
}: {
  initialWebhooks: Webhook[] | null;
}) {
  const [hooks, setHooks] = React.useState<Webhook[]>(initialWebhooks ?? []);
  const [loadFailed] = React.useState(initialWebhooks === null);
  const [showForm, setShowForm] = React.useState(false);
  const [url, setUrl] = React.useState("");
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([
    "job.completed",
    "job.failed",
  ]);
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [newHook, setNewHook] = React.useState<CreatedWebhook | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  function toggleEvent(value: string) {
    setSelectedEvents((prev) =>
      prev.includes(value) ? prev.filter((e) => e !== value) : [...prev, value],
    );
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (creating) return;
    const trimmed = url.trim();
    if (trimmed.length === 0) {
      setError("URL is required.");
      return;
    }
    if (selectedEvents.length === 0) {
      setError("Select at least one event.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await apiFetch("/api/v1/webhooks", {
        method: "POST",
        body: JSON.stringify({ url: trimmed, events: selectedEvents }),
      });
      if (!res.ok) {
        throw new Error(`Failed to create webhook (${res.status})`);
      }
      const created = (await res.json()) as CreatedWebhook;
      setNewHook(created);
      setHooks((prev) => [
        {
          id: created.id,
          url: created.url,
          events: created.events,
          is_active: true,
          created_at: created.created_at,
        },
        ...prev,
      ]);
      setUrl("");
      setSelectedEvents(["job.completed", "job.failed"]);
      setShowForm(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create webhook.";
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    const ok = window.confirm("Delete this webhook subscription?");
    if (!ok) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/v1/webhooks/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Failed to delete (${res.status})`);
      }
      setHooks((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete webhook.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  async function copySecret() {
    if (!newHook) return;
    try {
      await navigator.clipboard.writeText(newHook.secret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to clipboard.");
    }
  }

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900">
      <header className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <WebhookIcon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-100">Webhooks</h2>
            <p className="text-xs text-gray-500">
              POST events to your endpoint, signed with HMAC-SHA256
            </p>
          </div>
        </div>
        {!showForm && !newHook ? (
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setError(null);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-gray-950 transition hover:bg-amber-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Add webhook
          </button>
        ) : null}
      </header>

      <div className="space-y-4 px-5 py-5">
        {loadFailed ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300">
            Couldn&apos;t load existing webhooks.
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {newHook ? (
          <div className="space-y-3 rounded-md border border-green-500/30 bg-green-500/5 px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
                Webhook created — copy the signing secret now
              </p>
              <p className="mt-1 text-xs text-gray-400">
                This secret will not be shown again. Use it to verify HMAC
                signatures on inbound webhook POSTs.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-950 px-3 py-2">
              <code className="flex-1 break-all font-mono text-xs text-gray-100">
                {newHook.secret}
              </code>
              <button
                type="button"
                onClick={copySecret}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-800 px-2 py-1 text-[11px] text-gray-200 transition hover:border-gray-700 hover:bg-gray-900"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNewHook(null)}
              className="text-xs text-gray-400 transition hover:text-gray-200"
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        ) : null}

        {showForm ? (
          <form
            onSubmit={handleCreate}
            className="space-y-4 rounded-md border border-gray-800 bg-gray-950/40 px-4 py-4"
          >
            <div>
              <label
                htmlFor="webhook-url"
                className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
              >
                URL
              </label>
              <input
                id="webhook-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://api.example.com/hooks/indexnode"
                className="mt-2 h-9 w-full rounded-md border border-gray-800 bg-gray-900 px-3 font-mono text-xs text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Events
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {ALLOWED_EVENTS.map((evt) => {
                  const checked = selectedEvents.includes(evt.value);
                  return (
                    <label
                      key={evt.value}
                      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-800 px-3 py-1.5 text-xs text-gray-200 transition hover:border-gray-700"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEvent(evt.value)}
                        className="h-3.5 w-3.5 accent-amber-500"
                      />
                      <span className="font-mono">{evt.value}</span>
                      <span className="text-gray-500">· {evt.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setUrl("");
                  setSelectedEvents(["job.completed", "job.failed"]);
                  setError(null);
                }}
                disabled={creating}
                className="rounded-md border border-gray-800 px-3 py-1.5 text-sm text-gray-200 transition hover:border-gray-700 hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        ) : null}

        {hooks.length === 0 ? (
          <p className="text-sm text-gray-400">
            No webhooks yet. Add one to receive job lifecycle events.
          </p>
        ) : (
          <ul className="divide-y divide-gray-800 overflow-hidden rounded-md border border-gray-800">
            {hooks.map((h) => (
              <li
                key={h.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p
                    className="break-all font-mono text-xs text-gray-100"
                    title={h.url}
                  >
                    {h.url}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {h.events.map((evt) => (
                      <span
                        key={evt}
                        className="rounded-full bg-gray-800 px-2 py-0.5 font-mono text-[10px] text-gray-300"
                      >
                        {evt}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-gray-500">
                    Added {formatDate(h.created_at)} ·{" "}
                    {h.is_active ? (
                      <span className="text-green-400">Active</span>
                    ) : (
                      <span className="text-gray-500">Paused</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleDelete(h.id);
                  }}
                  disabled={deletingId === h.id}
                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
                >
                  <Trash2 className="h-3 w-3" />
                  {deletingId === h.id ? "Deleting…" : "Delete"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
