"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardCard } from "./dashboard-cards";

interface Note {
  id: number;
  content: string;
  createdAt: string | null;
}

const noteDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function formatNoteDate(value: string | null): string {
  if (!value) return "Horário indisponível";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Horário indisponível" : noteDateFormatter.format(date);
}

export function QuickNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotes = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/notes", { signal, cache: "no-store" });
      if (!response.ok) throw new Error("notes request failed");
      setNotes((await response.json()) as Note[]);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível carregar as anotações.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetchNotes(controller.signal);
    return () => controller.abort();
  }, [fetchNotes]);

  const restoreDeletedNote = async (note: Note) => {
    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: note.content }),
      });
      if (!response.ok) throw new Error("note restore failed");
      const restored = (await response.json()) as Note;
      setNotes((current) => [restored, ...current]);
      toast.success("Anotação restaurada.");
    } catch {
      toast.error("Não foi possível restaurar a anotação.");
    }
  };

  const handleAddNote = async (event: React.FormEvent) => {
    event.preventDefault();
    const noteContent = newNote.trim();
    if (!noteContent || isSubmitting) return;

    setIsSubmitting(true);
    const temporaryNote: Note = {
      id: -Date.now(),
      content: noteContent,
      createdAt: new Date().toISOString(),
    };
    setNotes((current) => [temporaryNote, ...current]);
    setNewNote("");

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent }),
      });
      if (!response.ok) throw new Error("note creation failed");
      const createdNote = (await response.json()) as Note;
      setNotes((current) => current.map((note) => note.id === temporaryNote.id ? createdNote : note));
      toast.success("Anotação adicionada.");
    } catch {
      setNotes((current) => current.filter((note) => note.id !== temporaryNote.id));
      setNewNote(noteContent);
      toast.error("Não foi possível adicionar a anotação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (id: number) => {
    const noteIndex = notes.findIndex((note) => note.id === id);
    const removedNote = notes[noteIndex];
    if (!removedNote) return;

    setNotes((current) => current.filter((note) => note.id !== id));
    try {
      const response = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("note deletion failed");
      toast.success("Anotação excluída.", {
        action: {
          label: "Desfazer",
          onClick: () => void restoreDeletedNote(removedNote),
        },
      });
    } catch {
      setNotes((current) => {
        const restored = [...current];
        restored.splice(Math.max(0, noteIndex), 0, removedNote);
        return restored;
      });
      toast.error("Não foi possível excluir a anotação.");
    }
  };

  return (
    <DashboardCard title="Anotações rápidas" icon={<ClipboardList className="size-4" />} delay={0.12}>
      <div className="flex h-full flex-col">
        <div className="custom-scrollbar min-h-[180px] max-h-[240px] flex-1 space-y-2 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex h-full min-h-36 items-center justify-center" role="status">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Carregando anotações</span>
            </div>
          ) : notes.length === 0 ? (
            <div className="flex h-full min-h-36 flex-col items-center justify-center space-y-2 text-center text-muted-foreground">
              <ClipboardList className="size-8 opacity-60" aria-hidden="true" />
              <p className="max-w-[190px] text-sm">Nenhuma anotação. Escreva algo importante abaixo.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {notes.map((note) => (
                <li key={note.id} className="group flex items-start gap-2 rounded-md p-2 transition-colors hover:bg-muted/50">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm leading-snug text-foreground/90">{note.content}</p>
                    <time className="mt-1 block text-xs text-muted-foreground" dateTime={note.createdAt ?? undefined}>
                      {formatNoteDate(note.createdAt)}
                    </time>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => void handleDeleteNote(note.id)}
                    aria-label={`Excluir anotação: ${note.content}`}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleAddNote} className="mt-4 flex items-end gap-2 border-t border-border/50 pt-3">
          <div className="min-w-0 flex-1">
            <label htmlFor="quick-note" className="mb-1.5 block text-xs font-medium text-muted-foreground">Nova anotação</label>
            <Input
              id="quick-note"
              placeholder="Escreva uma nota..."
              value={newNote}
              maxLength={500}
              onChange={(event) => setNewNote(event.target.value)}
              className="h-11 bg-muted/30"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            className="size-11 shrink-0"
            disabled={!newNote.trim() || isSubmitting}
            aria-label="Adicionar anotação"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </Button>
        </form>
      </div>
    </DashboardCard>
  );
}
