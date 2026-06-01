"use client";

import * as React from "react";
import { ArrowRight, Check } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

interface NewsletterResponse {
  ok?: boolean;
  error?: string;
}

export default function NewsletterForm() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<FormState>("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as NewsletterResponse;
      if (res.ok && data.ok) {
        setState("success");
        setMessage("You're on the list.");
        setEmail("");
        return;
      }
      setState("error");
      setMessage(data.error ?? "Subscription failed. Try again later.");
    } catch {
      setState("error");
      setMessage("Network error. Try again later.");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <label
        htmlFor="newsletter-email"
        className="block text-xs font-semibold uppercase tracking-wider text-gray-400"
      >
        Newsletter
      </label>
      <p className="mt-2 text-xs text-gray-500">
        Release notes and the occasional deep dive. No spam.
      </p>
      <div className="mt-3 flex items-stretch gap-2">
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") {
              setState("idle");
              setMessage(null);
            }
          }}
          placeholder="you@example.com"
          disabled={state === "submitting"}
          className="h-9 flex-1 rounded-md border border-gray-800 bg-gray-900 px-3 text-sm text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === "submitting"}
          aria-label="Subscribe"
          className="inline-flex h-9 items-center justify-center rounded-md bg-amber-500 px-3 text-sm font-semibold text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className={`mt-2 text-xs ${
            state === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
