"use client";
import { useEffect } from "react";
export function Pwa() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Browsing remains available when installation is unsupported. */
      });
  }, []);
  return null;
}
