import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://5ong.app";
  const now = new Date();

  const routes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/search", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/rooms", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/library", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/import", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/local", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/login", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.4, changeFrequency: "yearly" as const },
  ];

  return routes.map((r) => ({
    url: `${baseUrl}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
