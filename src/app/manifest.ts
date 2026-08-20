import type { MetadataRoute } from "next";

const APP_BASE_PATH = "/go";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SE7E Alumínio & Vidros - Gerador de Orçamentos",
    short_name: "SE7E",
    description:
      "Sistema de geração de orçamentos profissionais para vidraçaria",
    start_url: APP_BASE_PATH,
    scope: `${APP_BASE_PATH}/`,
    display: "standalone",
    background_color: "#0d0d0d",
    theme_color: "#BE9610",
    orientation: "portrait",
    icons: [
      {
        src: `${APP_BASE_PATH}/icons/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: `${APP_BASE_PATH}/icons/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${APP_BASE_PATH}/icons/apple-touch-icon.png`,
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
