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
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const features = [
  {
    icon: Users,
    title: "Atendimento & CRM Jurídico",
    description:
      "Acompanhe novos contatos desde a primeira consulta até a assinatura do contrato. Previna conflitos de interesse e divulgue seu escritório com um Link da Bio profissional.",
  },
  {
    icon: Scale,
    title: "Controladoria de Processos",
    description:
      "Organize os processos judiciais e procedimentos administrativos da banca em um único local, com histórico de andamentos e acompanhamento de fases.",
  },
  {
    icon: CalendarClock,
    title: "Gestão Rigorosa de Prazos",
    description:
      "Evite a perda de datas fatais com contagem de prazos em dias úteis, calendários forenses integrados e alertas preventivos para a equipe antes das audiências.",
  },
  {
    icon: Sparkles,
    title: "Elaboração de Peças com IA",
    description:
      "Escreva minutas, petições e procurações em uma folha A4 virtual. Utilize a inteligência artificial para aprimorar fundamentos jurídicos e formalizar a redação antes de gerar o PDF.",
  },
  {
    icon: Banknote,
    title: "Financeiro & Honorários Jurídicos",
    description:
      "Controle honorários contratuais, parcelamentos de consultas, honorários sucumbenciais, cobrança por horas (*time tracking*) e reembolsos de custas processuais.",
  },
  {
    icon: UserCheck,
    title: "Portal Exclusivo para o Cliente",
    description:
      "Proporcione um espaço seguro para que seu cliente consulte o andamento resumido do caso e envie documentos com praticidade, reduzindo chamadas no WhatsApp.",
  },
];

const testimonials = [
  {
    quote:
      "O Alfenus trouxe a organização que nosso escritório precisava para expandir sem perder o controle dos prazos e a qualidade do atendimento prestado ao cliente.",
    author: "Dra. Mariana Vasconcelos",
    role: "Sócia-Fundadora, Vasconcelos & Associados",
  },
  {
    quote:
      "A facilidade para elaborar minutas de contratos e o controle de honorários mudaram nossa rotina. Ganhamos agilidade na produção de peças e clareza no fluxo financeiro.",
    author: "Dr. Roberto Mendes",
    role: "Diretor Operacional, Mendes Advogados",
  },
];

const faqs = [
  {
    question: "Como a Inteligência Artificial auxilia na elaboração de peças jurídicas?",
    answer:
      "O estúdio de documentos funciona como um editor de texto no formato visual exato de uma página A4. Você pode preencher dados do cliente com um clique, editar a minuta e utilizar a IA integrada para aprimorar a linguagem formal, revisar pontos de fundamentação ou resumir fatos, gerando o PDF pronto para uso.",
  },
  {
    question: "Como o Alfenus previne a perda de prazos e datas de audiências?",
    answer:
      "O sistema centraliza toda a agenda do escritório. Além do cálculo de prazos considerando dias úteis e feriados, você recebe alertas visuais na página inicial do sistema e avisos antecipados para que a equipe cumpra os compromissos com tranquilidade.",
  },
  {
    question: "Consigo organizar honorários contratuais, parcelados e sucumbenciais?",
    answer:
      "Sim! O módulo financeiro foi projetado para a contabilidade jurídica: acompanhe o recebimento de honorários fixos ou êxito, controle parcelamentos de consultas, registre horas trabalhadas em pareceres e lance custas processuais para reembolso pelo cliente.",
  },
  {
    question: "Como funciona o Portal do Cliente para o meu escritório?",
    answer:
      "Você pode disponibilizar aos seus clientes um link de acesso seguro onde eles consultam o andamento resumido de suas causas e enviam documentos solicitados. Isso transmite transparência e reduz o volume de mensagens cobrando atualizações.",
  },
  {
    question: "Os dados dos meus clientes e processos estão protegidos?",
    answer:
      "Com certeza. Mantemos um padrão rigoroso de segurança de dados e permissões de acesso por perfil de usuário, assegurando a confidencialidade exigida pela advocacia e o cumprimento da Lei Geral de Proteção de Dados (LGPD).",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 260, damping: 20 },
  },
};

