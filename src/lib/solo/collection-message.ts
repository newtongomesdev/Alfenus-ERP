import { formatCurrencyFromCents } from "@/lib/formatters";

export function buildCollectionMessage(input: {
  clientName: string | null;
  contractDescription: string | null;
  installmentNumber: number;
  remainingAmountCents: number;
  dueDate: string;
}) {
  const clientGreeting = input.clientName ? `, ${input.clientName}` : "";
  const service = input.contractDescription?.trim() || "honorários";
  const dueDate = new Date(`${input.dueDate}T12:00:00`);
  const formattedDueDate = new Intl.DateTimeFormat("pt-BR").format(dueDate);

  return `Olá${clientGreeting}. Passando para lembrar sobre a parcela ${input.installmentNumber} de ${service}, no valor em aberto de ${formatCurrencyFromCents(input.remainingAmountCents)}, vencida em ${formattedDueDate}.\n\nCaso já tenha efetuado o pagamento, por favor desconsidere esta mensagem. Se precisar, posso enviar os detalhes da cobrança.`;
}
