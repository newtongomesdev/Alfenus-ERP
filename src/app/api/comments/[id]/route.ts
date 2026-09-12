import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { updateComment, deleteComment } from "@/lib/comments/queries";

// ---------------------------------------------------------------------------
// PATCH /api/comments/[id]
// Body: { content }
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: commentId } = await params;

  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const content = body.content?.trim() ?? "";
  if (!content) {
    return NextResponse.json(
      { error: "content é obrigatório" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Ambiente indisponível" }, { status: 500 });
  }

  // Verify ownership
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (fetchError || !comment) {
    return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });
  }

  if (comment.author_id !== context.member.id) {
    return NextResponse.json(
      { error: "Somente o autor pode editar" },
      { status: 403 },
    );
  }

  try {
    await updateComment(supabase, commentId, content);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating comment:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/comments/[id]
// Soft delete — sets is_deleted = true
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: commentId } = await params;

  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Ambiente indisponível" }, { status: 500 });
  }

  // Verify ownership
  const { data: comment, error: fetchError } = await supabase
    .from("comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("law_firm_id", context.lawFirm.id)
    .single();

  if (fetchError || !comment) {
    return NextResponse.json({ error: "Comentário não encontrado" }, { status: 404 });
  }

  if (comment.author_id !== context.member.id) {
    return NextResponse.json(
      { error: "Somente o autor pode excluir" },
      { status: 403 },
    );
  }

  try {
    await deleteComment(supabase, commentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
