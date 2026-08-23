"use client";

import { FormEvent, useState } from "react";

export const SUPPORT_EMAIL = "wandertech58@gmail.com";

const TOPICS = [
  { value: "product", label: "Product support" },
  { value: "billing", label: "Billing & coins" },
  { value: "security", label: "Security & privacy" },
  { value: "partnership", label: "Partnerships" },
] as const;

const fieldClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-indigo-400/50";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<(typeof TOPICS)[number]["value"]>("product");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const topicLabel =
      TOPICS.find((t) => t.value === topic)?.label ?? "Product support";
    const subject = encodeURIComponent(`[AICareerCopilot] ${topicLabel}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${topicLabel}\n\n${message}`,
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-white/70">Full name</span>
          <input
            required
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Chen"
            className={fieldClass}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-white/70">Work email</span>
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="font-medium text-white/70">Topic</span>
        <select
          name="topic"
          value={topic}
          onChange={(e) =>
            setTopic(e.target.value as (typeof TOPICS)[number]["value"])
          }
          className={`${fieldClass} bg-[#0a0a12]`}
        >
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-white/70">How can we help?</span>
        <textarea
          required
          name="message"
          rows={5}
          minLength={12}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share a bit of context — a bug, a billing question, or what you’re trying to ship."
          className={`${fieldClass} resize-y min-h-[140px]`}
        />
      </label>

      <button type="submit" className="btn-primary w-full justify-center sm:w-auto">
        Send message
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {sent ? (
        <p className="text-sm text-emerald-300/90">
          Your email client should open. If it doesn’t, write us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      ) : (
        <p className="text-xs text-white/40">
          We typically reply within 1–2 business days. Never share passwords or
          API keys in this form.
        </p>
      )}
    </form>
  );
}
