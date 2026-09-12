import { Phone, Mail, MessageSquare, MapPin, Scale, Users, FileText, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface BioLinkViewProps {
  firm: any;
  members: any[];
  logoUrl: string | null;
  settingsOverride?: any;
}

export function BioLinkView({ firm, members, logoUrl, settingsOverride }: BioLinkViewProps) {
  // Tratar endereço
  const addressObj = firm.address as Record<string, any> | null;
  const hasAddress = addressObj && (addressObj.street || addressObj.city);
  const formattedAddress = hasAddress
    ? `${addressObj.street || ""}${addressObj.number ? `, ${addressObj.number}` : ""}${addressObj.neighborhood ? ` - ${addressObj.neighborhood}` : ""}${addressObj.city ? ` · ${addressObj.city}` : ""}${addressObj.state ? `/${addressObj.state}` : ""}`
    : null;

  const whatsappMessage = `Olá! Vi o link da bio do escritório ${firm.name} e gostaria de agendar um atendimento.`;
  const whatsappUrl = firm.phone
    ? `https://api.whatsapp.com/send?phone=55${firm.phone.replace(/\D/g, "")}&text=${encodeURIComponent(whatsappMessage)}`
    : null;

  // Usa as configurações fornecidas no override (preview local) ou as gravadas no banco
  const bioLinkSettings = settingsOverride || ((firm.settings as any)?.bio_link || {});
  const showWhatsapp = bioLinkSettings.show_whatsapp ?? true;
  const showEmail = bioLinkSettings.show_email ?? true;
  const showPhone = bioLinkSettings.show_phone ?? true;
  const showAddress = bioLinkSettings.show_address ?? true;
  const showTeam = bioLinkSettings.show_team ?? true;
  const showPortal = bioLinkSettings.show_portal ?? true;
  const customLinks = bioLinkSettings.custom_links || [];
  
  const theme = bioLinkSettings.theme || {};
  const bgColor = theme.backgroundColor || "#f8fafc";
  const textColor = theme.textColor || "#0f172a";
  const btnColor = theme.buttonColor || "#ffffff";
  const btnTextColor = theme.buttonTextColor || "#0f172a";
  const btnStyle = theme.buttonStyle || "solid";
  const btnShape = theme.buttonShape || "rounded";
  
  const getBorderRadius = () => {
    if (btnShape === "square") return "0px";
    if (btnShape === "pill") return "9999px";
    return "0.75rem"; // rounded-xl
  };
  
  const getButtonStyle = () => {
    const base = { borderRadius: getBorderRadius() };
    if (btnStyle === "outline") {
      return {
        ...base,
        backgroundColor: "transparent",
        color: btnTextColor,
        border: `1px solid ${btnTextColor}`
      };
    }
    return {
      ...base,
      backgroundColor: btnColor,
      color: btnTextColor,
      border: `1px solid ${btnColor}`
    };
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-between pb-8" style={{ backgroundColor: bgColor, color: textColor }}>
      <div className="w-full max-w-md px-6 pt-16 pb-12 flex flex-col items-center flex-grow">
        {/* Logo & Nome do Escritório */}
        <div className="flex flex-col items-center text-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={`Logo ${firm.name}`}
              className="h-20 w-20 rounded-2xl object-contain border bg-white p-2 shadow-sm mb-4"
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl flex items-center justify-center shadow-md mb-4" style={{ backgroundColor: btnColor, color: btnTextColor }}>
              <Scale className="h-10 w-10" />
            </div>
          )}
          <h1 className="text-xl font-bold tracking-tight" style={{ color: textColor }}>{firm.name}</h1>
          <p className="text-sm mt-1.5 font-medium opacity-80">Advocacia e Assessoria Jurídica</p>
        </div>

        {/* Links Principais */}
        <div className="w-full space-y-3.5 mb-8">
          {showWhatsapp && whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition active:scale-98 flex items-center justify-start px-4 gap-3 text-sm"
              style={{ borderRadius: getBorderRadius() }}
            >
              <MessageSquare className="h-5 w-5 shrink-0" />
              <span className="flex-grow text-left">Fale conosco no WhatsApp</span>
              <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
            </a>
          )}

          {showEmail && firm.email && (
            <a
              href={`mailto:${firm.email}`}
              className="w-full h-12 font-semibold shadow-sm transition active:scale-98 flex items-center justify-start px-4 gap-3 text-sm hover:opacity-90"
              style={getButtonStyle()}
            >
              <Mail className="h-5 w-5 shrink-0 opacity-70" />
              <span className="flex-grow text-left">Enviar E-mail</span>
              <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
            </a>
          )}

          {showPhone && firm.phone && (
            <a
              href={`tel:${firm.phone.replace(/\D/g, "")}`}
              className="w-full h-12 font-semibold shadow-sm transition active:scale-98 flex items-center justify-start px-4 gap-3 text-sm hover:opacity-90"
              style={getButtonStyle()}
            >
              <Phone className="h-5 w-5 shrink-0 opacity-70" />
              <span className="flex-grow text-left">Ligar para o escritório</span>
              <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
            </a>
          )}

          {showAddress && formattedAddress && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 font-semibold shadow-sm transition active:scale-98 flex items-center justify-start px-4 gap-3 text-sm hover:opacity-90"
              style={getButtonStyle()}
            >
              <MapPin className="h-5 w-5 shrink-0 opacity-70" />
              <span className="flex-grow text-left truncate">Como chegar (Endereço)</span>
              <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
            </a>
          )}
          
          {customLinks.map((link: any, index: number) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 font-semibold shadow-sm transition active:scale-98 flex items-center justify-start px-4 gap-3 text-sm hover:opacity-90"
              style={getButtonStyle()}
            >
              <span className="flex-grow text-center">{link.title}</span>
            </a>
          ))}
        </div>

        {/* Nossa Equipe */}
        {showTeam && members && members.length > 0 && (
          <div className="w-full space-y-3 mb-8">
            <h2 className="text-xs font-bold uppercase tracking-wider opacity-60 flex items-center gap-1.5 px-1" style={{ color: textColor }}>
              <Users className="h-3.5 w-3.5" />
              Nossa Equipe
            </h2>
            <div className="grid gap-3">
              {members.map((member: any) => (
                <div key={member.id} className="flex items-center gap-3 p-3 shadow-xs" style={{ borderRadius: getBorderRadius(), backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(0,0,0,0.1)', borderWidth: '1px' }}>
                  <Avatar className="h-10 w-10 shrink-0 border border-black/5">
                    {member.avatar_url && <AvatarImage src={member.avatar_url} />}
                    <AvatarFallback className="font-semibold text-xs" style={{ backgroundColor: btnColor, color: btnTextColor }}>
                      {member.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-grow">
                    <p className="text-sm font-semibold truncate" style={{ color: textColor }}>{member.name}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: textColor, opacity: 0.7 }}>
                      {member.position || (member.role === "proprietario" ? "Sócio Proprietário" : "Advogado Associado")}
                    </p>
                  </div>
                  <a
                    href={`mailto:${member.email}`}
                    className="p-2 rounded-lg transition"
                    style={{ color: textColor, opacity: 0.6 }}
                    title={`Enviar e-mail para ${member.name}`}
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informações de Acompanhamento */}
        {showPortal && (
          <Card className="w-full border shadow-xs" style={{ borderRadius: getBorderRadius(), backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(0,0,0,0.1)' }}>
            <CardHeader className="p-4 flex flex-row items-center gap-3 space-y-0 border-b border-black/5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: textColor }}>
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold" style={{ color: textColor }}>Portal do Cliente</CardTitle>
                <CardDescription className="text-xs" style={{ color: textColor, opacity: 0.7 }}>Acompanhamento online do seu caso</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-4 text-xs leading-relaxed" style={{ color: textColor, opacity: 0.8 }}>
              Se você já é nosso cliente, solicite o seu link temporário de acesso seguro para acompanhar andamentos, prazos e nos enviar documentos de forma prática e direta.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center text-[10px] font-medium tracking-wide opacity-50" style={{ color: textColor }}>
        Desenvolvido com <span className="font-semibold" style={{ color: textColor }}>Alfenus ERP</span>
      </footer>
    </div>
  );
}
