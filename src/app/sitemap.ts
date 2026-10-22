import type { MetadataRoute } from "next";
// Preview is deliberately excluded from indexing; production requires a reviewed origin/catalogue.
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
