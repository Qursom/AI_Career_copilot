import type { Metadata } from "next";
import ContactForm, { SUPPORT_EMAIL } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact — AICareerCopilot",
  description:
    "Talk to the AICareerCopilot team about product support, billing, security, or partnerships.",
};

const CHANNELS = [
  {
    title: "Email",
    detail: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    caption: "Best for bugs, billing, and account questions.",
  },
  {
    title: "Response time",
    detail: "1–2 business days",
    caption: "Weekdays, 9:00–18:00 PKT. Urgent security reports are prioritized.",
  },
  {
    title: "Security",
    detail: "Responsible disclosure",
    href: `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("[Security] AICareerCopilot")}`,
    caption: "Report a vulnerability privately. Do not post exploits publicly.",
  },
];

export default function ContactPage() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-10">
      <div className="animate-fade-in-up max-w-2xl">
        <p className="chip glass text-white/65">Contact</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          We’re here when the
          <span className="text-gradient"> pipeline needs a human.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/55">
          Product issues, coin balances, privacy questions, or a partnership
          idea — send a note and we’ll route it to the right owner.
        </p>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:items-start">
        <aside className="space-y-4 lg:col-span-5">
          {CHANNELS.map((item) => (
            <div key={item.title} className="card">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
                {item.title}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  className="mt-2 block text-base font-medium text-white transition-colors hover:text-indigo-200"
                >
                  {item.detail}
                </a>
              ) : (
                <p className="mt-2 text-base font-medium text-white">{item.detail}</p>
              )}
              <p className="mt-1.5 text-sm leading-relaxed text-white/50">
                {item.caption}
              </p>
            </div>
          ))}

          <ul className="grid gap-2 text-sm text-white/45 sm:grid-cols-2">
            <li className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              No training on your resume
            </li>
            <li className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              Failed runs are never billed
            </li>
          </ul>
        </aside>

        <div className="card lg:col-span-7 lg:p-8">
          <h2 className="text-lg font-semibold tracking-tight">Send a message</h2>
          <p className="mt-1 text-sm text-white/50">
            Opens your mail client with the details filled in. No extra account
            required.
          </p>
          <div className="mt-6">
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
