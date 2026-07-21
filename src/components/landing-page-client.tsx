"use client";

import { useRef } from "react";
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
} from "lucide-react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const features = [
  {
    icon: Users,
    title: "CRM Jurídico Avançado",
    description: "Gerencie o funil de prospecção, a captação de leads e a jornada completa de conversão de novos clientes com histórico unificado.",
  },
  {
    icon: Scale,
    title: "Gestão Integrada de Processos",
    description: "Acompanhe processos judiciais e demandas extrajudiciais de forma organizada, mantendo a documentação e os andamentos em dia.",
  },
  {
    icon: Sparkles,
    title: "Estúdio de Documentos & IA",
    description: "Edite minutas diretamente em um canvas A4 virtual. Utilize a inteligência artificial para formalizar termos jurídicos, corrigir e expandir fundamentos, gerando PDFs com design profissional.",
  },
  {
    icon: Banknote,
    title: "Financeiro Estruturado",
    description: "Controle contratos, emissão de honorários, fluxo de parcelas, reembolsos de custas e alertas automáticos de inadimplência.",
  },
  {
    icon: CalendarClock,
    title: "Agenda e Prazos Inteligentes",
    description: "Planeje audiências, reuniões e tarefas internas com um calendário integrado e notificações ativas para evitar perdas de prazos.",
  },
];

const testimonials = [
  {
    quote: "A Alfenus revolucionou a gestão interna do nosso escritório. O isolamento completo dos dados nos trouxe a segurança necessária para expandir as operações digitais.",
    author: "Dra. Mariana Vasconcelos",
    role: "Sócia-Fundadora, Vasconcelos & Associados",
  },
  {
    quote: "O estúdio de documentos com auxílio de IA reduziu em 70% o nosso tempo de redação de contratos e notificações extrajudiciais. A qualidade final dos PDFs é impecável.",
    author: "Dr. Roberto Mendes",
    role: "Diretor Operacional, Mendes Advogados",
  },
];

const faqs = [
  {
    question: "Como funciona o Estúdio de Documentos com Inteligência Artificial?",
    answer: "O Alfenus oferece um editor visual no formato exato de uma folha A4. Você seleciona um modelo (petição, procuração, acordo, etc.), preenche os dados integrados do cliente com um clique, edita o texto e utiliza nossa IA integrada para refinar a linguagem, corrigir pontuação, resumir ou expandir a fundamentação antes de gerar o PDF final.",
  },
  {
    question: "O Alfenus faz a captura automática de intimações e andamentos nos tribunais?",
    answer: "Sim! Nossa inteligência monitora ativamente diários oficiais e sistemas de tribunais de todo o Brasil, capturando publicações e andamentos processuais, vinculando-os automaticamente à ficha do cliente e notificando os responsáveis.",
  },
  {
    question: "Como a plataforma me ajuda a garantir que nenhum prazo judicial seja perdido?",
    answer: "O Alfenus centraliza toda a agenda de compromissos e tarefas jurídicas. O sistema envia alertas automáticos na tela inicial e notificações por e-mail para a equipe antes do vencimento de qualquer prazo crítico ou data de audiência.",
  },
  {
    question: "Consigo controlar honorários contratuais, sucumbenciais e parcelamentos?",
    answer: "Com certeza. A nossa área financeira foi planejada especificamente para o fluxo de caixa de escritórios de advocacia, permitindo parcelar honorários contratuais, controlar repasses de sucumbência e monitorar a inadimplência com lembretes automáticos de cobrança.",
  },
  {
    question: "Os dados do meu escritório e dos meus clientes estão seguros sob a LGPD?",
    answer: "Segurança e sigilo profissional são nossas prioridades máximas. Todos os dados e documentos anexados são criptografados em trânsito e em repouso nos servidores mais seguros do mercado, com backups diários automáticos e políticas rigorosas de controle de acesso.",
  },
];

