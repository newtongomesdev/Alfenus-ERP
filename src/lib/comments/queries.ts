import { getSupabaseServerClient } from "@/lib/supabase/server";

export type Comment = {
  id: string;
  authorId: string | null;
  authorName: string | null;
  entityType: string;
  entityId: string;
  parentId: string | null;
  content: string;
  isPrivate: boolean;
  isDeleted: boolean;
  editedAt: string | null;
  createdAt: string;
  replies?: Comment[];
};

export type CommentMention = {
  id: string;
  commentId: string;
  memberId: string;
  memberName?: string;
  createdAt: string;
};

type CommentRow = {
  id: string;
  author_id: string | null;
  author_name: string | null;
  entity_type: string;
  entity_id: string;
  parent_id: string | null;
  content: string;
  is_private: boolean;
  is_deleted: boolean;
  edited_at: string | null;
  created_at: string;
};

const COMMENT_SELECT = "id, author_id, author_name, entity_type, entity_id, parent_id, content, is_private, is_deleted, edited_at, created_at";

function mapRowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    entityType: row.entity_type,
    entityId: row.entity_id,
    parentId: row.parent_id,
    content: row.content,
    isPrivate: row.is_private,
    isDeleted: row.is_deleted,
    editedAt: row.edited_at,
    createdAt: row.created_at,
  };
}

function buildCommentTree(comments: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  for (const comment of comments) {
    map.set(comment.id, { ...comment, replies: [] });
  }

  for (const comment of comments) {
    const node = map.get(comment.id)!;
    if (comment.parentId && map.has(comment.parentId)) {
      map.get(comment.parentId)!.replies!.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

export async function getComments(
  lawFirmId: string,
  entityType: string,
  entityId: string,
): Promise<Comment[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("law_firm_id", lawFirmId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as CommentRow[];
  const comments = rows.map(mapRowToComment);

  return buildCommentTree(comments);
}

type CreateCommentParams = {
  lawFirmId: string;
  authorId: string;
  authorName: string;
  entityType: string;
  entityId: string;
  parentId?: string;
  content: string;
  isPrivate?: boolean;
};

export async function createComment(
  supabase: ReturnType<typeof getSupabaseServerClient> extends Promise<infer T> ? T : never,
  params: CreateCommentParams,
): Promise<Comment | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("comments")
    .insert({
      law_firm_id: params.lawFirmId,
      author_id: params.authorId,
      author_name: params.authorName,
      entity_type: params.entityType,
      entity_id: params.entityId,
      parent_id: params.parentId ?? null,
      content: params.content,
      is_private: params.isPrivate ?? false,
      is_deleted: false,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error) throw error;

  return mapRowToComment(data as CommentRow);
}

export async function updateComment(
  supabase: ReturnType<typeof getSupabaseServerClient> extends Promise<infer T> ? T : never,
  commentId: string,
  content: string,
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("comments")
    .update({
      content,
      edited_at: new Date().toISOString(),
    })
    .eq("id", commentId);

  if (error) throw error;
}

export async function deleteComment(
  supabase: ReturnType<typeof getSupabaseServerClient> extends Promise<infer T> ? T : never,
  commentId: string,
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from("comments")
    .update({ is_deleted: true })
    .eq("id", commentId);

  if (error) throw error;
}

export async function getMentionedMembers(
  lawFirmId: string,
  content: string,
): Promise<Array<{ id: string; name: string }>> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const mentionPattern = /@(\w+(?:\s\w+)?)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionPattern.exec(content)) !== null) {
    mentions.push(match[1].trim());
  }

  if (mentions.length === 0) return [];

  const { data, error } = await supabase
    .from("law_firm_members")
    .select("id, name")
    .eq("law_firm_id", lawFirmId)
    .in("name", mentions);

  if (error) throw error;

  return (data ?? []) as Array<{ id: string; name: string }>;
}

export async function getUnreadMentionCount(
  lawFirmId: string,
  memberId: string,
): Promise<number> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from("comment_mentions")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId)
    .eq("law_firm_id", lawFirmId)
    .is("read_at", null);

  if (error) throw error;

  return count ?? 0;
}
