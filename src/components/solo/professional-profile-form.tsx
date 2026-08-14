"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRACTICE_AREAS } from "@/lib/solo/constants";
import { saveProfessionalProfileAction } from "@/lib/solo/actions";
import type { ProfessionalProfileRow } from "@/lib/solo/types";

const ENTITY_TYPES = [
  { value: "pessoa_fisica", label: "Pessoa física" },
  { value: "sociedade_individual", label: "Sociedade individual" },
  { value: "sociedade_advogados", label: "Sociedade de advogados" },
  { value: "sem_cnpj", label: "Sem CNPJ informado" },
];

const OAB_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function ProfessionalProfileForm({ profile }: { profile?: ProfessionalProfileRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    professional_name: (profile as any)?.professional_name ?? "",
    office_name: (profile as any)?.office_name ?? "",
    oab_number: (profile as any)?.oab_number ?? "",
    oab_state: (profile as any)?.oab_state ?? "SP",
    practice_areas: (profile as any)?.practice_areas ?? [],
    phone: (profile as any)?.phone ?? "",
    whatsapp: (profile as any)?.whatsapp ?? "",
    email: (profile as any)?.email ?? "",
    address: (profile as any)?.address ?? "",
    primary_color: (profile as any)?.primary_color ?? "#1e40af",
    secondary_color: (profile as any)?.secondary_color ?? "#3b82f6",
    document_footer: (profile as any)?.document_footer ?? "",
    entity_type: (profile as any)?.entity_type ?? "pessoa_fisica",
  });

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  function toggleArea(area: string) {
    setForm((prev) => ({
      ...prev,
      practice_areas: prev.practice_areas.includes(area)
        ? prev.practice_areas.filter((a: string) => a !== area)
        : [...prev.practice_areas, area],
    }));
  }

  async function handleSave() {
    setSaving(true);
    const result = await saveProfessionalProfileAction(form);
    setSaving(false);
    if (result.ok) {
      router.push("/configuracoes");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados pessoais e profissionais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nome profissional</Label>
              <Input value={form.professional_name} onChange={(e) => update("professional_name", e.target.value)} placeholder="Dr(a). João Silva" />
            </div>
            <div>
              <Label>Nome do escritório</Label>
              <Input value={form.office_name} onChange={(e) => update("office_name", e.target.value)} placeholder="Silva Advocacia" />
            </div>
            <div>
              <Label>Número da OAB</Label>
              <Input value={form.oab_number} onChange={(e) => update("oab_number", e.target.value)} placeholder="123456" />
            </div>
            <div>
              <Label>Estado da OAB</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.oab_state} onChange={(e) => update("oab_state", e.target.value)}>
                {OAB_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Tipo de pessoa</Label>
            <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.entity_type} onChange={(e) => update("entity_type", e.target.value)}>
              {ENTITY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => update("whatsapp", e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => update("email", e.target.value)} />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => update("address", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Áreas de atuação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PRACTICE_AREAS.map((area) => (
              <Button
                key={area.key}
                variant={form.practice_areas.includes(area.key) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleArea(area.key)}
              >
                {area.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identidade visual e documentos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Cor principal</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} className="size-9 rounded border" />
                <Input value={form.primary_color} onChange={(e) => update("primary_color", e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Cor secundária</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} className="size-9 rounded border" />
                <Input value={form.secondary_color} onChange={(e) => update("secondary_color", e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <Label>Rodapé para documentos</Label>
            <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.document_footer} onChange={(e) => update("document_footer", e.target.value)} placeholder="Texto que aparece no rodapé de recibos, propostas e documentos..." />
          </div>
          <p className="text-xs text-muted-foreground">
            Essas informações preenchem automaticamente propostas, contratos, recibos e documentos gerados.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
    </div>
  );
}
