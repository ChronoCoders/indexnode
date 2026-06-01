"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
    return () => clearTimeout(id);
  }, [done]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setTokenInvalid(true);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, new_password: password }),
      });

      if (res.ok) {
        setDone(true);
      } else if (res.status === 422) {
        setTokenInvalid(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || tokenInvalid) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl text-center">
        <Link href="/" className="inline-block text-lg font-bold tracking-tight">
          <span className="text-gray-100">Index</span>
          <span className="text-amber-500">Node</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-gray-100">
          Invalid or expired link
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Your password reset link is no longer valid. Request a fresh one and
          try again.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-amber-600 px-4 text-sm font-medium text-white transition hover:bg-amber-700"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block text-lg font-bold tracking-tight">
          <span className="text-gray-100">Index</span>
          <span className="text-amber-500">Node</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-gray-100">
          Choose a new password
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Pick something you haven&apos;t used before.
        </p>
      </div>

      {done ? (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          Password updated. Redirecting you to sign in…
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div>
            <label
              htmlFor="reset-password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              New password
            </label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-2"
            />
          </div>

          <div className="mt-4">
            <label
              htmlFor="reset-confirm"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Confirm new password
            </label>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              className="mt-2"
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={submitting}
            className="mt-6 h-11 w-full text-sm"
          >
            {submitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}
