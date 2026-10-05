"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LocalPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/library?tab=local");
  }, [router]);

  return null;
}
