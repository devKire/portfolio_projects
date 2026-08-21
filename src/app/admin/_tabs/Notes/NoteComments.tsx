'use client';

import { Check, Loader2, MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  createNoteComment,
  deleteNoteComment,
  getNoteComments,
  updateNoteComment,
} from '@/app/actions/note-comments';
import { MAX_NOTE_COMMENT_LENGTH } from '@/lib/knowledge/comments';

type NoteCommentRow = {
  id: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string | null; username: string };
};

function initials(comment: NoteCommentRow) {
  const label = comment.author.name || comment.author.username;
  return label
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatTimestamp(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function NoteComments({
  organizationId,
  noteId,
  userId,
  canModerate,
}: {
  organizationId: string;
  noteId: string;
  userId: string;
  canModerate: boolean;
}) {
  const [comments, setComments] = useState<NoteCommentRow[]>([]);
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getNoteComments(organizationId, noteId);
    if (result.success) setComments(result.data as NoteCommentRow[]);
    else toast.error(result.error);
    setLoading(false);
  }, [noteId, organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!content.trim() || busy) return;
    setBusy('create');
    const result = await createNoteComment(organizationId, noteId, content);
    if (result.success) {
      setContent('');
      setComments((current) => [...current, result.data as NoteCommentRow]);
    } else toast.error(result.error);
    setBusy(null);
  };

  return (
    <section className="border-t border-[#303036] bg-[#18181c] p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
        <MessageSquare className="h-4 w-4 text-[#9a8cff]" /> Comentários
      </h3>
      <div className="mt-4 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-[#777780]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando
            comentários...
          </div>
        )}
        {!loading && comments.length === 0 && (
          <p className="text-sm text-[#777780]">
            Nenhum comentário ainda. Inicie a discussão desta nota.
          </p>
        )}
        {comments.map((comment) => {
          const isAuthor = comment.authorId === userId;
          const isEditing = editingId === comment.id;
          return (
            <article key={comment.id} className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#34245f] text-xs font-semibold text-[#d7ccff]">
                {initials(comment)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs">
                    <span className="font-medium text-[#e4e4e7]">
                      {comment.author.name || `@${comment.author.username}`}
                    </span>{' '}
                    <span className="text-[#777780]">
                      • {formatTimestamp(comment.createdAt)}
                    </span>
                  </p>
                  <div className="flex items-center gap-1">
                    {isAuthor && !isEditing && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditingContent(comment.content);
                        }}
                        className="rounded p-1.5 text-[#8f8f98] hover:bg-[#2a2a30] hover:text-white"
                        aria-label="Editar comentário"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {(isAuthor || canModerate) && (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={async () => {
                          if (!window.confirm('Excluir este comentário?'))
                            return;
                          setBusy(`delete-${comment.id}`);
                          const result = await deleteNoteComment(
                            organizationId,
                            comment.id
                          );
                          if (result.success) {
                            setComments((current) =>
                              current.filter((item) => item.id !== comment.id)
                            );
                          } else toast.error(result.error);
                          setBusy(null);
                        }}
                        className="rounded p-1.5 text-[#8f8f98] hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                        aria-label="Excluir comentário"
                      >
                        {busy === `delete-${comment.id}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="mt-2 flex gap-2">
                    <textarea
                      value={editingContent}
                      maxLength={MAX_NOTE_COMMENT_LENGTH}
                      onChange={(event) =>
                        setEditingContent(event.target.value)
                      }
                      className="min-h-20 flex-1 resize-y rounded-md border border-[#303036] bg-[#111] p-3 text-sm text-white outline-none focus:border-[#6f55d9]"
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={!editingContent.trim() || busy !== null}
                        onClick={async () => {
                          setBusy(`edit-${comment.id}`);
                          const result = await updateNoteComment(
                            organizationId,
                            comment.id,
                            editingContent
                          );
                          if (result.success) {
                            setComments((current) =>
                              current.map((item) =>
                                item.id === comment.id
                                  ? (result.data as NoteCommentRow)
                                  : item
                              )
                            );
                            setEditingId(null);
                          } else toast.error(result.error);
                          setBusy(null);
                        }}
                        className="rounded p-2 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                        aria-label="Salvar comentário"
                      >
                        {busy === `edit-${comment.id}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded p-2 text-[#8f8f98] hover:bg-[#2a2a30]"
                        aria-label="Cancelar edição"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-[#d5d5da]">
                    {comment.content}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-5">
        <textarea
          value={content}
          maxLength={MAX_NOTE_COMMENT_LENGTH}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder="Adicionar comentário..."
          className="min-h-24 w-full resize-y rounded-md border border-[#303036] bg-[#111] p-3 text-sm text-white outline-none placeholder:text-[#666670] focus:border-[#6f55d9]"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#666670]">
            Ctrl/Cmd + Enter para comentar · {content.length}/
            {MAX_NOTE_COMMENT_LENGTH}
          </span>
          <button
            type="button"
            disabled={!content.trim() || busy !== null}
            onClick={() => void submit()}
            className="flex h-9 items-center gap-2 rounded-md bg-[#6f55d9] px-4 text-sm text-white disabled:opacity-50"
          >
            {busy === 'create' && <Loader2 className="h-4 w-4 animate-spin" />}
            Comentar
          </button>
        </div>
      </div>
    </section>
  );
}
