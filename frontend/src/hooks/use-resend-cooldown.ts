"use client";

import { useState, useEffect } from "react";
import { RESEND_SENT_AT_KEY as SENT_AT_KEY } from "@/lib/storage-keys";

export function useResendCooldown(cooldownMs = 60_000) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sentAt = localStorage.getItem(SENT_AT_KEY);
    if (sentAt) {
      const elapsed = Date.now() - Number(sentAt);
      const remaining = Math.max(0, Math.ceil((cooldownMs - elapsed) / 1000));
      setSecondsLeft(remaining);
    }
    setMounted(true);
  }, [cooldownMs]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [secondsLeft]);

  const markSent = () => {
    localStorage.setItem(SENT_AT_KEY, String(Date.now()));
    setSecondsLeft(cooldownMs / 1000);
  };

  return {
    mounted,
    secondsLeft,
    canResend: secondsLeft === 0,
    markSent,
  };
}
