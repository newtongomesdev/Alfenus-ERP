"use client";

import { useState } from "react";
import { Link2, Plus, Trash, ExternalLink, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateBioLinkAction } from "./actions";

interface CustomLink {
  title: string;
  url: string;
}

export function BioLinkForm({ lawFirm }: { lawFirm: any }) {
  const bioLinkSettings = (lawFirm.settings as any)?.bio_link || {};
  
  const [slug, setSlug] = useState(lawFirm.slug || "");
  const [showWhatsapp, setShowWhatsapp] = useState(bioLinkSettings.show_whatsapp ?? true);
  const [showEmail, setShowEmail] = useState(bioLinkSettings.show_email ?? true);
  const [showPhone, setShowPhone] = useState(bioLinkSettings.show_phone ?? true);
  const [showAddress, setShowAddress] = useState(bioLinkSettings.show_address ?? true);
  const [showTeam, setShowTeam] = useState(bioLinkSettings.show_team ?? true);
  
  const [customLinks, setCustomLinks] = useState<CustomLink[]>(bioLinkSettings.custom_links || []);
  
  const addCustomLink = () => {
    setCustomLinks([...customLinks, { title: "", url: "" }]);
  };
  
  const updateCustomLink = (index: number, field: keyof CustomLink, value: string) => {
    const newLinks = [...customLinks];
    newLinks[index][field] = value;
    setCustomLinks(newLinks);
  };
  
  const removeCustomLink = (index: number) => {
    const newLinks = [...customLinks];
    newLinks.splice(index, 1);
    setCustomLinks(newLinks);
  };

  return (
    <form action={updateBioLinkAction} className="space-y-6">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle>Endereço e Visibilidade</CardTitle>
          <CardDescription>Configure o nome de usuário do seu link e o que será exibido.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-sm font-semibold">Nome de Usuário (@)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-mono bg-slate-100 px-3 h-10 rounded-md border flex items-center">
                alfenus.com/@
              </span>
              <Input 
                id="slug" 
                name="slug"
                value={slug} 
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ""))} 
                className="font-mono h-10 flex-1" 
                required 
                minLength={3}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Este é o link que você pode compartilhar no Instagram e WhatsApp.</p>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold">Opções de Contato</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showWhatsapp">WhatsApp</Label>
                <p className="text-xs text-muted-foreground">Botão para enviar mensagem no WhatsApp.</p>
              </div>
              <Switch id="showWhatsapp" name="showWhatsapp" checked={showWhatsapp} onCheckedChange={setShowWhatsapp} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showEmail">E-mail</Label>
                <p className="text-xs text-muted-foreground">Botão para enviar e-mail.</p>
              </div>
              <Switch id="showEmail" name="showEmail" checked={showEmail} onCheckedChange={setShowEmail} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showPhone">Telefone</Label>
                <p className="text-xs text-muted-foreground">Botão para ligar para o escritório.</p>
              </div>
              <Switch id="showPhone" name="showPhone" checked={showPhone} onCheckedChange={setShowPhone} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showAddress">Como Chegar</Label>
                <p className="text-xs text-muted-foreground">Botão com link para o Google Maps do endereço do escritório.</p>
              </div>
              <Switch id="showAddress" name="showAddress" checked={showAddress} onCheckedChange={setShowAddress} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="showTeam">Nossa Equipe</Label>
                <p className="text-xs text-muted-foreground">Exibe a lista de membros do escritório e seus e-mails.</p>
              </div>
              <Switch id="showTeam" name="showTeam" checked={showTeam} onCheckedChange={setShowTeam} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Links Personalizados</CardTitle>
              <CardDescription>Adicione links adicionais, como site, redes sociais, etc.</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addCustomLink}>
              <Plus className="size-4 mr-1" />
              Adicionar Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customLinks.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhum link personalizado adicionado.<br/>
              Clique no botão acima para adicionar.
            </div>
          ) : (
            <div className="space-y-4">
              {customLinks.map((link, index) => (
                <div key={index} className="flex gap-3 items-start border p-3 rounded-lg bg-slate-50/50">
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Título do Link</Label>
                      <Input 
                        value={link.title} 
                        onChange={(e) => updateCustomLink(index, "title", e.target.value)} 
                        placeholder="Ex: Nosso Site Oficial" 
                        required 
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">URL (Link)</Label>
                      <Input 
                        type="url"
                        value={link.url} 
                        onChange={(e) => updateCustomLink(index, "url", e.target.value)} 
                        placeholder="https://..." 
                        required
                        className="h-9"
                      />
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeCustomLink(index)}
                    className="text-muted-foreground hover:text-destructive mt-6"
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <input type="hidden" name="customLinks" value={JSON.stringify(customLinks)} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3 sticky bottom-4">
        <Link href="/configuracoes">
          <Button variant="outline" type="button">
            <ArrowLeft className="mr-2 size-4" />
            Voltar
          </Button>
        </Link>
        <Button type="submit" className="font-semibold shadow-md">
          <Save className="mr-2 size-4" />
          Salvar Configurações
        </Button>
      </div>
    </form>
  );
}
