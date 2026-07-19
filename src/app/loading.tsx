import { Scale } from "lucide-react";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Scale className="size-10 text-primary animate-pulse" />
          <div className="absolute inset-0 size-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
        <p className="text-sm text-muted-foreground font-medium">Carregando...</p>
      </div>
    </div>
  );
}
