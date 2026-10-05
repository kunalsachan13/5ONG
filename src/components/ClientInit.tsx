"use client";

import { useEffect } from "react";
import { initErrorMonitoring } from "@/lib/errorMonitoring";

export default function ClientInit() {
  useEffect(() => {
    initErrorMonitoring();
  }, []);

  return null;
}
