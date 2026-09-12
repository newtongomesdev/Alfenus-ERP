import { getAppContext } from "@/lib/auth/context";
import { getSeizures } from "@/lib/risco/queries";
import { brlFormatter } from "@/lib/formatters";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
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
import { createSeizureAction } from "../actions";

const seizureTypeLabels: Record<string, string> = {
  penhor: "Penhor",
  sequestro: "Sequestro",
  indisponibilidade: "Indisponibilidade",
  falencia: "Falencia",
  recuperação_judicial: "Recuperacao Judicial",
  outro: "Outro",
};

const assetTypeLabels: Record<string, string> = {
  imovel: "Imovel",
  veiculo: "Veiculo",
  conta_bancaria: "Conta Bancaria",
  titulo: "Titulo",
  acoes: "Acoes",
  maquinas_equipamentos: "Maquinas/Equipamentos",
  estoque: "Estoque",
  outro: "Outro",
};

export default async function BloqueiosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    status?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  let seizures: any[];
  let total: number;
  try {
    ({ seizures, total } = await getSeizures(
      context,
      params.status ? { status: params.status } : undefined,
      page,
      PAGE_SIZE
    ));
  } catch {
    console.error("[risco/bloqueios] Falha ao carregar dados — migrations podem não estar aplicadas");
    seizures = [];
    total = 0;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeSeizures = seizures.filter((s) => s.status === "ativo");
  const totalBlockedValue = activeSeizures.reduce(
    (sum, s) => sum + (s.assetValue ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bloqueios e Penhoras"
        description="Gestao de bloqueios judiciais, sequestros e indisponibilidades de bens."
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Bloqueio registrado com sucesso.
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
        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Total de Bloqueios
            </p>
            <p className="text-2xl font-semibold">{total}</p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ativos</p>
            <p className="text-2xl font-semibold">
              {activeSeizures.length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Valor Total Bloqueado
            </p>
            <p className="text-2xl font-semibold">
              {brlFormatter.format(totalBlockedValue)}
            </p>
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          { label: "Todos", value: "" },
          { label: "Ativo", value: "ativo" },
          { label: "Liberado", value: "liberado" },
          { label: "Parcial", value: "parcial" },
        ].map((f) => (
          <a
            key={f.value}
            href={f.value ? `/risco/bloqueios?status=${f.value}` : "/risco/bloqueios"}
            className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition ${
              (params.status ?? "") === f.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Lista de Bloqueios</CardTitle>
        </CardHeader>
        <CardContent>
          {seizures.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">
                Nenhum bloqueio registrado.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Registre um bloqueio para comecar a controlar
                indisponibilidades de bens.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Bem</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Data Ordem</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seizures.map((seizure) => (
                  <TableRow key={seizure.id}>
                    <TableCell>
                      <div className="font-medium">
                        {seizureTypeLabels[seizure.seizureType] ??
                          seizure.seizureType}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {assetTypeLabels[seizure.assetType] ??
                          seizure.assetType}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {seizure.assetDescription ?? "—"}
                    </TableCell>
                    <TableCell>
                      {seizure.assetValue
                        ? brlFormatter.format(seizure.assetValue)
                        : "—"}
                    </TableCell>
                    <TableCell>{seizure.entity ?? "—"}</TableCell>
                    <TableCell>
                      {seizure.orderDate
                        ? new Date(
                            seizure.orderDate
                          ).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={seizure.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg max-w-3xl">
        <CardHeader>
          <CardTitle>Novo Bloqueio</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={createSeizureAction.bind(null, "/risco/bloqueios")}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tipo de Bloqueio *
                </label>
                <select
                  name="seizureType"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="penhor">Penhor</option>
                  <option value="sequestro">Sequestro</option>
                  <option value="indisponibilidade">
                    Indisponibilidade
                  </option>
                  <option value="falencia">Falencia</option>
                  <option value="recuperacao_judicial">
                    Recuperacao Judicial
                  </option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tipo do Bem *
                </label>
                <select
                  name="assetType"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="imovel">Imovel</option>
                  <option value="veiculo">Veiculo</option>
                  <option value="conta_bancaria">Conta Bancaria</option>
                  <option value="titulo">Titulo</option>
                  <option value="acoes">Acoes</option>
                  <option value="maquinas_equipamentos">
                    Maquinas/Equipamentos
                  </option>
                  <option value="estoque">Estoque</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Descricao do Bem
                </label>
                <input
                  name="assetDescription"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  placeholder="Descricao detalhada do bem"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Valor do Bem (R$)
                </label>
                <input
                  name="assetValue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entidade</label>
                <input
                  name="entity"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  placeholder="Ex.: Banco Itau, Caixa Federal"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Data da Ordem
                </label>
                <input
                  name="orderDate"
                  type="date"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Observacoes
              </label>
              <textarea
                name="notes"
                rows={3}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
                placeholder="Detalhes sobre o bloqueio."
              />
            </div>
            <button
              type="submit"
              className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Registrar Bloqueio
            </button>
          </form>
        </CardContent>
      </Card>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/risco/bloqueios"
        totalRecords={total}
      />
    </div>
  );
}