export function LandingPageClient() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10 overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Scale className="size-5" />
            </div>
            <Link
              href="/"
              id="logo-link"
              className="text-xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
            >
              Alfenus
            </Link>
          </motion.div>

          <motion.nav
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <Link
              href="/entrar"
              id="login-header-btn"
              className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground hover:bg-muted/50"
            >
              Entrar
            </Link>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/cadastrar"
                id="signup-header-btn"
                className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 hover:shadow-md"
              >
                Começar Agora
              </Link>
            </motion.div>
          </motion.nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 py-20 lg:py-32">
        {/* Ambient Glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            repeat: Infinity,
            duration: 8,
            ease: "easeInOut",
          }}
          className="absolute top-1/4 left-1/2 -z-10 h-96 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[130px]"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-3xl space-y-6"
          >
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1 text-xs font-medium text-primary shadow-xs">
                <Sparkles className="size-3.5 text-primary animate-pulse" />
                <span>Tecnologia e Eficiência para Advocacia de Alto Padrão</span>
              </div>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.1]"
            >
              A gestão completa que devolve o tempo para{" "}
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                sua advocacia.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Centralize o atendimento a clientes, a controladoria de processos, a contagem rigorosa de prazos e a gestão de honorários em uma plataforma intuitiva, elegante e segura.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col gap-3.5 sm:flex-row pt-2">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/cadastrar"
                  id="signup-hero-btn"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 hover:shadow-xl w-full sm:w-auto"
                >
                  Experimentar Gratuitamente
                  <ArrowRight className="size-4" />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/entrar"
                  id="login-hero-btn"
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-6 text-sm font-semibold transition hover:bg-muted/80 hover:text-foreground w-full sm:w-auto"
                >
                  Acessar o Sistema
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="grid gap-3 pt-6 text-xs font-medium text-muted-foreground sm:grid-cols-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="size-4" />
                </div>
                Prazos Processuais sob Controle
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                  <LockKeyhole className="size-4" />
                </div>
                Sigilo Profissional Garantido
              </div>
              <div className="flex items-center gap-2.5">
                <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                  <FileText className="size-4" />
                </div>
                Honorários & Custas em Dia
              </div>
            </motion.div>
          </motion.div>

          {/* Interactive Panel Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 200 }}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
              className="relative rounded-2xl border border-border/50 bg-card p-6 shadow-2xl shadow-foreground/5 backdrop-blur-sm lg:p-8"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: "spring" }}
                className="absolute -top-4 -right-4 flex items-center gap-1.5 rounded-lg border bg-background/95 px-3 py-1.5 text-xs font-semibold shadow-md"
              >
                <TrendingUp className="size-3.5 text-emerald-600" />
                <span>+38% Produtividade</span>
              </motion.div>

              <div className="border-b border-border/40 pb-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Visão Geral da Banca</h3>
                    <p className="text-xs text-muted-foreground">Acompanhamento diário do escritório</p>
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
                  { label: "Clientes Atendidos", val: "142", desc: "Este mês (+12)" },
                  { label: "Processos Ativos", val: "57", desc: "3 atualizações hoje" },
                  { label: "Audiências Agendadas", val: "8", desc: "Próximos 7 dias" },
                  { label: "Honorários Faturados", val: "R$ 48.900", desc: "Meta mensal de 82%" },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className="rounded-xl border border-border/40 bg-muted/30 p-4 transition-all hover:bg-muted/50 hover:border-primary/20"
                  >
                    <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
                    <p className="mt-1 text-xl font-bold tracking-tight">{card.val}</p>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">{card.desc}</p>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-6 rounded-xl border border-border/40 bg-muted/20 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próximos Compromissos e Prazos Limite</p>
                <div className="mt-3.5 space-y-3 text-xs">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="font-medium">Contestação - Ação de Cobrança</span>
                    <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-semibold text-rose-600">Hoje</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="font-medium">Apelação Cível - TJSP</span>
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-semibold text-amber-600">Amanhã</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Audiência de Conciliação - 2ª Vara</span>
                    <span className="text-muted-foreground">Sexta às 14h</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto space-y-4 mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tudo o que seu escritório precisa em um único lugar</h2>
          <p className="text-muted-foreground">
            Elimine o uso de planilhas soltas e múltiplos sistemas. Tenha controle total da banca com clareza e agilidade.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative rounded-2xl border border-border/40 bg-card p-6 shadow-xs transition-all duration-300 hover:border-primary/30 hover:shadow-xl"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 font-bold tracking-tight text-foreground">{feature.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* About / Brand story */}
      <section id="sobre-nos" className="overflow-hidden border-y border-border/40 bg-muted/15 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, type: "spring", stiffness: 180 }}
            className="relative min-h-[360px] overflow-hidden rounded-2xl border border-primary/20 bg-primary p-8 text-primary-foreground shadow-xl shadow-primary/10 sm:p-10"
          >
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
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, type: "spring", stiffness: 180 }}
            className="max-w-2xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Sobre o Alfenus</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Tecnologia desenhada com respeito à tradição jurídica.</h2>
            <p className="mt-6 text-base leading-relaxed text-muted-foreground">
              O Alfenus nasceu para resolver o principal desafio dos escritórios modernos: a sobrecarga com rotinas administrativas repetitivas. Desenvolvemos uma plataforma que organiza a rotina do seu escritório, trazendo clareza para a tomada de decisões e garantindo o sigilo que a profissão exige.
            </p>
            <div className="mt-8 grid gap-6 border-t border-border/60 pt-8 sm:grid-cols-3">
              <div>
                <Compass className="size-5 text-primary" />
                <p className="mt-3 font-semibold">Direção</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Menos dispersão. Mais foco na tese jurídica e no trabalho que importa.</p>
              </div>
              <div>
                <LockKeyhole className="size-5 text-primary" />
                <p className="mt-3 font-semibold">Confiança</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Dados dos clientes tratados com sigilo, contexto e responsabilidade.</p>
              </div>
              <div>
                <Scale className="size-5 text-primary" />
                <p className="mt-3 font-semibold">Equilíbrio</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Automação para a rotina burocrática, discernimento para as decisões.</p>
              </div>
            </div>
            <div className="mt-8 rounded-xl border border-primary/15 bg-background/70 p-5">
              <p className="text-sm font-semibold">De onde vem o nome?</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Alfenus é uma referência a Publius Alfenus Varus, jurista romano associado à obra <em>Digesta</em>. O título remete à ideia de reunir, ordenar e interpretar questões jurídicas complexas. Essa é a inspiração do produto: transformar informação espalhada em uma visão organizada e útil para o escritório.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust / Testimonials */}
      <section className="border-t border-border/40 bg-muted/10 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-2xl font-bold tracking-tight">O que dizem os advogados que utilizam o Alfenus</h2>
            <p className="mt-2 text-sm text-muted-foreground">A aprovação de bancas e profissionais que prezam pela excelência e organização.</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 max-w-5xl mx-auto">
            {testimonials.map((t, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                whileHover={{ y: -4 }}
                className="flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-8 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
              >
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section with Motion Accordion */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-bold tracking-tight">Perguntas Frequentes</h2>
          <p className="mt-2 text-sm text-muted-foreground">Respostas para as principais dúvidas dos advogados.</p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="rounded-2xl border border-border/40 bg-card shadow-xs overflow-hidden transition-all hover:border-primary/30"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-6 text-left cursor-pointer focus:outline-none"
                >
                  <h3 className="flex items-center gap-2.5 text-base font-bold text-foreground">
                    <HelpCircle className="size-4.5 text-primary shrink-0" />
                    <span>{faq.question}</span>
                  </h3>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="shrink-0 ml-4 text-muted-foreground"
                  >
                    <ChevronDown className="size-5" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="px-6 pb-6 pt-0 text-sm leading-relaxed text-muted-foreground pl-13 border-t border-border/20 mt-2">
                        <p className="pt-3">{faq.answer}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA Footer Section */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="border-t border-border/40 bg-card"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:flex lg:items-center lg:justify-between lg:px-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Pronto para transformar a gestão do seu escritório?
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Experimente gratuitamente por 14 dias sem compromisso. Comece a organizar sua banca em poucos minutos.
            </p>
          </div>
          <div className="mt-8 flex gap-3 lg:mt-0 lg:flex-shrink-0">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/cadastrar"
                id="signup-footer-btn"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md transition hover:bg-primary/90 hover:shadow-lg"
              >
                Criar Conta Grátis
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Link
                href="/entrar"
                id="consult-footer-btn"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-6 text-sm font-semibold transition hover:bg-muted"
              >
                Acessar o Sistema
              </Link>
            </motion.div>
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
      </motion.section>
    </div>
  );
}
