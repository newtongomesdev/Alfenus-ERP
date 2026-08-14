import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock de dependências
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSecurityNotification,
  getSecurityNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  deleteNotification,
  notifyMfaActivated,
  notifyMfaDeactivated,
  notifyNewSession,
  notifySessionRevoked,
  notifyUnusualActivity,
  notifyGracePeriodEnding,
} from "../notifications";

/* eslint-disable @typescript-eslint/no-explicit-any */
function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const qb: Record<string, any> = {};
  const methods = [
    "select",
    "eq",
    "neq",
    "is",
    "maybeSingle",
    "single",
    "order",
    "limit",
    "update",
    "insert",
    "gt",
    "range",
  ];
  for (const method of methods) {
    qb[method] = vi.fn().mockReturnValue(qb);
  }
  qb.then = (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
  ) => {
    resolve({ data, error });
  };
  return qb;
}

const mockFrom = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createSecurityNotification
// ---------------------------------------------------------------------------
describe("createSecurityNotification", () => {
  it("cria notificação com campos corretos", async () => {
    const insertedData = {
      id: "notif-1",
      user_id: "user-1",
      law_firm_id: "firm-1",
      type: "mfa_ativado",
      title: "MFA Ativado",
      message: "A autenticacao foi ativada.",
      metadata: null,
      read: false,
      deleted_at: null,
      created_at: "2025-01-01T00:00:00Z",
    };

    const insertQb = createMockQueryBuilder(insertedData);
    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await createSecurityNotification(
      "user-1",
      "firm-1",
      "mfa_ativado",
      "MFA Ativado",
      "A autenticacao foi ativada."
    );

    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        law_firm_id: "firm-1",
        type: "mfa_ativado",
        title: "MFA Ativado",
        message: "A autenticacao foi ativada.",
        read: false,
      })
    );
  });

  it("retorna notificação mapeada corretamente", async () => {
    const insertedData = {
      id: "notif-1",
      user_id: "user-1",
      law_firm_id: "firm-1",
      type: "nova_sessao",
      title: "Nova Sessao",
      message: "Nova sessao detectada.",
      metadata: { ip: "192.168.1.1" },
      read: false,
      deleted_at: null,
      created_at: "2025-01-01T00:00:00Z",
    };

    const insertQb = createMockQueryBuilder(insertedData);
    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await createSecurityNotification(
      "user-1",
      "firm-1",
      "nova_sessao",
      "Nova Sessao",
      "Nova sessao detectada.",
      { ip: "192.168.1.1" }
    );

    expect(result).toEqual({
      id: "notif-1",
      userId: "user-1",
      lawFirmId: "firm-1",
      type: "nova_sessao",
      title: "Nova Sessao",
      message: "Nova sessao detectada.",
      metadata: { ip: "192.168.1.1" },
      read: false,
      deletedAt: null,
      createdAt: "2025-01-01T00:00:00Z",
    });
  });

  it("retorna null quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const result = await createSecurityNotification(
      "user-1",
      "firm-1",
      "mfa_ativado",
      "MFA Ativado",
      "Mensagem"
    );

    expect(result).toBeNull();
  });

  it("lança erro quando insert falha", async () => {
    const dbError = { message: "insert failed", code: "23505" };
    const insertQb = createMockQueryBuilder(null, dbError);
    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await expect(
      createSecurityNotification(
        "user-1",
        "firm-1",
        "mfa_ativado",
        "MFA Ativado",
        "Mensagem"
      )
    ).rejects.toEqual(dbError);
  });
});

