"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
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
import { resetMfaForUserAction } from "./actions";

type MemberRow = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
};

const roleLabel: Record<string, string> = {
  proprietario: "Proprietario",
  administrador: "Administrador",
  advogado: "Advogado",
  assistente: "Assistente",
  financeiro: "Financeiro",
  colaborador: "Colaborador",
  visualizador: "Visualizador",
};

export function UserSecurityTable({
  members,
  currentUserId,
}: {
  members: MemberRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [justification, setJustification] = useState("");

  function handleReset(userId: string) {
    setResettingId(userId);
    setJustification("");
  }

  function confirmReset(userId: string) {
    if (justification.trim().length < 10) {
      toast.error("Justificativa deve ter pelo menos 10 caracteres.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await resetMfaForUserAction(userId, justification.trim());
        if (result.success) {
          toast.success("MFA resetado com sucesso.");
          setResettingId(null);
          setJustification("");
          router.refresh();
        } else {
          toast.error(result.error ?? "Erro ao resetar MFA.");
        }
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Erro ao resetar MFA."
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Papel</TableHead>
            <TableHead>Status MFA</TableHead>
            <TableHead className="text-right">Acoes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{member.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {member.email}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {roleLabel[member.role] ?? member.role}
                </Badge>
              </TableCell>
              <TableCell>
                {member.mfaEnabled ? (
                  <Badge
                    variant="outline"
                    className="border-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    Ativado
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-0 bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400"
                  >
                    Desativado
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {member.userId !== currentUserId && (
                  <>
                    {resettingId === member.userId ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="text"
                          placeholder="Justificativa (min. 10 caracteres)"
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                          className="h-7 w-48 rounded-md border border-input bg-background px-2 text-xs"
                          disabled={isPending}
                        />
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => confirmReset(member.userId)}
                          disabled={isPending || justification.trim().length < 10}
                        >
                          {isPending ? "Resetando..." : "Confirmar"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            setResettingId(null);
                            setJustification("");
                          }}
                          disabled={isPending}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => handleReset(member.userId)}
                      >
                        <RotateCcw className="size-3" />
                        Resetar MFA
                      </Button>
                    )}
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {members.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum membro encontrado.
        </p>
      )}
    </div>
  );
}
