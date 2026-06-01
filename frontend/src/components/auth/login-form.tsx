"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [rememberMe, setRememberMe] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, remember_me: rememberMe }),
      });

      if (res.ok) {
        const data = (await res.json()) as { user_id?: string };
        if (data.user_id) {
          window.localStorage.setItem("user_id", data.user_id);
        }
        window.location.href = "/dashboard";
        return;
      }

      if (res.status === 401) {
        setError("Invalid email or password.");
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
        <Link
          href="/"
          className="inline-block text-lg font-bold tracking-tight"
        >
          <span className="text-gray-100">Index</span>
          <span className="text-amber-500">Node</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-gray-100">Welcome back</h1>
        <p className="mt-1 text-sm text-gray-400">
          Sign in to your IndexNode account.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
          >
            Email
          </label>
          <Input
            id="login-email"
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
          <div className="flex items-baseline justify-between">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="mt-2"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-amber-500 focus:ring-amber-500"
          />
          Remember me for 30 days
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
        {submitting ? "Signing in…" : "Sign in"}
      </Button>

      <p className="mt-6 text-center text-sm text-gray-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-amber-400 hover:text-amber-300">
          Sign up
        </Link>
      </p>
    </form>
  );
}
