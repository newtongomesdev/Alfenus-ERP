"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createComment,
  getMentionedMembers,
  type Comment,
} from "@/lib/comments/queries";
import { logActivityEvent } from "@/lib/timeline/queries";
import { createNotification } from "@/lib/notifications/queries";

type CommentActionClient = {
  from(table: "comment_mentions"): {
    insert(values: Array<Record<string, unknown>>): PromiseLike<{ error: Error | null }>;
  };
  from(table: "comments"): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): PromiseLike<{ error: Error | null }>;
    };
  };
};

function fail(error: string): never {
  redirect(`/comentarios?erro=${error}`);
}

export async function createCommentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");

  const entityType = String(formData.get("entityType") ?? "").trim();
  const entityId = String(formData.get("entityId") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "").trim();
  const isPrivate = formData.get("isPrivate") === "true";

  if (!entityType || !entityId || !content) fail("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const comment = await createComment(supabase, {
    lawFirmId: context.lawFirm.id,
    authorId: context.member.id,
    authorName: context.member.name,
    entityType,
    entityId,
    parentId: parentId || undefined,
    content,
    isPrivate,
  });

  if (!comment) fail("criacao");

  await logActivityEvent(supabase, {
    lawFirmId: context.lawFirm.id,
    actorId: context.member.id,
    actorName: context.member.name,
    eventType: "comentario_criado",
    entityType,
    entityId,
    description: content.length > 100 ? content.slice(0, 100) + "..." : content,
    metadata: { comment_id: comment.id },
  });

  const mentionedMembers = await getMentionedMembers(context.lawFirm.id, content);
  if (mentionedMembers.length > 0) {
    const mentionClient = supabase as unknown as CommentActionClient;
    const mentionRecords = mentionedMembers
      .filter((member) => member.id !== context.member!.id)
      .map((member) => ({
        law_firm_id: context.lawFirm!.id,
        comment_id: comment.id,
        member_id: member.id,
        member_name: member.name,
      }));

    if (mentionRecords.length > 0) {
      await mentionClient.from("comment_mentions").insert(mentionRecords);

      for (const member of mentionedMembers.filter((m) => m.id !== context.member!.id)) {
        await createNotification(supabase, {
          lawFirmId: context.lawFirm.id,
          memberId: member.id,
          type: "mencao_comentario",
          title: `${context.member.name} mencionou você em um comentário`,
          body: content.length > 150 ? content.slice(0, 150) + "..." : content,
          metadata: {
            comment_id: comment.id,
            entity_type: entityType,
            entity_id: entityId,
          },
        });
      }
    }
  }

  revalidatePath("/comentarios");
  revalidatePath("/dashboard");
  redirect("/comentarios?criado=1");
}

export async function deleteCommentAction(formData: FormData) {
  const context = await getAppContext();
  if (context.status === "missing-env") fail("ambiente");
  if (context.status === "signed-out") redirect("/entrar");
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/onboarding");

  const commentId = String(formData.get("commentId") ?? "").trim();
  if (!commentId) fail("validacao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) fail("ambiente");

  const client = supabase as unknown as CommentActionClient;
  const { error } = await client
    .from("comments")
    .update({ is_deleted: true })
    .eq("id", commentId);

  if (error) fail("exclusao");

  await logActivityEvent(supabase, {
    lawFirmId: context.lawFirm.id,
    actorId: context.member.id,
    actorName: context.member.name,
    eventType: "comentario_excluido",
    entityType: "comment",
    entityId: commentId,
    metadata: {},
  });

  revalidatePath("/comentarios");
  revalidatePath("/dashboard");
  redirect("/comentarios?excluido=1");
}
