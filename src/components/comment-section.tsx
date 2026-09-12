"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Pencil, Trash2, CornerDownRight } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Comment = {
  id: string;
  authorId: string | null;
  authorName: string | null;
  content: string;
  isPrivate: boolean;
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
  parentId: string | null;
  replies?: Comment[];
};

type TeamMember = {
  id: string;
  name: string;
};

type CommentSectionProps = {
  entityType: string;
  entityId: string;
  currentMemberId: string;
  currentMemberName: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "agora";
  if (diffMin < 60) return `há ${diffMin}m`;
  if (diffHour < 24) return `há ${diffHour}h`;
  if (diffDay === 1) return "ontem";
  if (diffDay < 30) return `${diffDay}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function renderContentWithMentions(content: string): React.ReactNode[] {
  const mentionRegex = /@(\w+(?:\s\w+)?)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={match.index} className="font-medium text-primary">
        @{match[1]}
      </span>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CommentSkeleton() {
  return (
    <div className="flex gap-3 py-3">
      <Skeleton className="size-8 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mention Autocomplete Dropdown
// ---------------------------------------------------------------------------

function MentionDropdown({
  members,
  query,
  onSelect,
  position,
}: {
  members: TeamMember[];
  query: string;
  onSelect: (name: string) => void;
  position: { top: number; left: number };
}) {
  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase()),
  );

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute z-50 max-h-48 w-56 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((member) => (
        <button
          key={member.id}
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          onClick={() => onSelect(member.name)}
        >
          <Avatar size="sm">
            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          <span>{member.name}</span>
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single Comment
// ---------------------------------------------------------------------------

function CommentItem({
  comment,
  currentMemberId,
  onReply,
  onEdit,
  onDelete,
  depth,
}: {
  comment: Comment;
  currentMemberId: string;
  onReply: (parentId: string) => void;
  onEdit: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
  depth: number;
}) {
  const isOwn = comment.authorId === currentMemberId;

  if (comment.isDeleted) {
    return (
      <div className="flex gap-3 py-3 opacity-60">
        <Avatar size="sm">
          <AvatarFallback>?</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm italic text-muted-foreground">
            Comentário removido
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3 py-3">
        <Avatar size="sm">
          <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {comment.authorName ?? "Usuário"}
            </span>
            <time
              className="text-xs text-muted-foreground"
              dateTime={comment.createdAt}
            >
              {getRelativeTime(comment.createdAt)}
            </time>
            {comment.editedAt ? (
              <span className="text-xs text-muted-foreground">(editado)</span>
            ) : null}
            {comment.isPrivate ? (
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                Interno
              </span>
            ) : null}
          </div>

          <div className="text-sm text-foreground whitespace-pre-wrap break-words">
            {renderContentWithMentions(comment.content)}
          </div>

          <div className="flex items-center gap-1 pt-0.5">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => onReply(comment.id)}
              aria-label="Responder"
            >
              <CornerDownRight className="size-3" />
            </Button>
            {isOwn ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onEdit(comment)}
                  aria-label="Editar"
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDelete(comment.id)}
                  aria-label="Excluir"
                >
                  <Trash2 className="size-3" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 ? (
        <div
          className={cn(
            "ml-8 border-l-2 border-muted pl-3",
            depth > 0 && "ml-6",
          )}
        >
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentMemberId={currentMemberId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CommentSection({
  entityType,
  entityId,
  currentMemberId,
  currentMemberName,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState({
    top: 0,
    left: 0,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/comments?entityType=${entityType}&entityId=${entityId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments ?? []);
      }
    } catch {
      // Silent fail — comments are non-critical
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  // Fetch team members for mentions
  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/entities?type=team_member&search=`,
      );
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.items ?? []);
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchComments();
    fetchMembers();
  }, [fetchComments, fetchMembers]);

  // Submit new comment
  async function handleSubmit() {
    const content = newComment.trim();
    if (!content || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          entityId,
          content,
          parentId: replyingTo,
        }),
      });

      if (res.ok) {
        setNewComment("");
        setReplyingTo(null);
        setEditingComment(null);
        toast.success("Comentário adicionado");
        await fetchComments();
      } else {
        toast.error("Erro ao adicionar comentário");
      }
    } catch {
      toast.error("Erro ao adicionar comentário");
    } finally {
      setSubmitting(false);
    }
  }

  // Delete comment
  async function handleDelete(commentId: string) {
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Comentário removido");
        await fetchComments();
      } else {
        toast.error("Erro ao remover comentário");
      }
    } catch {
      toast.error("Erro ao remover comentário");
    }
  }

  // Edit comment
  async function handleEditSubmit() {
    if (!editingComment) return;
    const content = newComment.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/comments/${editingComment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setNewComment("");
        setEditingComment(null);
        toast.success("Comentário atualizado");
        await fetchComments();
      } else {
        toast.error("Erro ao atualizar comentário");
      }
    } catch {
      toast.error("Erro ao atualizar comentário");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle textarea input for @mention detection
  function handleTextareaInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setNewComment(value);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      // Position dropdown near cursor
      const textarea = textareaRef.current;
      if (textarea) {
        // Approximate position using a temporary element
        const rect = textarea.getBoundingClientRect();
        setMentionPosition({
          top: rect.height + 4,
          left: 8,
        });
      }
    } else {
      setMentionQuery(null);
    }
  }

  // Select mention
  function handleMentionSelect(name: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const value = newComment;
    const textBeforeCursor = value.slice(0, cursorPos);
    const mentionStart = textBeforeCursor.lastIndexOf("@");
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursorPos);
    const newValue = `${before}@${name} ${after}`;

    setNewComment(newValue);
    setMentionQuery(null);

    // Restore focus
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = mentionStart + name.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  // Handle keyboard shortcuts
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (editingComment) {
        handleEditSubmit();
      } else {
        handleSubmit();
      }
    }
    if (e.key === "Escape") {
      setReplyingTo(null);
      setEditingComment(null);
      setNewComment("");
      setMentionQuery(null);
    }
  }

  // Start editing
  function startEdit(comment: Comment) {
    setEditingComment(comment);
    setReplyingTo(null);
    setNewComment(comment.content);
    textareaRef.current?.focus();
  }

  // Build threaded structure
  const threadedComments = comments.filter((c) => c.parentId === null);
  const replyMap = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parentId) {
      const replies = replyMap.get(c.parentId) ?? [];
      replies.push(c);
      replyMap.set(c.parentId, replies);
    }
  }
  for (const parent of threadedComments) {
    parent.replies = replyMap.get(parent.id) ?? [];
  }

  return (
    <div className="space-y-4">
      {/* New Comment Form */}
      <div className="relative rounded-lg border bg-background p-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar size="sm">
            <AvatarFallback>
              {getInitials(currentMemberName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{currentMemberName}</span>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={
              replyingTo
                ? "Escreva uma resposta..."
                : "Escreva um comentário... Use @ para mencionar"
            }
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />

          {mentionQuery !== null && teamMembers.length > 0 ? (
            <MentionDropdown
              members={teamMembers}
              query={mentionQuery}
              onSelect={handleMentionSelect}
              position={mentionPosition}
            />
          ) : null}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {replyingTo ? (
              <span className="text-xs text-muted-foreground">
                Respondendo...
                <button
                  type="button"
                  className="ml-1 underline"
                  onClick={() => {
                    setReplyingTo(null);
                    setNewComment("");
                  }}
                >
                  cancelar
                </button>
              </span>
            ) : null}
            {editingComment ? (
              <span className="text-xs text-muted-foreground">
                Editando comentário
                <button
                  type="button"
                  className="ml-1 underline"
                  onClick={() => {
                    setEditingComment(null);
                    setNewComment("");
                  }}
                >
                  cancelar
                </button>
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Ctrl+Enter para enviar
            </span>
            <Button
              size="sm"
              disabled={!newComment.trim() || submitting}
              onClick={editingComment ? handleEditSubmit : handleSubmit}
            >
              <Send className="size-3.5" />
              {editingComment ? "Salvar" : "Enviar"}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="space-y-0 divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <CommentSkeleton key={i} />
          ))}
        </div>
      ) : threadedComments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum comentário ainda. Seja o primeiro a comentar!
        </p>
      ) : (
        <div className="divide-y divide-border">
          {threadedComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentMemberId={currentMemberId}
              onReply={(parentId) => {
                setReplyingTo(parentId);
                setEditingComment(null);
                textareaRef.current?.focus();
              }}
              onEdit={startEdit}
              onDelete={handleDelete}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
