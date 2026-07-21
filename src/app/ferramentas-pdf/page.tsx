import { PageHeader } from "@/components/page-header";
import { PdfTools } from "./tools";

export default function FerramentasPdfPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ferramentas PDF"
        description="Ferramentas para manipulação e processamento de documentos PDF. Todos os processamentos ocorrem localmente no navegador — nenhum arquivo é enviado para servidores externos."
      />
      <PdfTools />
    </div>
  );
}
