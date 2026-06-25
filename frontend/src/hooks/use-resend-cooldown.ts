"use client";

import { useState, useEffect } from 'react';

const SENT_AT_KEY = 'prohire:resend-sent-at';
const COUNT_KEY = 'prohire:resend-count';
const MAX_RESENDS = 3;

export function useResendCooldown(cooldownMs = 60_000) {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const sentAt = localStorage.getItem(SENT_AT_KEY);
    const count = Number(localStorage.getItem(COUNT_KEY) ?? 0);
    setResendCount(count);
    if (sentAt) {
      const elapsed = Date.now() - Number(sentAt);
      const remaining = Math.max(0, Math.ceil((cooldownMs - elapsed) / 1000));
      setSecondsLeft(remaining);
    }
    setMounted(true);
  }, [cooldownMs]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const markSent = () => {
    const next = resendCount + 1;
    localStorage.setItem(SENT_AT_KEY, String(Date.now()));
    localStorage.setItem(COUNT_KEY, String(next));
    setResendCount(next);
    setSecondsLeft(cooldownMs / 1000);
  };

  const exhausted = resendCount >= MAX_RESENDS;

  return {
    mounted,
    secondsLeft,
    canResend: secondsLeft === 0 && !exhausted,
    exhausted,
    markSent,
  };
}
