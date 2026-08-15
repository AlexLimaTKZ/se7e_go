import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const BRAND_ICON_VERSION = "20260815";
const BRAND_ICON_192 = `/icons/icon-192.png?v=${BRAND_ICON_VERSION}`;
const BRAND_ICON_512 = `/icons/icon-512.png?v=${BRAND_ICON_VERSION}`;
const BRAND_APPLE_ICON = `/icons/apple-touch-icon.png?v=${BRAND_ICON_VERSION}`;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0A",
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://se7e-go.vercel.app"),
  applicationName: "SE7E Alumínio & Vidros",
  title: "SE7E - Gerador de Orçamentos",
  description:
    "Sistema de geração de orçamentos profissionais para a SE7E Alumínio & Vidros. Crie, edite e exporte orçamentos em PDF com design premium.",
  icons: {
    icon: [
      { url: BRAND_ICON_192, sizes: "192x192", type: "image/png" },
      { url: BRAND_ICON_512, sizes: "512x512", type: "image/png" },
    ],
    shortcut: BRAND_ICON_192,
    apple: [{ url: BRAND_APPLE_ICON, sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "SE7E",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "SE7E Alumínio & Vidros",
    title: "SE7E Alumínio & Vidros",
    description: "Orçamentos profissionais da SE7E Alumínio & Vidros.",
    images: [
      {
        url: BRAND_ICON_512,
        width: 512,
        height: 512,
        alt: "SE7E Alumínio & Vidros",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "SE7E Alumínio & Vidros",
    description: "Orçamentos profissionais da SE7E Alumínio & Vidros.",
    images: [BRAND_ICON_512],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="noise-overlay min-h-screen bg-background text-foreground antialiased selection:bg-primary/30">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster
            position="top-right"
            richColors
            toastOptions={{
              duration: 4000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
