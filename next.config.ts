import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { useTypeScriptCli: false },
  productionBrowserSourceMaps: false,
  // Netlify's generated image function is returning 502s for the local
  // catalogue assets on this staging deploy. Serve the bundled assets
  // directly until the image optimizer is re-enabled and verified.
  images: { remotePatterns: [], unoptimized: true },
  async redirects() {
    return [{ source: "/home", destination: "/", permanent: true }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};
export default nextConfig;
