import { getAppContext } from "@/lib/auth/context";
import { getProfessionals, getServices, getBookings } from "@/lib/formularios/queries";
import { PageHeader } from "@/components/page-header";
import { MetricCard } from "@/components/metric-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const modalityLabels: Record<string, string> = {
  presencial: "Presencial",
  online: "Online",
  hibrido: "Hibrido",
};

export default async function AgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  let professionals: any[];
  let services: any[];
  let bookings: any[];
  try {
    const [profs, svcs, bookingsResult] = await Promise.all([
      getProfessionals(context, { isActive: true }),
      getServices(context, { isActive: true }),
      getBookings(context, undefined, 1, 20),
    ]);
    professionals = profs;
    services = svcs;
    bookings = bookingsResult.bookings;
  } catch {
    console.error("[formularios-avancados/agendamento] Falha ao carregar dados — migrations podem não estar aplicadas");
    professionals = [];
    services = [];
    bookings = [];
  }

  const confirmedCount = bookings.filter((b) => b.status === "confirmado").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agendamento de Atendimentos"
        description="Gerencie profissionais, servicos e agendamentos de atendimentos."
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Agendamento criado com sucesso.
          </CardContent>
        </Card>
      )}
      {params.erro && (
        <Card className="rounded-lg border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 text-sm text-destructive">
            {params.erro === "permissao"
              ? "Seu papel nao tem permissao para esta operacao."
              : "Nao foi possivel concluir a operacao."}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Profissionais Ativos"
          value={professionals.length}
          format="integer"
          detail="Profissionais disponiveis"
        />
        <MetricCard
          label="Servicos Disponiveis"
          value={services.length}
          format="integer"
          detail="Servicos cadastrados"
        />
        <MetricCard
          label="Agendamentos Confirmados"
          value={confirmedCount}
          format="integer"
          detail="Ultimos agendamentos"
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Profissionais</CardTitle>
          </CardHeader>
          <CardContent>
            {professionals.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum profissional cadastrado.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Especialidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professionals.map((prof) => (
                    <TableRow key={prof.id}>
                      <TableCell className="font-medium">
                        {prof.displayName}
                      </TableCell>
                      <TableCell>{prof.specialty ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Servicos</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum servico cadastrado.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Duracao</TableHead>
                    <TableHead>Modalidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.map((svc) => (
                    <TableRow key={svc.id}>
                      <TableCell className="font-medium">{svc.name}</TableCell>
                      <TableCell>{svc.durationMinutes} min</TableCell>
                      <TableCell>
                        {modalityLabels[svc.modality] ?? svc.modality}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Proximos Agendamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhum agendamento registrado.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Os agendamentos aparecerao aqui quando forem realizados.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observacoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="font-medium">{booking.clientName}</div>
                      {booking.clientEmail && (
                        <p className="text-xs text-muted-foreground">
                          {booking.clientEmail}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(booking.bookingDate).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {booking.startTime} — {booking.endTime}
                    </TableCell>
                    <TableCell>
                      {modalityLabels[booking.modality] ?? booking.modality}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={booking.status} />
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {booking.notes ?? "—"}
                    </TableCell>
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
