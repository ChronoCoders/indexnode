"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setDone(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block text-lg font-bold tracking-tight">
          <span className="text-gray-100">Index</span>
          <span className="text-amber-500">Node</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-gray-100">
          Reset your password
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {done ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          If that email is registered, a reset link is on its way. Check your
          inbox in the next few minutes.
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div>
            <label
              htmlFor="forgot-email"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Email
            </label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
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
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-400">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-amber-400 hover:text-amber-300">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
