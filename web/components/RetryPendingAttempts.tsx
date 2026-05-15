"use client";

import { useEffect } from "react";
import { retryPendingAttempts } from "@/lib/tracking";

export default function RetryPendingAttempts() {
  useEffect(() => {
    // Fire-and-forget: retry any attempts that failed to submit previously
    retryPendingAttempts().catch(() => {});
  }, []);
  return null;
}
