import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tools = [
  {
    icon: "📄",
    title: "Unir PDFs",
    description: "Combine múltiplos arquivos PDF em um único documento.",
  },
  {
    icon: "✂️",
    title: "Separar PDF",
    description: "Divida um PDF em vários arquivos menores por páginas.",
  },
  {
    icon: "📋",
    title: "Extrair/Remover páginas",
    description: "Extraia ou remova páginas específicas de um PDF.",
  },
  {
    icon: "🔀",
    title: "Reordenar páginas",
    description: "Altere a ordem das páginas de um documento PDF.",
  },
  {
    icon: "🔄",
    title: "Girar páginas",
    description: "Rotacione páginas de um PDF para a orientação desejada.",
  },
  {
    icon: "🔢",
    title: "Inserir numeração",
    description: "Adicione numeração de páginas ao seu documento PDF.",
  },
  {
    icon: "💧",
    title: "Inserir marca d'água",
    description: "Insira texto ou imagem como marca d'água nas páginas.",
  },
  {
    icon: "🎨",
    title: "Criar capa",
    description: "Gere uma capa profissional para seu documento PDF.",
  },
  {
    icon: "📦",
    title: "Comprimir",
    description: "Reduza o tamanho do arquivo PDF sem perder qualidade.",
  },
  {
    icon: "🖼️",
    title: "Converter imagens para PDF",
    description: "Transforme imagens JPG, PNG ou BMP em documentos PDF.",
  },
  {
    icon: "📑",
    title: "Gerar pacote processual",
    description: "Organize e compile documentos em um pacote processual único.",
  },
  {
    icon: "🏷️",
    title: "Aplicar tarjas",
    description: "Insira tarjas e carimbos como 'CONFIDENCIAL' no PDF.",
  },
];

export default async function FerramentasPdfPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Ferramentas PDF"
        description="Ferramentas úteis para manipulação e processamento de documentos PDF."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool) => (
          <Card key={tool.title} className="relative">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>
                  {tool.icon}
                </span>
                <span>{tool.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {tool.description}
              </p>
              <Badge variant="secondary">Em breve</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
