import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import {
  MAX_IMAGE_BYTES,
  createSafeImageName,
  validateImageUpload,
} from "@/lib/security/image-file";

export const dynamic = "force-dynamic";

// GET /api/images — Listar todas as imagens do Blob
export async function GET() {
  try {
    const { blobs } = await list();

    const images = blobs
      .filter((blob) => /\.(jpg|jpeg|png|gif|webp)$/i.test(blob.pathname))
      .map((blob) => ({
        name: blob.pathname,
        url: blob.url,
        size: blob.size,
      }));

    return NextResponse.json(images);
  } catch (error) {
    console.error("Erro ao listar imagens:", error);
    // Se o Blob não estiver configurado, retornar array vazio
    return NextResponse.json([]);
  }
}

// POST /api/images — Upload de nova imagem
export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_IMAGE_BYTES + 1024 * 1024) {
      return NextResponse.json(
        { error: "A imagem deve ter no máximo 10 MB." },
        { status: 413 },
      );
    }
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const validation = validateImageUpload(file, bytes);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const blob = await put(createSafeImageName(validation.extension), file, {
      access: "private",
      contentType: validation.mimeType,
      addRandomSuffix: false,
    });

    return NextResponse.json({
      url: blob.url,
      name: blob.pathname,
    });
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload da imagem." },
      { status: 500 }
    );
  }
}
