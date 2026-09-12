"use client";

import { useState } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  FileText,
  LockKeyhole,
  Scale,
  Users,
  TrendingUp,
  HelpCircle,
  Sparkles,
  BookOpen,
  Quote,
  Compass,
  ChevronDown,
  ShieldCheck,
  UserCheck,
  Clock,
  Briefcase,
  Layers,
  ChevronRight,
  FolderLock
} from "lucide-react";
import Link from "next/link";

const features = [
  {
    icon: Users,
    title: "Atendimento & CRM Jurídico",
    description:
      "Acompanhe potenciais clientes desde o primeiro contato no WhatsApp até a assinatura de procuração e contrato. Evite conflitos de interesse e publique seu Link da Bio profissional.",
  },
  {
    icon: Scale,
    title: "Controladoria de Processos",
    description:
      "Organize processos judiciais e administrativos da banca em um painel centralizado, com histórico completo de andamentos, pastas digitais e fases processuais.",
  },
  {
    icon: CalendarClock,
    title: "Gestão Rigorosa de Prazos",
    description:
      "Elimine o risco de perda de datas fatais com contagem de prazos em dias úteis, calendários forenses integrados e alertas automáticos para a equipe antes das audiências.",
  },
  {
    icon: Sparkles,
    title: "Estúdio de Minutas & IA Jurídica",
    description:
      "Redija peças, contratos e procurações em visualizador A4 interativo. Aplique inteligência artificial para estruturar fundamentações e formalizar a redação antes de emitir o PDF.",
  },
  {
    icon: Banknote,
    title: "Financeiro & Honorários",
    description:
      "Controle honorários contratuais, parcelamentos de consultas, honorários sucumbenciais, cobrança por horas trabalhadas (time tracking) e adiantamento de custas.",
  },
  {
    icon: UserCheck,
    title: "Portal Seguro do Cliente",
    description:
      "Ofereça um portal com link seguro para seu cliente consultar o status resumido da causa e anexar documentos solicitados com facilidade, reduzindo mensagens no WhatsApp.",
  },
];

const testimonials = [
  {
    quote:
      "O Alfenus trouxe o nível de organização que nosso escritório precisava para crescer com segurança. O controle de prazos e o financeiro nos deram previsibilidade total.",
    author: "Dra. Mariana Vasconcelos",
    role: "Sócia-Fundadora, Vasconcelos & Associados",
    city: "São Paulo, SP"
  },
  {
    quote:
      "A elaboração de minutas em folha A4 e a separação dos honorários contratuais e sucumbenciais simplificaram a rotina de toda a equipe. É um sistema limpo, direto e muito produtivo.",
    author: "Dr. Roberto Mendes",
    role: "Diretor Operacional, Mendes & Duarte Advogados",
    city: "Belo Horizonte, MG"
  },
  {
    quote:
      "O Portal do Cliente reduziu em mais de 70% as mensagens no nosso WhatsApp pedindo andamento processual. Nossos clientes elogiam a transparência e o profissionalismo.",
    author: "Dra. Camila Nogueira",
    role: "Especialista em Direito de Família e Sucessões",
    city: "Curitiba, PR"
  }
];

const faqs = [
  {
    question: "Como a Inteligência Artificial auxilia na elaboração de peças jurídicas?",
    answer:
      "O estúdio de documentos do Alfenus funciona como um editor de texto no formato visual exato de uma folha A4. Você pode vincular os dados cadastrais do cliente com um clique, editar a minuta e utilizar a IA integrada para aprimorar fundamentos jurídicos, formalizar a redação ou sintetizar fatos, gerando o PDF pronto para assinatura.",
  },
  {
    question: "Como o Alfenus previne a perda de prazos e audiências?",
    answer:
      "O sistema centraliza toda a agenda do escritório. Além da contagem de prazos com base no CPC e dias úteis, o painel destaca alertas visuais de urgência (Hoje, Amanhã e Próximos 7 dias) para que nenhum advogado ou controlador perca datas fatais.",
  },
  {
    question: "É possível gerenciar honorários contratuais, parcelados e sucumbenciais?",
    answer:
      "Sim. O módulo financeiro foi projetado especificamente para a prática da advocacia: registre honorários fixos ou de êxito, controle o fluxo de parcelas de consultas, contabilize horas dedicadas a pareceres e lance despesas e custas para reembolso do cliente.",
  },
  {
    question: "Como funciona o Portal do Cliente?",
    answer:
      "Você pode gerar um link exclusivo e seguro para cada cliente acessar pelo celular ou computador. Lá ele visualiza o resumo das etapas do seu caso e envia comprovantes e documentos solicitados pela banca, tudo com criptografia e sem necessidade de login complexo.",
  },
  {
    question: "Os dados dos meus clientes e processos estão seguros?",
    answer:
      "Sim, com os mais altos padrões de segurança. A plataforma conta com controle rigoroso de permissões por perfil de usuário, criptografia de ponta a ponta e total conformidade com a Lei Geral de Proteção de Dados (LGPD) e o sigilo profissional da OAB.",
  },
  {
    question: "Preciso instalar algum aplicativo no computador?",
    answer:
      "Não. O Alfenus funciona 100% em nuvem, acessível de qualquer navegador moderno no computador, tablet ou smartphone, com backups automáticos e atualizações contínuas sem interrupções.",
  },
];

