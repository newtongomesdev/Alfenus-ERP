"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, MessageSquare, Trash2, ExternalLink, Calendar, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/formatters";
import { revokePortalInviteAction } from "./actions";

interface Invite {
  id: string;
  token: string;
  email: string | null;
  status: string;
  expiresAt: string | null;
  lastAccessAt: string | null;
  createdAt: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
}

interface InvitesTableProps {
  invites: Invite[];
}

export function InvitesTable({ invites }: InvitesTableProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  async function handleCopy(token: string) {
    const fullUrl = `${window.location.origin}/portal/${token}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedToken(token);
      toast.success("Link copiado!", { description: "O link de acesso ao portal foi copiado." });
      setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      toast.error("Erro ao copiar", { description: "Não foi possível copiar o link." });
    }
  }

  function getWhatsAppShareUrl(invite: Invite) {
    const fullUrl = `${window.location.origin}/portal/${invite.token}`;
    const text = `Olá, ${invite.clientName}! Segue o link para acompanhar o andamento do seu caso no nosso Portal do Cliente: ${fullUrl}`;
    
    let cleanPhone = invite.clientPhone || "";
    cleanPhone = cleanPhone.replace(/\D/g, "");
    if (cleanPhone && !cleanPhone.startsWith("55") && cleanPhone.length <= 11) {
      cleanPhone = "55" + cleanPhone;
    }
    
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
  }

  function getStatusBadge(status: string, expiresAt: string | null) {
    const isExpired = expiresAt && new Date(expiresAt).getTime() < Date.now();
    if (status === "revogado") {
      return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Revogado</Badge>;
    }
    if (isExpired || status === "expirado") {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Expirado</Badge>;
    }
    return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Ativo</Badge>;
  }

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white overflow-hidden shadow-sm">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Link do Portal</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Último Acesso</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                Nenhum convite gerado até o momento.
              </TableCell>
            </TableRow>
          ) : (
            invites.map((invite) => {
              const shareUrl = getWhatsAppShareUrl(invite);
              const isLinkActive = invite.status === "ativo" && (!invite.expiresAt || new Date(invite.expiresAt).getTime() >= Date.now());
              
              return (
                <TableRow key={invite.id} className="hover:bg-slate-50/40">
                  <TableCell className="font-medium">
                    <div>
                      <p className="font-semibold text-slate-800">{invite.clientName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {invite.email || "Sem e-mail"}
                        {invite.clientPhone ? ` · ${invite.clientPhone}` : ""}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 max-w-[200px] md:max-w-xs lg:max-w-md">
                      <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate">
                        /portal/{invite.token.substring(0, 12)}...
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                        onClick={() => handleCopy(invite.token)}
                      >
                        {copiedToken === invite.token ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      {isLinkActive && (
                        <Link
                          href={`/portal/${invite.token}`}
                          target="_blank"
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {invite.expiresAt ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{new Date(invite.expiresAt).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Nunca expira</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {invite.lastAccessAt ? (
                      <span>{formatDateTime(invite.lastAccessAt)}</span>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Sem acessos</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(invite.status, invite.expiresAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isLinkActive && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Enviar convite via WhatsApp"
                          onClick={() => window.open(shareUrl, "_blank")}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {invite.status === "ativo" ? (
                        <form action={revokePortalInviteAction}>
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            title="Revogar Acesso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      ) : (
                        <div className="h-8 w-8 flex items-center justify-center text-slate-300" title="Acesso Revogado/Expirado">
                          <ShieldAlert className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
