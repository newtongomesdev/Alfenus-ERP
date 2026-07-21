import Link from "next/link";
import { getAppContext } from "@/lib/auth/context";
import {
  getGuarantees,
  getDeposits,
} from "@/lib/risco/queries";
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
import { createGuaranteeAction, createDepositAction } from "../actions";

const guaranteeTypeLabels: Record<string, string> = {
  caucao: "Caucao",
  penhor: "Penhor",
  hipoteca: "Hipoteca",
  aval: "Aval",
  seguro: "Seguro",
  deposito_judicial: "Deposito Judicial",
  outro: "Outro",
};

const depositTypeLabels: Record<string, string> = {
  deposito_judicial: "Deposito Judicial",
  deposito_compensatorio: "Dep. Compensatorio",
  deposito_cautelar: "Dep. Cautelar",
  deposito_avulso: "Dep. Avulso",
  outro: "Outro",
};

export default async function GarantiasPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    aba?: string;
    criado?: string;
    erro?: string;
  }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));
  const aba = params.aba ?? "garantias";

  const [guaranteesResult, depositsResult] = await Promise.all([
    getGuarantees(context, undefined, page, PAGE_SIZE),
    getDeposits(context, undefined, page, PAGE_SIZE),
  ]);

  const guaranteeTotalPages = Math.max(
    1,
    Math.ceil(guaranteesResult.total / PAGE_SIZE)
  );
  const depositTotalPages = Math.max(
    1,
    Math.ceil(depositsResult.total / PAGE_SIZE)
  );

  const totalGuaranteeValue = guaranteesResult.guarantees.reduce(
    (sum, g) => sum + g.value,
    0
  );
  const totalDepositValue = depositsResult.deposits.reduce(
    (sum, d) => sum + d.value,
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Garantias e Depositos"
        description="Gestao de garantias judiciais, caucoes e depositos processuais."
      />

      {params.criado && (
        <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
          <CardContent className="p-4 text-sm">
            Registro criado com sucesso.
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

      <div className="flex gap-2">
        <Link
          href="/risco/garantias?aba=garantias"
          className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition ${
            aba === "garantias"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-muted"
          }`}
        >
          Garantias
        </Link>
        <Link
          href="/risco/garantias?aba=depositos"
          className={`inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition ${
            aba === "depositos"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border hover:bg-muted"
          }`}
        >
          Depositos
        </Link>
      </div>

      {aba === "garantias" ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="rounded-lg">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Total de Garantias
                </p>
                <p className="text-2xl font-semibold">
                  {guaranteesResult.total}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-lg">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Valor Total Garantido
                </p>
                <p className="text-2xl font-semibold">
                  {brlFormatter.format(totalGuaranteeValue)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Garantias Judiciais</span>
                <a
                  href="#nova-garantia"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  + Nova Garantia
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {guaranteesResult.guarantees.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="font-medium">
                    Nenhuma garantia registrada.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guaranteesResult.guarantees.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell>
                          {guaranteeTypeLabels[g.guaranteeType] ??
                            g.guaranteeType}
                        </TableCell>
                        <TableCell>
                          {brlFormatter.format(g.value)}
                        </TableCell>
                        <TableCell>{g.bank ?? "—"}</TableCell>
                        <TableCell>
                          {g.validityDate
                            ? new Date(g.validityDate).toLocaleDateString(
                                "pt-BR"
                              )
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge value={g.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card
            id="nova-garantia"
            className="rounded-lg max-w-3xl"
          >
            <CardHeader>
              <CardTitle>Nova Garantia</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={createGuaranteeAction.bind(null, "/risco/garantias?aba=garantias")}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Tipo de Garantia *
                    </label>
                    <select
                      name="guaranteeType"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="caucao">Caucao</option>
                      <option value="penhor">Penhor</option>
                      <option value="hipoteca">Hipoteca</option>
                      <option value="aval">Aval</option>
                      <option value="seguro">Seguro</option>
                      <option value="deposito_judicial">
                        Deposito Judicial
                      </option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Valor (R$) *
                    </label>
                    <input
                      name="value"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0,00"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    />
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
                      placeholder="Descricao do bem em garantia"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Banco</label>
                    <input
                      name="bank"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Data de Validade
                    </label>
                    <input
                      name="validityDate"
                      type="date"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Observacoes
                    </label>
                    <input
                      name="notes"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                >
                  Salvar Garantia
                </button>
              </form>
            </CardContent>
          </Card>

          <Pagination
            currentPage={page}
            totalPages={guaranteeTotalPages}
            basePath="/risco/garantias?aba=garantias"
            totalRecords={guaranteesResult.total}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Card className="rounded-lg">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Total de Depositos
                </p>
                <p className="text-2xl font-semibold">
                  {depositsResult.total}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-lg">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Valor Total Depositado
                </p>
                <p className="text-2xl font-semibold">
                  {brlFormatter.format(totalDepositValue)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Depositos Judiciais</CardTitle>
            </CardHeader>
            <CardContent>
              {depositsResult.deposits.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="font-medium">
                    Nenhum deposito registrado.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Banco</TableHead>
                      <TableHead>Beneficiario</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {depositsResult.deposits.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>
                          {depositTypeLabels[d.depositType] ??
                            d.depositType}
                        </TableCell>
                        <TableCell>
                          {brlFormatter.format(d.value)}
                        </TableCell>
                        <TableCell>{d.bank ?? "—"}</TableCell>
                        <TableCell>{d.beneficiary ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge value={d.status} />
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
              <CardTitle>Novo Deposito</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                action={createDepositAction.bind(null, "/risco/garantias?aba=depositos")}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Tipo de Deposito *
                    </label>
                    <select
                      name="depositType"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                      required
                    >
                      <option value="">Selecione</option>
                      <option value="deposito_judicial">
                        Deposito Judicial
                      </option>
                      <option value="deposito_compensatorio">
                        Dep. Compensatorio
                      </option>
                      <option value="deposito_cautelar">
                        Dep. Cautelar
                      </option>
                      <option value="deposito_avulso">
                        Dep. Avulso
                      </option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Valor (R$) *
                    </label>
                    <input
                      name="value"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0,00"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Banco</label>
                    <input
                      name="bank"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Beneficiario
                    </label>
                    <input
                      name="beneficiary"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Data do Deposito
                    </label>
                    <input
                      name="depositDate"
                      type="date"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Instituicao
                    </label>
                    <input
                      name="institution"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                >
                  Salvar Deposito
                </button>
              </form>
            </CardContent>
          </Card>

          <Pagination
            currentPage={page}
            totalPages={depositTotalPages}
            basePath="/risco/garantias?aba=depositos"
            totalRecords={depositsResult.total}
          />
        </div>
      )}
    </div>
  );
}
