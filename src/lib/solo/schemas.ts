import { z } from "zod";

export const soloCaseInputSchema = z.object({
  existingClientId: z.string().uuid().nullable(),
  clientName: z.string().trim().max(160),
  clientPhone: z.string().trim().max(40),
  clientEmail: z.string().trim().max(254),
  clientDocument: z.string().trim().max(40),
  clientInterestArea: z.string().trim().max(80),
  caseTitle: z.string().trim().min(2).max(240),
  caseKind: z.enum(["judicial", "extrajudicial"]),
  caseNumber: z.string().trim().max(80),
  actionType: z.string().trim().min(2).max(160),
  opposingParty: z.string().trim().max(240),
  notes: z.string().trim().max(4000),
  createContract: z.boolean(),
  contractServiceDescription: z.string().trim().max(1000),
  contractTotalAmountCents: z.number().int().nonnegative(),
  contractUpfrontAmountCents: z.number().int().nonnegative(),
  contractInstallmentsCount: z.number().int().min(1).max(60),
  contractFirstDueDate: z.string().date().nullable(),
  contractPaymentMethod: z.string().trim().max(80),
  createDeadline: z.boolean(),
  deadlineTitle: z.string().trim().max(240),
  deadlineDate: z.string().date().nullable(),
  deadlinePriority: z.enum(["baixa", "normal", "alta", "urgente"]),
}).superRefine((input, ctx) => {
  if (!input.existingClientId && input.clientName.length < 2) {
    ctx.addIssue({ code: "custom", path: ["clientName"], message: "Informe o cliente." });
  }
  if (input.caseKind === "judicial" && !input.caseNumber) {
    ctx.addIssue({ code: "custom", path: ["caseNumber"], message: "Informe o número do processo judicial." });
  }
  if (input.createContract) {
    if (input.contractServiceDescription.length < 5) {
      ctx.addIssue({ code: "custom", path: ["contractServiceDescription"], message: "Descreva o serviço contratado." });
    }
    if (input.contractTotalAmountCents <= 0 || input.contractUpfrontAmountCents > input.contractTotalAmountCents) {
      ctx.addIssue({ code: "custom", path: ["contractTotalAmountCents"], message: "Revise os valores do contrato." });
    }
    if (!input.contractFirstDueDate || input.contractPaymentMethod.length < 2) {
      ctx.addIssue({ code: "custom", path: ["contractFirstDueDate"], message: "Informe vencimento e forma de pagamento." });
    }
  }
  if (input.createDeadline && (!input.deadlineDate || input.deadlineTitle.length < 3)) {
    ctx.addIssue({ code: "custom", path: ["deadlineTitle"], message: "Informe título e data do prazo." });
  }
});

export type SoloCaseInput = z.input<typeof soloCaseInputSchema>;
