import { getAdminContext } from "@/lib/admin/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { savePlanSettings } from "./actions";

const ids = ["starter", "professional", "business"] as const;

export default async function AdminPlansPage() {
  const { adminClient } = await getAdminContext();
  const { data } = await (adminClient as any).from("plan_settings").select("id,name,description,price_cents,stripe_price_id").in("id", ids);
  const plans = ids.map((id) => data?.find((item: { id: string }) => item.id === id) ?? { id, name: id, description: "", price_cents: 0, stripe_price_id: "" });
  return <div className="space-y-6">
    <PageHeader title="Planos e preços" description="Defina os valores públicos e os preços Stripe usados pela plataforma." />
    <div className="grid gap-4 lg:grid-cols-3">{plans.map((plan) => <Card key={plan.id}>
      <CardHeader><CardTitle>{plan.name}</CardTitle><CardDescription>Identificador: {plan.id}</CardDescription></CardHeader>
      <CardContent><form action={savePlanSettings} className="space-y-4">
        <input type="hidden" name="id" value={plan.id} />
        <label className="block space-y-1 text-sm font-medium">Nome<input name="name" defaultValue={plan.name} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 font-normal" required /></label>
        <label className="block space-y-1 text-sm font-medium">Preço mensal (R$)<input name="priceCents" type="number" min="0" step="0.01" defaultValue={Number(plan.price_cents ?? 0) / 100} className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 font-normal" /></label>
        <label className="block space-y-1 text-sm font-medium">Descrição<textarea name="description" defaultValue={plan.description} rows={3} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 font-normal" /></label>
        <label className="block space-y-1 text-sm font-medium">Stripe Price ID<input name="stripePriceId" defaultValue={plan.stripe_price_id ?? ""} placeholder="price_..." className="mt-1 h-9 w-full rounded-lg border border-input bg-background px-3 font-normal" /></label>
        <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Salvar plano</button>
      </form></CardContent>
    </Card>)}</div>
  </div>;
}
