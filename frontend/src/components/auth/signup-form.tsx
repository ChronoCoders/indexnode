"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [terms, setTerms] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password || !confirm) {
      setError("Please fill in every field.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
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
    if (!terms) {
      setError("You must accept the Terms of Service and Privacy Policy.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = (await res.json()) as { user_id?: string };
        if (data.user_id) {
          window.localStorage.setItem("user_id", data.user_id);
        }
        window.location.href = "/dashboard";
        return;
      }

      if (res.status === 422) {
        setError(
          "Password is too weak. Use at least 8 characters including a number and a symbol.",
        );
      } else if (res.status === 500) {
        setError("An account with this email may already exist.");
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
    <form
      onSubmit={submit}
      noValidate
      className="rounded-xl border border-gray-800 bg-gray-900 p-8 shadow-xl"
    >
      <div className="mb-6 text-center">
        <Link href="/" className="inline-block text-lg font-bold tracking-tight">
          <span className="text-gray-100">Index</span>
          <span className="text-amber-500">Node</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-gray-100">
          Get started free
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          1,000 free credits on signup — no wallet required.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="signup-email"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
          >
            Email
          </label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="mt-2"
          />
        </div>

        <div>
          <label
            htmlFor="signup-password"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
          >
            Password
          </label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="mt-2"
          />
          <p className="mt-1 text-[11px] text-gray-500">
            Minimum 8 characters. Include a number and a symbol for a strong
            score.
          </p>
        </div>

        <div>
          <label
            htmlFor="signup-confirm"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
          >
            Confirm password
          </label>
          <Input
            id="signup-confirm"
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

        <label className="flex items-start gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-800 text-amber-500 focus:ring-amber-500"
          />
          <span>
            I agree to the{" "}
            <Link
              href="/terms"
              className="text-amber-400 hover:text-amber-300"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-amber-400 hover:text-amber-300"
            >
              Privacy Policy
            </Link>
            .
          </span>
        </label>
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
        {submitting ? "Creating account…" : "Create account"}
      </Button>

      <p className="mt-6 text-center text-sm text-gray-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-amber-400 hover:text-amber-300">
          Sign in
        </Link>
      </p>
    </form>
  );
}
