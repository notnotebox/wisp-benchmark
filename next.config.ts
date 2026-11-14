import type { NextConfig } from "next";

// Browser-side hardening. The page calls the models the visitor connects, so connect-src has to allow
// any https address and the local machine; the other directives limit what a script could load or do.
// This reduces the risk of key theft, it does not remove it. The site ships no third-party scripts.
const csp = [
  "default-src 'self'",
  // Next.js inlines small bootstrap scripts and styles.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: http://127.0.0.1:* http://localhost:*",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    // Development needs eval and a websocket for hot reload.
    return process.env.NODE_ENV === "production" ? [{ source: "/:path*", headers: securityHeaders }] : [];
  },
};

export default nextConfig;
