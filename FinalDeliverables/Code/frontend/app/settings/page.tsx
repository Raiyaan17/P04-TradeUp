"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Settings index page - redirects to the default settings section (Account).
 * The actual Settings UI structure is in layout.tsx (shared sidebar).
 */
export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/account");
  }, [router]);

  // Return null while redirecting (layout handles the shell)
  return null;
}
