"use client";

import * as React from "react";
import { AlertCircle, Copy, Key, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface CreatedKey {
  id: string;
  key: string;
  name: string;
  key_prefix: string;
  created_at: string;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "—";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ApiKeysCard({
  initialKeys,
}: {
  initialKeys: ApiKey[] | null;
}) {
  const [keys, setKeys] = React.useState<ApiKey[]>(initialKeys ?? []);
  const [loadFailed] = React.useState(initialKeys === null);
  const [creating, setCreating] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [newKey, setNewKey] = React.useState<CreatedKey | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (creating) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("Name is required.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await apiFetch("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        throw new Error(`Failed to create key (${res.status})`);
      }
      const created = (await res.json()) as CreatedKey;
      setNewKey(created);
      setKeys((prev) => [
        {
          id: created.id,
          name: created.name,
          key_prefix: created.key_prefix,
          last_used_at: null,
          created_at: created.created_at,
          expires_at: null,
        },
        ...prev,
      ]);
      setName("");
      setShowForm(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create key.";
      setError(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: string) {
    if (revokingId) return;
    const ok = window.confirm(
      "Revoke this API key? Requests using it will start failing immediately.",
    );
    if (!ok) return;
    setRevokingId(id);
    try {
      const res = await apiFetch(`/api/v1/api-keys/${id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error(`Failed to revoke (${res.status})`);
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to revoke key.";
      setError(message);
    } finally {
      setRevokingId(null);
    }
  }

  async function copyKey() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey.key);
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
            <Key className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-gray-100">API keys</h2>
            <p className="text-xs text-gray-500">
              Use these as <code className="text-gray-400">Bearer</code> tokens
              against the REST API
            </p>
          </div>
        </div>
        {!showForm && !newKey ? (
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setError(null);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-gray-950 transition hover:bg-amber-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Create API key
          </button>
        ) : null}
      </header>

      <div className="space-y-4 px-5 py-5">
        {loadFailed ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-300">
            Couldn&apos;t load existing keys.
          </div>
        ) : null}

        {error ? (
          <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-xs text-red-300">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {newKey ? (
          <div className="space-y-3 rounded-md border border-green-500/30 bg-green-500/5 px-4 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-green-400">
                Key created — copy it now
              </p>
              <p className="mt-1 text-xs text-gray-400">
                This key will not be shown again. Store it somewhere safe.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-gray-800 bg-gray-950 px-3 py-2">
              <code className="flex-1 break-all font-mono text-xs text-gray-100">
                {newKey.key}
              </code>
              <button
                type="button"
                onClick={copyKey}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-800 px-2 py-1 text-[11px] text-gray-200 transition hover:border-gray-700 hover:bg-gray-900"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setNewKey(null)}
              className="text-xs text-gray-400 transition hover:text-gray-200"
            >
              I&apos;ve saved it — dismiss
            </button>
          </div>
        ) : null}

        {showForm ? (
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-3 rounded-md border border-gray-800 bg-gray-950/40 px-4 py-4 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="api-key-name"
                className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400"
              >
                Name
              </label>
              <input
                id="api-key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={64}
                placeholder="e.g. production-server"
                className="mt-2 h-9 w-full rounded-md border border-gray-800 bg-gray-900 px-3 text-sm text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setName("");
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

        {keys.length === 0 ? (
          <p className="text-sm text-gray-400">
            No API keys yet. Create one to authenticate non-browser clients.
          </p>
        ) : (
          <ul className="divide-y divide-gray-800 overflow-hidden rounded-md border border-gray-800">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-100">{k.name}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-gray-500">
                    {k.key_prefix}…
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Created {relativeTime(k.created_at)} · Last used{" "}
                    {relativeTime(k.last_used_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleRevoke(k.id);
                  }}
                  disabled={revokingId === k.id}
                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-red-500/30 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 sm:self-center"
                >
                  <Trash2 className="h-3 w-3" />
                  {revokingId === k.id ? "Revoking…" : "Revoke"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
