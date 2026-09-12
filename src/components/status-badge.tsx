import { Badge } from "@/components/ui/badge";

const labelByStatus: Record<string, string> = {
  // Lead statuses
  pendente: "Pendente",
  novo: "Novo",
  em_atendimento: "Em atendimento",
  qualificado: "Qualificado",
  convertido: "Convertido",
  perdido: "Perdido",
  // Case statuses
  em_analise: "Em análise",
  documentacao_pendente: "Documentação pendente",
  ajuizamento: "Ajuizamento",
  aguardando_decisao: "Aguardando decisão",
  audiencia_marcada: "Audiência marcada",
  suspenso: "Suspenso",
  arquivado: "Arquivado",
  encerrado: "Encerrado",
  em_andamento: "Em andamento",
  // Generic statuses
  concluido: "Concluído",
  vencido: "Vencido",
  cancelado: "Cancelado",
  recebido: "Recebido",
  armazenado: "Armazenado",
  lida: "Lida",
  // Priority
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
  // Contract statuses
  rascunho: "Rascunho",
  aguardando_assinatura: "Aguardando assinatura",
  ativo: "Ativo",
  quitado: "Quitado",
  inadimplente: "Inadimplente",
  // Installment statuses
  vencendo: "Vencendo",
  atrasada: "Atrasada",
  parcialmente_paga: "Parcialmente paga",
  paga: "Paga",
  pago: "Pago",
  // Appointment statuses
  agendado: "Agendado",
  // Client/member statuses
  inativo: "Inativo",
  // Expense statuses
  expirado: "Expirado",
  aceito: "Aceito",
  // Financial statuses
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  gerado: "Gerado",
  revisado: "Revisado",
  // CLM statuses
  solicitacao: "Solicitação",
  triagem: "Triagem",
  minuta: "Minuta",
  revisao: "Revisão",
  negociacao: "Negociação",
  aprovacao: "Aprovação",
  assinatura_pendente: "Assinatura pendente",
  renovacao: "Renovação",
  encerramento: "Encerramento",
  rescindido: "Rescindido",
  // Obligation statuses
  concluida: "Concluída",
  isenta: "Isenta",
  pendente_aprovacao: "Pendente aprovação",
  // Scheduling statuses
  confirmado: "Confirmado",
};

export function StatusBadge({ value }: { value: string }) {
  const isUrgent = ["urgente", "vencido", "atrasada"].includes(value);
  const isDone = ["concluido", "paga", "quitado"].includes(value);

  return (
    <Badge variant={isUrgent ? "destructive" : isDone ? "secondary" : "outline"}>
      {labelByStatus[value] ?? value}
    </Badge>
  );
}
