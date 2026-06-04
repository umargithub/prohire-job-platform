"use client";

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'prohire:resend-sent-at';

export function useResendCooldown(cooldownMs = 60_000) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const sentAt = localStorage.getItem(STORAGE_KEY);
    if (!sentAt) return 0;
    const elapsed = Date.now() - Number(sentAt);
    return Math.max(0, Math.ceil((cooldownMs - elapsed) / 1000));
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const markSent = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setSecondsLeft(cooldownMs / 1000);
  };

  return { secondsLeft, canResend: secondsLeft === 0, markSent };
}
