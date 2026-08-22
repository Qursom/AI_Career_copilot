"use client";

import { useEffect } from "react";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export default function SentryInit() {
  useEffect(() => {
    if (!dsn) return;
    void import("@sentry/browser").then((Sentry) => {
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        environment: process.env.NODE_ENV,
      });
    });
  }, []);
  return null;
}
