import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const integerFormatter = new Intl.NumberFormat("pt-BR");

export function formatCurrencyFromCents(valueInCents: number) {
  return brlFormatter.format(valueInCents / 100);
}

export function formatDate(value: string | Date) {
  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(value: string | Date) {
  return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}
