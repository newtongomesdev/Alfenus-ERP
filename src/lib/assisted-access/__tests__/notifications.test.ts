import { describe, expect, it, vi, beforeEach } from "vitest";

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
const mockSelect = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockReturnThis();
const mockIn = vi.fn().mockReturnThis();

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn().mockResolvedValue({
    from: vi.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      eq: mockEq,
      in: mockIn,
    })),
  }),
}));

import {
  notifyAccessRequested,
  notifyAccessApproved,
  notifyAccessRejected,
  notifyAccessRevoked,
  notifyAccessExpiring,
} from "../notifications";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// ── Helpers ─────────────────────────────────────────────────────────────────

const LAW_FIRM_ID = "firm-123";
const OPERATOR_ID = "operator-456";
const REQUEST_ID = "req-789";
const SESSION_ID = "sess-abc";
const TICKET_PROTOCOL = "SUP-2025-0001";
const OPERATOR_NAME = "João da Silva";

function getMockClient() {
  return vi.mocked(getSupabaseServerClient);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ data: {}, error: null });
  });

  // ── notifyAccessRequested ──────────────────────────────────────────────

  describe("notifyAccessRequested", () => {
    it("cria notificações para todos os administradores do tenant", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { user_id: "admin-1" },
                  { user_id: "admin-2" },
                  { user_id: "admin-3" },
                ],
                error: null,
              }),
            }),
          }),
        }),
        insert: mockInsert,
      });

      const mockSupabase = { from: mockFrom };
      getMockClient().mockResolvedValue(mockSupabase as any);

      await notifyAccessRequested(LAW_FIRM_ID, REQUEST_ID, OPERATOR_NAME, TICKET_PROTOCOL);

      // Deve buscar admins
      expect(mockFrom).toHaveBeenCalledWith("law_firm_members");
      // Deve inserir 3 notificações (1 por admin)
      expect(mockInsert).toHaveBeenCalledTimes(3);

      const firstCall = mockInsert.mock.calls[0][0];
      expect(firstCall.law_firm_id).toBe(LAW_FIRM_ID);
      expect(firstCall.user_id).toBe("admin-1");
      expect(firstCall.type).toBe("acesso_assistido_solicitado");
      expect(firstCall.title).toBe("Nova solicitação de acesso assistido");
      expect(firstCall.message).toContain(OPERATOR_NAME);
      expect(firstCall.message).toContain(TICKET_PROTOCOL);
    });

    it("não insere nada se não houver administradores", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        insert: mockInsert,
      });

      const mockSupabase = { from: mockFrom };
      getMockClient().mockResolvedValue(mockSupabase as any);

      await notifyAccessRequested(LAW_FIRM_ID, REQUEST_ID, OPERATOR_NAME, TICKET_PROTOCOL);

      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("não faz nada se supabase estiver indisponível", async () => {
      getMockClient().mockResolvedValue(null);

      await expect(
        notifyAccessRequested(LAW_FIRM_ID, REQUEST_ID, OPERATOR_NAME, TICKET_PROTOCOL),
      ).resolves.toBeUndefined();
    });
  });

  // ── notifyAccessApproved ───────────────────────────────────────────────

  describe("notifyAccessApproved", () => {
    it("cria notificação para o operador quando aprovação", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const mockSupabase = { from: mockFrom };
      getMockClient().mockResolvedValue(mockSupabase as any);

      await notifyAccessApproved(LAW_FIRM_ID, OPERATOR_ID, REQUEST_ID);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const call = mockInsert.mock.calls[0][0];
      expect(call.user_id).toBe(OPERATOR_ID);
      expect(call.type).toBe("acesso_assistido_aprovado");
      expect(call.title).toBe("Solicitação de acesso aprovada");
      expect(call.message).toContain("aprovada");
    });

    it("não faz nada se supabase estiver indisponível", async () => {
      getMockClient().mockResolvedValue(null);

      await expect(
        notifyAccessApproved(LAW_FIRM_ID, OPERATOR_ID, REQUEST_ID),
      ).resolves.toBeUndefined();
    });
  });

  // ── notifyAccessRejected ───────────────────────────────────────────────

  describe("notifyAccessRejected", () => {
    it("cria notificação para o operador quando rejeição", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const mockSupabase = { from: mockFrom };
      getMockClient().mockResolvedValue(mockSupabase as any);

      await notifyAccessRejected(LAW_FIRM_ID, OPERATOR_ID, REQUEST_ID);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const call = mockInsert.mock.calls[0][0];
      expect(call.user_id).toBe(OPERATOR_ID);
      expect(call.type).toBe("acesso_assistido_recusado");
      expect(call.title).toBe("Solicitação de acesso recusada");
      expect(call.message).toContain("recusada");
    });

    it("não faz nada se supabase estiver indisponível", async () => {
      getMockClient().mockResolvedValue(null);

      await expect(
        notifyAccessRejected(LAW_FIRM_ID, OPERATOR_ID, REQUEST_ID),
      ).resolves.toBeUndefined();
    });
  });

  // ── notifyAccessRevoked ────────────────────────────────────────────────

  describe("notifyAccessRevoked", () => {
    it("cria notificação para o operador quando revogação", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
      });

      const mockSupabase = { from: mockFrom };
      getMockClient().mockResolvedValue(mockSupabase as any);

      await notifyAccessRevoked(LAW_FIRM_ID, OPERATOR_ID, SESSION_ID);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const call = mockInsert.mock.calls[0][0];
      expect(call.user_id).toBe(OPERATOR_ID);
      expect(call.type).toBe("acesso_assistido_revogado");
      expect(call.title).toBe("Sessão de acesso revogada");
      expect(call.message).toContain("revogada");
    });

    it("não faz nada se supabase estiver indisponível", async () => {
      getMockClient().mockResolvedValue(null);

      await expect(
        notifyAccessRevoked(LAW_FIRM_ID, OPERATOR_ID, SESSION_ID),
      ).resolves.toBeUndefined();
    });
  });

  // ── notifyAccessExpiring ───────────────────────────────────────────────

  describe("notifyAccessExpiring", () => {
    it("cria notificações para operador e administradores quando expirando", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ user_id: "admin-1" }],
                error: null,
              }),
            }),
          }),
        }),
        insert: mockInsert,
      });

      const mockSupabase = { from: mockFrom };
      getMockClient().mockResolvedValue(mockSupabase as any);

      await notifyAccessExpiring(LAW_FIRM_ID, OPERATOR_ID, SESSION_ID, 5);

      // 1 notificação para o operador + 1 para o admin = 2
      expect(mockInsert).toHaveBeenCalledTimes(2);

      const operatorNotification = mockInsert.mock.calls[0][0];
      expect(operatorNotification.user_id).toBe(OPERATOR_ID);
      expect(operatorNotification.type).toBe("acesso_assistido_expirando");
      expect(operatorNotification.message).toContain("5 minutos");

      const adminNotification = mockInsert.mock.calls[1][0];
      expect(adminNotification.user_id).toBe("admin-1");
      expect(adminNotification.type).toBe("acesso_assistido_expirando");
    });

    it("usa '1 minuto' (singular) quando minutesLeft é 1", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        insert: mockInsert,
      });

      const mockSupabase = { from: mockFrom };
      getMockClient().mockResolvedValue(mockSupabase as any);

      await notifyAccessExpiring(LAW_FIRM_ID, OPERATOR_ID, SESSION_ID, 1);

      expect(mockInsert).toHaveBeenCalledTimes(1);
      const call = mockInsert.mock.calls[0][0];
      expect(call.message).toContain("1 minuto");
    });

    it("não faz nada se supabase estiver indisponível", async () => {
      getMockClient().mockResolvedValue(null);

      await expect(
        notifyAccessExpiring(LAW_FIRM_ID, OPERATOR_ID, SESSION_ID, 10),
      ).resolves.toBeUndefined();
    });
  });

  // ── Validação da estrutura das notificações ────────────────────────────

  describe("Estrutura das notificações", () => {
    it("todas as funções definem is_read como false por padrão", async () => {
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        insert: mockInsert,
      });

      const mockSupabase = { from: mockFrom };
      getMockClient().mockResolvedValue(mockSupabase as any);

      // Chamar notifyAccessRequested sem administradores — não deve inserir
      await notifyAccessRequested(LAW_FIRM_ID, REQUEST_ID, OPERATOR_NAME, TICKET_PROTOCOL);
      expect(mockInsert).not.toHaveBeenCalled();

      // Reset e testar com admin
      vi.clearAllMocks();
      mockInsert.mockResolvedValue({ data: {}, error: null });

      const mockFrom2 = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ user_id: "admin-1" }],
                error: null,
              }),
            }),
          }),
        }),
        insert: mockInsert,
      });
      getMockClient().mockResolvedValue({ from: mockFrom2 } as any);

      await notifyAccessRequested(LAW_FIRM_ID, REQUEST_ID, OPERATOR_NAME, TICKET_PROTOCOL);
      expect(mockInsert).toHaveBeenCalledTimes(1);
      expect(mockInsert.mock.calls[0][0].is_read).toBe(false);
    });
  });
});