// ---------------------------------------------------------------------------
// getSecurityNotifications
// ---------------------------------------------------------------------------
describe("getSecurityNotifications", () => {
  it("retorna lista de notificações", async () => {
    const rows = [
      {
        id: "notif-1",
        user_id: "user-1",
        law_firm_id: "firm-1",
        type: "mfa_ativado",
        title: "MFA Ativado",
        message: "Mensagem 1",
        metadata: null,
        read: false,
        deleted_at: null,
        created_at: "2025-01-01T00:00:00Z",
      },
      {
        id: "notif-2",
        user_id: "user-1",
        law_firm_id: "firm-1",
        type: "nova_sessao",
        title: "Nova Sessao",
        message: "Mensagem 2",
        metadata: { ip: "10.0.0.1" },
        read: true,
        deleted_at: null,
        created_at: "2025-01-02T00:00:00Z",
      },
    ];

    const selectQb = createMockQueryBuilder(rows);
    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getSecurityNotifications("user-1", "firm-1");

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("notif-1");
    expect(result[0].type).toBe("mfa_ativado");
    expect(result[1].id).toBe("notif-2");
    expect(result[1].type).toBe("nova_sessao");
    expect(result[1].metadata).toEqual({ ip: "10.0.0.1" });
  });

  it("retorna array vazio quando não há notificações", async () => {
    const selectQb = createMockQueryBuilder([]);
    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getSecurityNotifications("user-1", "firm-1");

    expect(result).toEqual([]);
  });

  it("aplica filtro unreadOnly quando especificado", async () => {
    const rows = [
      {
        id: "notif-1",
        user_id: "user-1",
        law_firm_id: "firm-1",
        type: "mfa_ativado",
        title: "MFA Ativado",
        message: "Mensagem",
        metadata: null,
        read: false,
        deleted_at: null,
        created_at: "2025-01-01T00:00:00Z",
      },
    ];

    const selectQb = createMockQueryBuilder(rows);
    mockFrom.mockReturnValueOnce(selectQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await getSecurityNotifications("user-1", "firm-1", { unreadOnly: true });

    expect(selectQb.eq).toHaveBeenCalledWith("read", false);
  });

  it("retorna array vazio quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const result = await getSecurityNotifications("user-1", "firm-1");

    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// markAsRead
// ---------------------------------------------------------------------------
describe("markAsRead", () => {
  it("marca notificação como lida", async () => {
    const updateQb = createMockQueryBuilder(null);
    mockFrom.mockReturnValueOnce(updateQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await markAsRead("notif-1", "user-1");

    expect(updateQb.update).toHaveBeenCalledWith({ read: true });
  });

  it("verifica userId na query", async () => {
    const updateQb = createMockQueryBuilder(null);
    mockFrom.mockReturnValueOnce(updateQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await markAsRead("notif-1", "user-1");

    expect(updateQb.eq).toHaveBeenCalledWith("id", "notif-1");
    expect(updateQb.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("não faz nada quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    // Não deve lançar erro
    await markAsRead("notif-1", "user-1");
  });
});

// ---------------------------------------------------------------------------
// markAllAsRead
// ---------------------------------------------------------------------------
describe("markAllAsRead", () => {
  it("marca todas as notificações como lidas", async () => {
    const updateQb = createMockQueryBuilder(null);
    mockFrom.mockReturnValueOnce(updateQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await markAllAsRead("user-1", "firm-1");

    expect(updateQb.update).toHaveBeenCalledWith({ read: true });
  });

  it("usa law_firm_id e userId no filtro", async () => {
    const updateQb = createMockQueryBuilder(null);
    mockFrom.mockReturnValueOnce(updateQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await markAllAsRead("user-1", "firm-1");

    expect(updateQb.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(updateQb.eq).toHaveBeenCalledWith("law_firm_id", "firm-1");
  });

  it("não faz nada quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    // Não deve lançar erro
    await markAllAsRead("user-1", "firm-1");
  });
});

// ---------------------------------------------------------------------------
// getUnreadCount
// ---------------------------------------------------------------------------
describe("getUnreadCount", () => {
  it("retorna contagem correta de não lidas", async () => {
    const countQb = createMockQueryBuilder(null);
    countQb.then = (
      resolve: (value: { count: number; error: unknown }) => unknown,
    ) => {
      resolve({ count: 5, error: null });
    };

    mockFrom.mockReturnValueOnce(countQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getUnreadCount("user-1", "firm-1");

    expect(result).toBe(5);
  });

  it("retorna 0 quando não há não lidas", async () => {
    const countQb = createMockQueryBuilder(null);
    countQb.then = (
      resolve: (value: { count: number; error: unknown }) => unknown,
    ) => {
      resolve({ count: 0, error: null });
    };

    mockFrom.mockReturnValueOnce(countQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await getUnreadCount("user-1", "firm-1");

    expect(result).toBe(0);
  });

  it("retorna 0 quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    const result = await getUnreadCount("user-1", "firm-1");

    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// deleteNotification
// ---------------------------------------------------------------------------
describe("deleteNotification", () => {
  it("exclui notificação (soft delete)", async () => {
    const updateQb = createMockQueryBuilder(null);
    mockFrom.mockReturnValueOnce(updateQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await deleteNotification("notif-1", "user-1");

    expect(updateQb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        deleted_at: expect.any(String),
      })
    );
  });

  it("verifica userId na query", async () => {
    const updateQb = createMockQueryBuilder(null);
    mockFrom.mockReturnValueOnce(updateQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    await deleteNotification("notif-1", "user-1");

    expect(updateQb.eq).toHaveBeenCalledWith("id", "notif-1");
    expect(updateQb.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("não faz nada quando Supabase admin não está disponível", async () => {
    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue(
      null
    );

    // Não deve lançar erro
    await deleteNotification("notif-1", "user-1");
  });
});

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------
describe("helper functions", () => {
  it("notifyMfaActivated cria notificação com tipo correto", async () => {
    const insertedData = {
      id: "notif-1",
      user_id: "user-1",
      law_firm_id: "firm-1",
      type: "mfa_ativado",
      title: "MFA Ativado",
      message: "A autenticacao de dois fatores foi ativada na sua conta.",
      metadata: null,
      read: false,
      deleted_at: null,
      created_at: "2025-01-01T00:00:00Z",
    };

    const insertQb = createMockQueryBuilder(insertedData);
    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await notifyMfaActivated("user-1", "firm-1");

    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "mfa_ativado" })
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe("mfa_ativado");
  });

  it("notifyMfaDeactivated cria notificação com tipo correto", async () => {
    const insertedData = {
      id: "notif-2",
      user_id: "user-1",
      law_firm_id: "firm-1",
      type: "mfa_desativado",
      title: "MFA Desativado",
      message: "A autenticacao de dois fatores foi desativada na sua conta.",
      metadata: null,
      read: false,
      deleted_at: null,
      created_at: "2025-01-01T00:00:00Z",
    };

    const insertQb = createMockQueryBuilder(insertedData);
    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await notifyMfaDeactivated("user-1", "firm-1");

    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "mfa_desativado" })
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe("mfa_desativado");
  });

  it("notifyNewSession cria notificação com metadata", async () => {
    const metadata = {
      ip: "192.168.1.1",
      userAgent: "Chrome/120",
      timestamp: "2025-01-01T00:00:00Z",
    };

    const insertedData = {
      id: "notif-3",
      user_id: "user-1",
      law_firm_id: "firm-1",
      type: "nova_sessao",
      title: "Nova Sessao Iniciada",
      message: "Uma nova sessao foi iniciada na sua conta.",
      metadata,
      read: false,
      deleted_at: null,
      created_at: "2025-01-01T00:00:00Z",
    };

    const insertQb = createMockQueryBuilder(insertedData);
    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await notifyNewSession("user-1", "firm-1", metadata);

    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "nova_sessao",
        metadata,
      })
    );
    expect(result).not.toBeNull();
    expect(result!.metadata).toEqual(metadata);
  });

  it("notifySessionRevoked cria notificação com tipo correto", async () => {
    const insertedData = {
      id: "notif-4",
      user_id: "user-1",
      law_firm_id: "firm-1",
      type: "sessao_revogada",
      title: "Sessao Encerrada",
      message: "Uma sessao foi encerrada por motivos de seguranca.",
      metadata: null,
      read: false,
      deleted_at: null,
      created_at: "2025-01-01T00:00:00Z",
    };

    const insertQb = createMockQueryBuilder(insertedData);
    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await notifySessionRevoked("user-1", "firm-1");

    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "sessao_revogada" })
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe("sessao_revogada");
  });

  it("notifyUnusualActivity cria notificação com tipo correto", async () => {
    const insertedData = {
      id: "notif-5",
      user_id: "user-1",
      law_firm_id: "firm-1",
      type: "atividade_suspeita",
      title: "Atividade Suspeita Detectada",
      message:
        "Uma atividade incomum foi detectada na sua conta. Verifique suas sessoes e dispositivos.",
      metadata: null,
      read: false,
      deleted_at: null,
      created_at: "2025-01-01T00:00:00Z",
    };

    const insertQb = createMockQueryBuilder(insertedData);
    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await notifyUnusualActivity("user-1", "firm-1");

    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "atividade_suspeita" })
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe("atividade_suspeita");
  });

  it("notifyGracePeriodEnding cria notificação com mensagem dinâmica", async () => {
    const metadata = { daysRemaining: 3, deadline: "2025-02-01T00:00:00Z" };

    const insertedData = {
      id: "notif-6",
      user_id: "user-1",
      law_firm_id: "firm-1",
      type: "periodo_carencia_terminando",
      title: "Periodo de Carencia Terminando",
      message:
        "O periodo de carencia para configurar MFA termina em 3 dia(s). Configure o MFA para evitar o bloqueio da conta.",
      metadata,
      read: false,
      deleted_at: null,
      created_at: "2025-01-01T00:00:00Z",
    };

    const insertQb = createMockQueryBuilder(insertedData);
    mockFrom.mockReturnValueOnce(insertQb);

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await notifyGracePeriodEnding("user-1", "firm-1", metadata);

    expect(insertQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "periodo_carencia_terminando",
        message: expect.stringContaining("3 dia(s)"),
      })
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe("periodo_carencia_terminando");
  });
});
