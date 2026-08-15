import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

// Cormorant Garamond - editorial serif for premium branding
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0A0A",
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  title: "SE7E - Gerador de Orçamentos",
  description:
    "Sistema de geração de orçamentos profissionais para a SE7E Alumínio & Vidros. Crie, edite e exporte orçamentos em PDF com design premium.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
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
