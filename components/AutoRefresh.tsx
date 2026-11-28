"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/* While something is being made, refresh the page every few seconds. */
export function AutoRefresh({ active, every = 5000 }: { active: boolean; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => router.refresh(), every);
    return () => clearInterval(id);
  }, [active, every, router]);
  return null;
}