export function LandingPageClient() {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroMockupRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 1. Hero Entrance Animations
      const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });

      tl.from(".hero-badge", { y: -20, opacity: 0, duration: 0.6 })
        .from(".hero-title", { y: 30, opacity: 0 }, "-=0.3")
        .from(".hero-description", { y: 25, opacity: 0 }, "-=0.5")
        .from(".hero-buttons > *", { y: 20, opacity: 0, stagger: 0.15 }, "-=0.5")
        .from(".hero-features > *", { y: 15, opacity: 0, stagger: 0.1 }, "-=0.4")
        .from(heroMockupRef.current, { scale: 0.92, opacity: 0, y: 40, duration: 1 }, "-=0.7");

      // Continuous subtle float on hero mockup
      gsap.to(heroMockupRef.current, {
        y: "-=10",
        duration: 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });

      // 2. Features ScrollTrigger
      gsap.from(".feature-card", {
        scrollTrigger: {
          trigger: ".features-section",
          start: "top 80%",
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
      });

      // 3. About Section ScrollTrigger
      gsap.from(".about-card-left", {
        scrollTrigger: {
          trigger: "#sobre-nos",
          start: "top 75%",
        },
        x: -50,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });

      gsap.from(".about-content-right", {
        scrollTrigger: {
          trigger: "#sobre-nos",
          start: "top 75%",
        },
        x: 50,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });

      // 4. Testimonials ScrollTrigger
      gsap.from(".testimonial-card", {
        scrollTrigger: {
          trigger: ".testimonials-section",
          start: "top 80%",
        },
        y: 35,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
      });

      // 5. FAQ Cards ScrollTrigger
      gsap.from(".faq-card", {
        scrollTrigger: {
          trigger: ".faq-section",
          start: "top 80%",
        },
        y: 25,
        opacity: 0,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
      });

      // 6. CTA Footer Section
      gsap.from(".cta-section", {
        scrollTrigger: {
          trigger: ".cta-section",
          start: "top 85%",
        },
        scale: 0.97,
        opacity: 0,
        duration: 0.8,
        ease: "power2.out",
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Scale className="size-5" />
            </div>
            <Link href="/" id="logo-link" className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Alfenus
            </Link>
          </div>
          <nav className="flex items-center gap-3">
            <Link
              href="/entrar"
              id="login-header-btn"
              className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground hover:bg-muted/50"
            >
              Entrar
            </Link>
            <Link
              href="/cadastrar"
              id="signup-header-btn"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md active:scale-95"
            >
              Começar Agora
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 py-20 lg:py-32">
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5 animate-pulse" />
              <span>Tecnologia de ponta para gestão jurídica</span>
            </div>

            <h1 className="hero-title text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.1]">
              A inteligência operacional que seu{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                escritório merece.
              </span>
            </h1>

            <p className="hero-description max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Integre captação de clientes, controle financeiro à prova de falhas, andamento de processos judiciais e controle rigoroso de prazos em uma única plataforma segura e integrada.
            </p>

            <div className="hero-buttons flex flex-col gap-3.5 sm:flex-row pt-2">
              <Link
                href="/cadastrar"
                id="signup-hero-btn"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 hover:shadow-xl active:scale-95"
              >
                Experimentar Gratuitamente
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/entrar"
                id="login-hero-btn"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-6 text-sm font-semibold transition hover:bg-muted/80 hover:text-foreground active:scale-95"
              >
                Acessar Plataforma
              </Link>
            </div>

            <div className="hero-features grid gap-3 pt-6 text-xs font-medium text-muted-foreground sm:grid-cols-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="size-4" />
                </div>
                Multi-escritórios & Filiais
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                  <LockKeyhole className="size-4" />
                </div>
                Isolamento Total de Dados
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                  <FileText className="size-4" />
                </div>
                Registro Completo de Atividades
              </div>
            </div>
          </div>

          {/* Interactive Panel Mockup */}
          <div ref={heroMockupRef} className="relative rounded-2xl border border-border/50 bg-card p-6 shadow-2xl shadow-foreground/5 backdrop-blur-sm lg:p-8">
            <div className="absolute -top-4 -right-4 flex items-center gap-1.5 rounded-lg border bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-md">
              <TrendingUp className="size-3.5 text-emerald-600" />
              <span>+38% Eficiência</span>
            </div>

            <div className="border-b border-border/40 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Painel Operacional</h3>
                  <p className="text-xs text-muted-foreground">Visão consolidada em tempo real</p>
                </div>
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-500/80" />
                  <span className="size-2.5 rounded-full bg-yellow-500/80" />
                  <span className="size-2.5 rounded-full bg-emerald-500/80" />
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { label: "Clientes Ativos", val: "142", desc: "Este mês (+12)" },
                { label: "Processos em Andamento", val: "57", desc: "3 atualizações hoje" },
                { label: "Audiências agendadas", val: "8", desc: "Próximos 7 dias" },
                { label: "Receita Faturada", val: "R$ 48.900", desc: "Meta mensal de 82%" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-border/40 bg-muted/30 p-4 transition-all hover:bg-muted/50 hover:border-primary/20">
                  <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-xl font-bold tracking-tight">{card.val}</p>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-border/40 bg-muted/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prazos e Alertas Importantes</p>
              <div className="mt-3.5 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="font-medium">Contestação - Ação de Cobrança</span>
                  <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-semibold text-rose-600">Hoje</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/30 pb-2">
                  <span className="font-medium">Protocolo - Apelação Cível</span>
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-semibold text-amber-600">Amanhã</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">Audiência de Conciliação</span>
                  <span className="text-muted-foreground">Sexta às 14h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Uma suíte completa para escritórios de alto padrão</h2>
          <p className="text-muted-foreground">
            Elimine planilhas paralelas e sistemas desconexos. Tenha controle completo de ponta a ponta.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="feature-card group relative rounded-2xl border border-border/40 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 font-bold tracking-tight text-foreground">{feature.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* About / Brand story */}
      <section id="sobre-nos" className="overflow-hidden border-y border-border/40 bg-muted/15 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div className="about-card-left relative min-h-[360px] overflow-hidden rounded-2xl border border-primary/20 bg-primary p-8 text-primary-foreground shadow-xl shadow-primary/10 sm:p-10">
            <div className="absolute -right-16 -top-16 size-56 rounded-full border border-white/15" />
            <div className="absolute -bottom-24 -left-20 size-72 rounded-full border border-white/10" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex size-12 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20">
                  <Scale className="size-6" />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary-foreground/60">Alfenus · MMXXIV</span>
              </div>
              <div className="mt-16">
                <Quote className="size-9 text-primary-foreground/40" />
                <p className="mt-5 max-w-sm text-2xl font-semibold leading-tight tracking-tight">
                  Organizar o complexo para devolver tempo a quem pratica o Direito.
                </p>
              </div>
              <div className="mt-12 flex items-center gap-3 border-t border-white/15 pt-5 text-xs text-primary-foreground/70">
                <BookOpen className="size-4" />
                <span>Conhecimento jurídico, operação com clareza.</span>
              </div>
            </div>
          </div>

          <div className="about-content-right max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Sobre o Alfenus</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Tecnologia com respeito pela tradição jurídica.</h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              O Alfenus nasceu para aproximar duas realidades que precisam trabalhar juntas: o rigor do Direito e a agilidade de uma operação moderna. Criamos uma plataforma para que escritórios tenham mais clareza sobre seus clientes, processos, prazos e decisões, sem perder o cuidado com o sigilo e a responsabilidade profissional.
            </p>
            <div className="mt-8 grid gap-6 border-t border-border/60 pt-8 sm:grid-cols-3">
              <div>
                <Compass className="size-5 text-primary" />
                <p className="mt-3 font-semibold">Direção</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Menos dispersão. Mais foco no trabalho que importa.</p>
              </div>
              <div>
                <LockKeyhole className="size-5 text-primary" />
                <p className="mt-3 font-semibold">Confiança</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Dados tratados com privacidade, contexto e responsabilidade.</p>
              </div>
              <div>
                <Scale className="size-5 text-primary" />
                <p className="mt-3 font-semibold">Equilíbrio</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Automação para a rotina, discernimento para as decisões.</p>
              </div>
            </div>
            <div className="mt-8 rounded-xl border border-primary/15 bg-background/70 p-5">
              <p className="text-sm font-semibold">De onde vem o nome?</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Alfenus é uma referência a Publius Alfenus Varus, jurista romano associado à obra <em>Digesta</em>. O título remete à ideia de reunir, ordenar e interpretar questões jurídicas complexas. Essa é a inspiração do produto: transformar informação espalhada em uma visão organizada e útil para o escritório.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust / Testimonials */}
      <section className="testimonials-section border-t border-border/40 bg-muted/10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl font-bold tracking-tight">O que dizem os grandes escritórios</h2>
            <p className="mt-2 text-sm text-muted-foreground">A confiança de quem usa a nossa tecnologia no dia a dia da advocacia.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {testimonials.map((t, idx) => (
              <div key={idx} className="testimonial-card flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-8 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-md">
                <p className="text-base italic leading-relaxed text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3.5 border-t border-border/40 pt-4">
                  <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {t.author.charAt(5)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{t.author}</h4>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">Perguntas Frequentes</h2>
          <p className="mt-2 text-sm text-muted-foreground">Tire suas principais dúvidas sobre o Alfenus.</p>
        </div>
        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="faq-card rounded-2xl border border-border/40 bg-card p-6 shadow-sm transition-all hover:border-primary/20">
              <h3 className="flex items-center gap-2.5 text-base font-bold text-foreground">
                <HelpCircle className="size-4.5 text-primary" />
                {faq.question}
              </h3>
              <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground pl-7">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="cta-section border-t border-border/40 bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:flex lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Pronto para elevar o nível do seu escritório?
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Cadastre-se hoje e ganhe 14 dias de teste grátis. Configuração rápida em menos de 5 minutos.
            </p>
          </div>
          <div className="mt-8 flex gap-3 lg:mt-0 lg:flex-shrink-0">
            <Link
              href="/cadastrar"
              id="signup-footer-btn"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 hover:shadow-lg active:scale-95"
            >
              Criar Conta Grátis
            </Link>
            <Link
              href="/entrar"
              id="consult-footer-btn"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-6 text-sm font-semibold transition hover:bg-muted active:scale-95"
            >
              Falar com Consultor
            </Link>
          </div>
        </div>
        <footer className="border-t border-border/20 py-8 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="#sobre-nos" className="transition hover:text-foreground">Sobre nós</Link>
            <Link href="/planos" className="transition hover:text-foreground">Planos</Link>
            <Link href="/privacidade" className="transition hover:text-foreground">Privacidade</Link>
            <Link href="/termos" className="transition hover:text-foreground">Termos de uso</Link>
          </div>
          <p className="mt-4">&copy; {new Date().getFullYear()} Alfenus Tecnologia Jurídica Ltda. Todos os direitos reservados.</p>
        </footer>
      </section>
    </div>
  );
}
