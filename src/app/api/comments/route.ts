import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getComments,
  createComment,
  getMentionedMembers,
} from "@/lib/comments/queries";
import { logActivityEvent } from "@/lib/timeline/queries";
import { createNotification } from "@/lib/notifications/queries";

// ---------------------------------------------------------------------------
// GET /api/comments?entityType=...&entityId=...
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType")?.trim() ?? "";
  const entityId = searchParams.get("entityId")?.trim() ?? "";

  if (!entityType || !entityId) {
    return NextResponse.json({ comments: [] });
  }

  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json({ comments: [] });
  }

  try {
    const comments = await getComments(context.lawFirm.id, entityType, entityId);
    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ comments: [] });
  }
}

// ---------------------------------------------------------------------------
// POST /api/comments
// Body: { entityType, entityId, content, parentId?, isPrivate? }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const lawFirmId = context.lawFirm.id;

  let body: {
    entityType?: string;
    entityId?: string;
    content?: string;
    parentId?: string;
    isPrivate?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const entityType = body.entityType?.trim() ?? "";
  const entityId = body.entityId?.trim() ?? "";
  const content = body.content?.trim() ?? "";
  const parentId = body.parentId?.trim() || undefined;
  const isPrivate = body.isPrivate ?? false;

  if (!entityType || !entityId || !content) {
    return NextResponse.json(
      { error: "entityType, entityId e content são obrigatórios" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Ambiente indisponível" }, { status: 500 });
  }

  try {
    const comment = await createComment(supabase, {
      lawFirmId,
      authorId: context.member.id,
      authorName: context.member.name,
      entityType,
      entityId,
      parentId,
      content,
      isPrivate,
    });

    if (!comment) {
      return NextResponse.json({ error: "Erro ao criar comentário" }, { status: 500 });
    }

    // Log activity event
    const eventTitle =
      parentId ? "Resposta adicionada" : "Comentário adicionado";
    const eventDescription =
      content.length > 120 ? `${content.slice(0, 120)}...` : content;

    logActivityEvent(supabase, {
      lawFirmId,
      actorId: context.member.id,
      actorName: context.member.name,
      eventType: "comment",
      entityType,
      entityId,
      entityTitle: eventTitle,
      description: eventDescription,
    }).catch(() => {
      // Non-critical — activity logging should not block the response
    });

    // Parse @mentions
    const mentionedMembers = await getMentionedMembers(
      context.lawFirm.id,
      content,
    );

    if (mentionedMembers.length > 0) {
      // Create comment_mentions records
      const mentionRows = mentionedMembers.map((member) => ({
        comment_id: comment.id,
        member_id: member.id,
        law_firm_id: lawFirmId,
      }));

      void Promise.resolve(
        supabase
          .from("comment_mentions")
          .insert(mentionRows),
      ).catch(() => {
        // Non-critical
      });

      // Create notifications for mentioned members
      for (const member of mentionedMembers) {
        if (member.id === context.member.id) continue; // Don't notify self

        createNotification(supabase, {
          lawFirmId,
          memberId: member.id,
          type: "mention",
          title: `${context.member.name} mencionou você em um comentário`,
          body: eventDescription,
          metadata: {
            entityType,
            entityId,
            commentId: comment.id,
          },
        }).catch(() => {
          // Non-critical
        });
      }
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
