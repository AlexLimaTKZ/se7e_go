import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const APP_BASE_PATH = "/go";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // O SE7E GO vive abaixo de /go para deixar a raiz do domínio livre para o site institucional.
  basePath: APP_BASE_PATH,
  // Keep the repository-owned AGENTS.md stable when `next dev` starts.
  agentRules: false,
  reactCompiler: true,
  // Serwist still injects a webpack hook; this lets Next use Turbopack for the app build.
  turbopack: {},
  // Permitir imagens do Vercel Blob e externas
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        // Enquanto o site institucional não existe, a raiz leva direto ao sistema.
        // basePath: false é necessário para que a origem seja realmente "/" e não "/go".
        source: "/",
        destination: APP_BASE_PATH,
        permanent: false,
        basePath: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Compatibilidade para chamadas/recursos que ainda usam caminhos absolutos na raiz.
        // Assim o sistema funciona em /go sem expor uma segunda aplicação ao usuário.
        {
          source: "/api/:path*",
          destination: `${APP_BASE_PATH}/api/:path*`,
          basePath: false,
        },
        {
          source: "/icons/:path*",
          destination: `${APP_BASE_PATH}/icons/:path*`,
          basePath: false,
        },
        {
          source: "/se7e-logo-v2.png",
          destination: `${APP_BASE_PATH}/se7e-logo-v2.png`,
          basePath: false,
        },
        {
          source: "/sw.js",
          destination: `${APP_BASE_PATH}/sw.js`,
          basePath: false,
        },
      ],
    };
  },
  async headers() {
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.turso.io wss://*.turso.io https://*.vercel-storage.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; connect-src 'self'" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
