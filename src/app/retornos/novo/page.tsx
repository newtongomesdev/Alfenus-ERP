"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFollowUpAction } from "@/lib/solo/actions";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

const FOLLOW_UP_TYPES = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "reuniao", label: "Reunião" },
  { value: "visita", label: "Visita" },
  { value: "outro", label: "Outro" },
];

const PRIORITY_LEVELS = [
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export default function NovoRetornoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_id: "",
    title: "",
    description: "",
    follow_up_type: "ligacao",
    scheduled_date: new Date().toISOString().split("T")[0],
    scheduled_time: "",
    priority: "normal",
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createFollowUpAction({
      ...formData,
      client_id: formData.client_id || "00000000-0000-0000-0000-000000000000",
    });

    if (result.ok) {
      router.push("/retornos");
    } else {
      setError(result.error ?? "Erro ao criar retorno");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/retornos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="size-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Novo retorno</h1>
            <p className="text-sm text-muted-foreground">Agende um retorno com cliente.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações do retorno</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Retorno sobre proposta"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="follow_up_type">Tipo de contato *</Label>
                  <select
                    id="follow_up_type"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={formData.follow_up_type}
                    onChange={(e) => setFormData({ ...formData, follow_up_type: e.target.value })}
                  >
                    {FOLLOW_UP_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <select
                    id="priority"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {PRIORITY_LEVELS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_date">Data *</Label>
                  <Input
                    id="scheduled_date"
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled_time">Horário</Label>
                  <Input
                    id="scheduled_time"
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <textarea
                  id="description"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalhes sobre o retorno..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link href="/retornos">
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  <Save className="size-4 mr-2" />
                  {loading ? "Salvando..." : "Agendar retorno"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
