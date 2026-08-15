import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notes } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const allNotes = await db.query.notes.findMany({
      orderBy: [desc(notes.id)], // Mostrar as mais recentes primeiro ou na ordem de criação
    });
    
    return NextResponse.json(allNotes);
  } catch (error) {
    console.error("[NOTES_GET]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { content } = body;

    if (!content) {
      return new NextResponse("Content is required", { status: 400 });
    }

    const [newNote] = await db.insert(notes).values({
      content,
      createdAt: new Date().toISOString(),
    }).returning();

    return NextResponse.json(newNote);
  } catch (error) {
    console.error("[NOTES_POST]", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
