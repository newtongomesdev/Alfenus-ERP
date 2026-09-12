"use client";

import { useState } from "react";

type Signer = { signerType: "person" | "organization_representative" | "internal_witness" | "external_witness"; role: string; name: string; email: string; signingOrder: number; requiresIdentityVerification: boolean };
const blank = (): Signer => ({ signerType: "person", role: "contratante", name: "", email: "", signingOrder: 1, requiresIdentityVerification: false });

export function SignerEditor() {
  const [signers, setSigners] = useState<Signer[]>([blank()]);
  const update = (index: number, patch: Partial<Signer>) => setSigners((items) => items.map((item, current) => current === index ? { ...item, ...patch } : item));
  const move = (index: number, direction: -1 | 1) => setSigners((items) => { const target = index + direction; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next.map((item, order) => ({ ...item, signingOrder: order + 1 })); });
  return <div className="grid gap-3">
    <input type="hidden" name="signers" value={JSON.stringify(signers)} />
    {signers.map((signer, index) => <fieldset key={`${index}-${signer.email}`} className="grid gap-2 rounded border p-3">
      <legend className="px-1 text-sm font-medium">Signatário {index + 1}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Nome<input required name={`signers.${index}.name`} value={signer.name} onChange={(event) => update(index, { name: event.target.value })} className="rounded border p-2" /></label>
        <label className="grid gap-1 text-sm">E-mail<input required name={`signers.${index}.email`} type="email" value={signer.email} onChange={(event) => update(index, { email: event.target.value })} onBlur={(event) => update(index, { email: event.target.value.trim().toLowerCase() })} className="rounded border p-2" /></label>
        <label className="grid gap-1 text-sm">Telefone<input aria-label="Telefone" name={`signers.${index}.phone`} type="tel" value="" onChange={() => undefined} className="rounded border p-2" /></label>
        <p className="text-xs text-muted-foreground">E-mail é obrigatório para este envelope.</p>
        <label className="grid gap-1 text-sm">Papel<input required name={`signers.${index}.role`} value={signer.role} onChange={(event) => update(index, { role: event.target.value })} className="rounded border p-2" /></label>
        <label className="grid gap-1 text-sm">Tipo<select required name={`signers.${index}.signerType`} value={signer.signerType} onChange={(event) => update(index, { signerType: event.target.value as Signer["signerType"] })} className="rounded border p-2"><option value="person">Pessoa</option><option value="organization_representative">Representante de organização</option><option value="internal_witness">Testemunha interna</option><option value="external_witness">Testemunha externa</option></select></label>
        <input type="hidden" name={`signers.${index}.signingOrder`} value={signer.signingOrder} />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={`signers.${index}.requiresIdentityVerification`} checked={signer.requiresIdentityVerification} onChange={(event) => update(index, { requiresIdentityVerification: event.target.checked })} />Exigir verificação de identidade</label>
      <div className="flex flex-wrap gap-2"><button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => move(index, -1)} disabled={index === 0}>Subir</button><button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => move(index, 1)} disabled={index === signers.length - 1}>Descer</button>{signers.length > 1 ? <button type="button" className="rounded border px-2 py-1 text-sm" onClick={() => setSigners((items) => items.filter((_, current) => current !== index).map((item, order) => ({ ...item, signingOrder: order + 1 })))}>Remover</button> : null}</div>
    </fieldset>)}
    <button type="button" className="w-fit rounded border px-3 py-2 text-sm" onClick={() => setSigners((items) => [...items, { ...blank(), signingOrder: items.length + 1 }])}>Adicionar signatário</button>
  </div>;
}
