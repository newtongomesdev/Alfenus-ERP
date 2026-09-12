"use client";

import { useState, useMemo } from "react";
import { Eye, EyeOff, Shield, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ── Tipos ───────────────────────────────────────────────────────────────────

type MaskPattern = {
  name: string;
  pattern: RegExp;
  mask: (value: string) => string;
};

// ── Padrões de mascaramento ─────────────────────────────────────────────────

const MASK_PATTERNS: MaskPattern[] = [
  {
    name: "CPF",
    pattern: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,
    mask: (value) => {
      const digits = value.replace(/\D/g, "");
      if (digits.length === 11) {
        return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
      }
      return "***.***.***-**";
    },
  },
  {
    name: "CNPJ",
    pattern: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g,
    mask: (value) => {
      const digits = value.replace(/\D/g, "");
      if (digits.length === 14) {
        return `${digits.slice(0, 2)}.***.***/****-${digits.slice(-2)}`;
      }
      return "**.***.***/****-**";
    },
  },
  {
    name: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    mask: (value) => {
      const [local, domain] = value.split("@");
      if (local && domain) {
        const maskedLocal =
          local.length > 2
            ? local[0] + "***" + local[local.length - 1]
            : "***";
        return `${maskedLocal}@${domain}`;
      }
      return "***@***.***";
    },
  },
  {
    name: "phone",
    pattern: /\(?\d{2}\)?\s*9?\d{4}-?\d{4}/g,
    mask: (value) => {
      const digits = value.replace(/\D/g, "");
      if (digits.length >= 10) {
        return `(**) 9****-${digits.slice(-4)}`;
      }
      return "(**) ****-****";
    },
  },
  {
    name: "token",
    pattern: /(?:Bearer\s+|token[=:]\s*["']?)[a-zA-Z0-9._\-]{20,}/gi,
    mask: (value) => {
      const prefix = value.match(/^[a-zA-Z0-9._\-]+\s+/)?.[0] ?? "";
      return `${prefix}***...***`;
    },
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function maskValue(value: string, patterns: MaskPattern[]): string {
  let masked = value;
  for (const { pattern, mask } of patterns) {
    masked = masked.replace(pattern, mask);
  }
  return masked;
}

function maskFieldValue(
  value: unknown,
  fieldName: string,
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;

  const sensitiveFields = [
    "cpf",
    "cnpj",
    "email",
    "e-mail",
    "phone",
    "telefone",
    "celular",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "api_key",
    "password",
    "senha",
  ];

  const lowerFieldName = fieldName.toLowerCase();
  const isSensitiveField = sensitiveFields.some((f) =>
    lowerFieldName.includes(f),
  );

  if (isSensitiveField) {
    return maskValue(value, MASK_PATTERNS);
  }

  // Verificar se o valor contém dados sensíveis pelo padrão
  return maskValue(value, MASK_PATTERNS);
}

function maskObject<T extends Record<string, unknown>>(
  data: T,
): T {
  const masked = { ...data };
  for (const [key, value] of Object.entries(masked)) {
    if (typeof value === "string") {
      (masked as Record<string, unknown>)[key] = maskFieldValue(value, key);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      (masked as Record<string, unknown>)[key] = maskObject(
        value as Record<string, unknown>,
      );
    }
  }
  return masked;
}

// ── Componentes ─────────────────────────────────────────────────────────────

interface MaskedFieldProps {
  value: string;
  fieldName?: string;
  canReveal?: boolean;
  className?: string;
}

function MaskedField({
  value,
  fieldName,
  canReveal = false,
  className,
}: MaskedFieldProps) {
  const [revealed, setRevealed] = useState(false);

  const displayValue = useMemo(() => {
    if (revealed || !canReveal) return value;
    return maskFieldValue(value, fieldName ?? "") as string;
  }, [value, fieldName, canReveal, revealed]);

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      {!revealed && canReveal && (
        <Shield className="size-3 text-amber-500" />
      )}
      <span
        className={
          !revealed && canReveal
            ? "font-mono text-muted-foreground"
            : ""
        }
      >
        {displayValue}
      </span>
      {canReveal && (
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={revealed ? "Ocultar dados" : "Revelar dados"}
        >
          {revealed ? (
            <EyeOff className="size-3" />
          ) : (
            <Eye className="size-3" />
          )}
        </button>
      )}
    </span>
  );
}

interface SensitiveDataMaskProps {
  /** Dados a serem exibidos/mascarados */
  data: Record<string, unknown>;
  /** Se o usuário pode revelar dados (requer escopo adequado) */
  canReveal?: boolean;
  /** Callback quando o toggle de visibilidade é acionado */
  onToggleVisibility?: (visible: boolean) => void;
  /** Estado externo de visibilidade */
  isVisible?: boolean;
  /** Classe CSS do container */
  className?: string;
}

export function SensitiveDataMask({
  data,
  canReveal = false,
  onToggleVisibility,
  isVisible: externalVisible,
  className,
}: SensitiveDataMaskProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const isRevealed = externalVisible ?? internalVisible;

  const handleToggle = () => {
    const newValue = !isRevealed;
    if (onToggleVisibility) {
      onToggleVisibility(newValue);
    } else {
      setInternalVisible(newValue);
    }
  };

  const maskedData = useMemo(
    () => (isRevealed ? data : maskObject(data)),
    [data, isRevealed],
  );

  return (
    <div className={className}>
      {/* Controles */}
      {canReveal && (
        <div className="mb-3 flex items-center justify-between">
          <Badge
            variant={isRevealed ? "default" : "secondary"}
            className="inline-flex items-center gap-1"
          >
            {isRevealed ? (
              <>
                <ShieldOff className="size-3" />
                Dados visíveis
              </>
            ) : (
              <>
                <Shield className="size-3" />
                Dados mascarados
              </>
            )}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            className="gap-1.5"
          >
            {isRevealed ? (
              <>
                <EyeOff className="size-3.5" />
                Ocultar
              </>
            ) : (
              <>
                <Eye className="size-3.5" />
                Revelar
              </>
            )}
          </Button>
        </div>
      )}

      {/* Dados */}
      <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
        {Object.entries(maskedData).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 text-sm">
            <span className="min-w-[100px] font-medium text-muted-foreground">
              {key}
            </span>
            <span className="flex-1 break-all">
              {typeof value === "boolean" ? (
                value ? "Sim" : "Não"
              ) : typeof value === "object" && value !== null ? (
                <pre className="text-xs">
                  {JSON.stringify(value, null, 2)}
                </pre>
              ) : (
                <MaskedField
                  value={String(value ?? "—")}
                  fieldName={key}
                  canReveal={canReveal && !isRevealed}
                />
              )}
            </span>
          </div>
        ))}
        {Object.keys(maskedData).length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            Nenhum dado para exibir.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Exportações ──────────────────────────────────────────────────────────────

export { MaskedField, maskValue, maskFieldValue, maskObject, MASK_PATTERNS };