export function LandingPageClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              id="logo-link"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <Scale className="size-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Alfenus
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <a href="#recursos" className="transition-colors hover:text-foreground">Recursos</a>
              <a href="#diferenciais" className="transition-colors hover:text-foreground">Diferenciais</a>
              <a href="#sobre-nos" className="transition-colors hover:text-foreground">Sobre nós</a>
              <a href="#depoimentos" className="transition-colors hover:text-foreground">Depoimentos</a>
              <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/entrar"
              id="login-header-btn"
              className="inline-flex h-9 items-center justify-center rounded-md px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted"
            >
              Entrar
            </Link>
            <Link
              href="/cadastrar"
              id="signup-header-btn"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border/40 bg-gradient-to-b from-muted/30 to-background py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background px-3.5 py-1 text-xs font-medium text-foreground shadow-xs">
                <ShieldCheck className="size-3.5 text-emerald-600" />
                <span>Gestão Jurídica Inteligente &amp; Confiável</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-foreground leading-[1.15]">
                A gestão completa que devolve o foco para{" "}
                <span className="underline decoration-primary/40 decoration-4 underline-offset-4">
                  sua advocacia.
                </span>
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Centralize o atendimento a clientes, a controladoria de processos, o controle rigoroso de prazos e o financeiro em uma plataforma ágil, elegante e desenhada para o dia a dia forense.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row pt-2">
                <Link
                  href="/cadastrar"
                  id="signup-hero-btn"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-base font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Experimentar Gratuitamente
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/entrar"
                  id="login-hero-btn"
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-card px-6 text-base font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Acessar o Sistema
                </Link>
              </div>

              <div className="grid gap-3 pt-4 text-xs font-medium text-muted-foreground sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Sem cartão de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Ativação em 1 minuto</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>100% conforme LGPD e OAB</span>
                </div>
              </div>
            </div>

            {/* Dashboard Static Clean Mockup */}
            <div className="relative">
              <div className="rounded-xl border border-border/80 bg-card shadow-lg">
                {/* Window Header */}
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5 bg-muted/20 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <span className="size-3 rounded-full bg-red-400/80" />
                    <span className="size-3 rounded-full bg-amber-400/80" />
                    <span className="size-3 rounded-full bg-emerald-400/80" />
                    <span className="ml-2 text-xs font-medium text-muted-foreground">painel.alfenus.adv.br</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    <TrendingUp className="size-3" /> Sistema Online
                  </span>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  {/* Metric Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Processos Ativos</span>
                        <Scale className="size-4 text-primary" />
                      </div>
                      <p className="mt-1 text-2xl font-bold tracking-tight">57</p>
                      <p className="mt-0.5 text-[11px] text-emerald-600 font-medium">+4 novas distribuições</p>
                    </div>

                    <div className="rounded-lg border border-border/60 bg-muted/10 p-3.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Honorários do Mês</span>
                        <Banknote className="size-4 text-emerald-600" />
                      </div>
                      <p className="mt-1 text-2xl font-bold tracking-tight">R$ 48.900</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">82% da meta atingida</p>
                    </div>
                  </div>

                  {/* Deadlines Section */}
                  <div className="rounded-lg border border-border/60 bg-background p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="size-4 text-primary" />
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Prazos &amp; Audiências</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">3 pendentes</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 border border-border/40">
                        <div>
                          <p className="font-semibold text-foreground">Contestação - Ação Monitória</p>
                          <p className="text-[11px] text-muted-foreground">0024918-44.2026.8.26.0100</p>
                        </div>
                        <span className="rounded bg-rose-500/10 px-2 py-0.5 font-bold text-rose-600">Hoje</span>
                      </div>

                      <div className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 border border-border/40">
                        <div>
                          <p className="font-semibold text-foreground">Apelação Cível - TJSP</p>
                          <p className="text-[11px] text-muted-foreground">1003492-12.2025.8.26.0002</p>
                        </div>
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 font-bold text-amber-600">Amanhã</span>
                      </div>

                      <div className="flex items-center justify-between rounded-md bg-muted/30 p-2.5 border border-border/40">
                        <div>
                          <p className="font-semibold text-foreground">Audiência de Instrução e Julgamento</p>
                          <p className="text-[11px] text-muted-foreground">Vara do Trabalho · 14h00</p>
                        </div>
                        <span className="rounded bg-muted px-2 py-0.5 font-medium text-muted-foreground">Em 3 dias</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Pillars */}
      <section id="diferenciais" className="border-b border-border/40 py-16 bg-muted/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              Estruturado para as necessidades reais do escritório
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tudo o que você precisa para gerir pessoas, processos e finanças em uma única interface.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <CalendarClock className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Controle Rigoroso de Prazos</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Contagem em dias úteis, controle de feriados forenses e avisos antecipados para que sua equipe nunca seja surpreendida por uma data fatal.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Users className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">CRM &amp; Captação Integrada</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Acompanhe o cliente desde o primeiro contato no WhatsApp, elabore a proposta de honorários e formalize a contratação sem atritos.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                <Banknote className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Honorários &amp; Reembolsos</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Controle honorários de êxito, parcelamentos mensais, horas trabalhadas (*time tracking*) e registre comprovantes de custas para reembolso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="recursos" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Recursos da Plataforma</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
              Tudo o que seu escritório precisa em um só lugar
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Elimine o uso de planilhas paralelas e sistemas desconexos com uma solução jurídica coesa e intuitiva.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-xl border border-border/60 bg-card p-6 shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/10"
                >
                  <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mt-4 font-bold text-lg text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* About / Story Section */}
      <section id="sobre-nos" className="border-y border-border/40 bg-muted/15 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div className="rounded-2xl border border-border/80 bg-card p-8 sm:p-10 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                  <Scale className="size-5" />
                </div>
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Alfenus · Jurídico</span>
              </div>

              <div className="space-y-3">
                <Quote className="size-8 text-primary/40" />
                <p className="text-xl font-semibold leading-snug text-foreground">
                  Organizar o complexo para devolver tempo a quem pratica o Direito.
                </p>
              </div>

              <div className="border-t border-border/40 pt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <BookOpen className="size-4 text-primary shrink-0" />
                <span>Inspirado na precisão da jurisprudência clássica e na agilidade da tecnologia moderna.</span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Sobre o Alfenus</span>
                <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                  Tecnologia desenvolvida com respeito à tradição e à rotina jurídica
                </h2>
              </div>

              <p className="text-base leading-relaxed text-muted-foreground">
                O Alfenus nasceu para resolver a sobrecarga de burocracia e tarefas manuais enfrentadas pelos advogados. Desenvolvemos uma plataforma que traz clareza para a tomada de decisões e garante a confidencialidade e a disciplina que a advocacia exige.
              </p>

              <div className="grid gap-4 sm:grid-cols-3 border-t border-border/60 pt-6">
                <div>
                  <Compass className="size-5 text-primary mb-2" />
                  <h4 className="font-bold text-sm text-foreground">Foco &amp; Clareza</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Menos dispersão administrativa, mais dedicação às teses e aos clientes.</p>
                </div>
                <div>
                  <LockKeyhole className="size-5 text-primary mb-2" />
                  <h4 className="font-bold text-sm text-foreground">Sigilo &amp; Segurança</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Dados criptografados e acessos controlados por usuário e função.</p>
                </div>
                <div>
                  <Scale className="size-5 text-primary mb-2" />
                  <h4 className="font-bold text-sm text-foreground">Equilíbrio</h4>
                  <p className="mt-1 text-xs text-muted-foreground">Automação para o operacional, discernimento para as decisões jurídicas.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-20 border-b border-border/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Depoimentos</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              Aprovado por bancas que prezam pela excelência
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Veja a experiência de escritórios que transformaram sua gestão com o Alfenus.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between rounded-xl border border-border/60 bg-card p-6 shadow-xs"
              >
                <p className="text-sm italic leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 border-t border-border/40 pt-4">
                  <p className="font-bold text-sm text-foreground">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5">{t.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 border-b border-border/40 bg-muted/10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Dúvidas Comuns</span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Perguntas Frequentes</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Respostas rápidas para as principais dúvidas sobre o Alfenus.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-lg border border-border/60 bg-card overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-foreground hover:bg-muted/20 transition-colors"
                  >
                    <span className="text-sm sm:text-base pr-4">{faq.question}</span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-gradient-to-r from-muted/40 via-background to-muted/40 p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Pronto para transformar a gestão do seu escritório?
            </h2>
            <p className="max-w-xl mx-auto text-base text-muted-foreground">
              Crie sua conta em menos de 1 minuto e experimente todas as funcionalidades gratuitamente por 14 dias.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/cadastrar"
                id="signup-footer-btn"
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90 w-full sm:w-auto"
              >
                Começar Gratuitamente
              </Link>
              <Link
                href="/entrar"
                id="consult-footer-btn"
                className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted w-full sm:w-auto"
              >
                Acessar o Sistema
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium">
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#diferenciais" className="hover:text-foreground transition-colors">Diferenciais</a>
            <a href="#sobre-nos" className="hover:text-foreground transition-colors">Sobre nós</a>
            <Link href="/planos" className="hover:text-foreground transition-colors">Planos</Link>
            <Link href="/privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
            <Link href="/termos" className="hover:text-foreground transition-colors">Termos de uso</Link>
          </div>
          <p>&copy; {new Date().getFullYear()} Alfenus Tecnologia Jurídica. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
