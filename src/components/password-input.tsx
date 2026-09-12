"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

import { Input } from "@/components/ui/input";

type PasswordInputProps = ComponentProps<typeof Input>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={`${className ?? ""} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground transition hover:text-foreground"
        aria-label={visible ? "Ocultar senha" : "Visualizar senha"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
