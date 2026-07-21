import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getCalendarEvents } from "@/lib/prazos/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import {
  createCalendarEventAction,
  deleteCalendarEventAction,
} from "./actions";

const eventTypeLabels: Record<string, string> = {
  feriado: "Feriado",
  recesso: "Recesso",
  suspensao: "Suspensão",
  indisponibilidade: "Indisponibilidade",
  sem_expediente: "Sem Expediente",
};

export default async function CalendariosPage() {
  const context = await getAppContext();
  let events: any[];
  try {
    events = await getCalendarEvents(context);
  } catch {
    console.error("[prazos/calendarios] Falha ao carregar dados — migrations podem não estar aplicadas");
    events = [];
  }
  const canManage = can(context.member?.role ?? "visualizador", "prazos.criar");

  const groupedByType = events.reduce(
    (acc, ev) => {
      acc[ev.eventType] = acc[ev.eventType] ?? [];
      acc[ev.eventType].push(ev);
      return acc;
    },
    {} as Record<string, typeof events>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendários Judiciais"
        description="Gerencie feriados, recessos e suspensões que afetam o cálculo de prazos."
        actions={
          <a
            href="/prazos/calculos"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted transition"
          >
            Voltar
          </a>
        }
      />

      {canManage && (
        <Card className="rounded-lg max-w-3xl">
          <CardHeader>
            <CardTitle>Novo Evento</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCalendarEventAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="calendarId">Calendário ID *</Label>
                  <Input
                    id="calendarId"
                    name="calendarId"
                    placeholder="UUID do calendário"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="eventName">Nome do Evento *</Label>
                  <Input
                    id="eventName"
                    name="eventName"
                    placeholder="Ex.: Natal, Recesso Forense"
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Tipo</Label>
                  <select
                    id="eventType"
                    name="eventType"
                    defaultValue="feriado"
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <option value="feriado">Feriado</option>
                    <option value="recesso">Recesso</option>
                    <option value="suspensao">Suspensão</option>
                    <option value="indisponibilidade">
                      Indisponibilidade
                    </option>
                    <option value="sem_expediente">Sem Expediente</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data Início *</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data Fim *</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Detalhes sobre o evento"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
              >
                Adicionar Evento
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Eventos Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhum evento cadastrado.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adicione feriados e suspensões para que o motor considere-os nos
                cálculos.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Fim</TableHead>
                  {canManage && <TableHead className="text-right">Ação</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell>
                      <div className="font-medium">{ev.eventName}</div>
                      {ev.description && (
                        <div className="text-xs text-muted-foreground">
                          {ev.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        value={
                          eventTypeLabels[ev.eventType] ?? ev.eventType
                        }
                      />
                    </TableCell>
                    <TableCell>{ev.startDate}</TableCell>
                    <TableCell>{ev.endDate}</TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <form action={deleteCalendarEventAction} className="inline">
                          <input
                            type="hidden"
                            name="eventId"
                            value={ev.id}
                          />
                          <button
                            type="submit"
                            className="text-xs font-medium text-destructive underline-offset-4 hover:underline"
                          >
                            Remover
                          </button>
                        </form>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
