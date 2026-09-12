"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MeuEscritorioOverview } from "@/lib/solo-pro/types";
import { OfficeHealthCard } from "./office-health-card";
import { RecommendationList } from "./recommendation-list";
import { formatCurrencyFromCents } from "@/lib/formatters";
import {
  Sun, Users, Briefcase, DollarSign, TrendingUp,
  Plus, ArrowRight, FileText, Phone, ClipboardList, Receipt,
  AlertCircle, Clock,
} from "lucide-react";
import Link from "next/link";

interface MeuEscritorioProps {
  overview: MeuEscritorioOverview;
  onRefresh?: () => void;
}

export function MeuEscritorio({ overview, onRefresh }: MeuEscritorioProps) {
  const [activeTab, setActiveTab] = useState("hoje");

  const health = overview.health;

  // Tab definitions with icons
  const tabs = [
    { key: "hoje", label: "Hoje", icon: Sun },
    { key: "clientes", label: "Clientes", icon: Users },
    { key: "juridico", label: "Jurídico", icon: Briefcase },
    { key: "financeiro", label: "Financeiro", icon: DollarSign },
    { key: "crescimento", label: "Crescimento", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Meu Escritório</h1>
        <p className="text-sm text-muted-foreground">
          Visão central de saúde e operação do seu escritório.
        </p>
      </div>

      {/* Health Card */}
      <OfficeHealthCard health={health} />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="flex items-center gap-1">
              <tab.icon className="size-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* HOJE */}
        <TabsContent value="hoje" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Summary Cards */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tarefas para hoje</p>
                    <p className="text-2xl font-bold">{overview.today.tasks}</p>
                  </div>
                  <Clock className="size-8 text-blue-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Prazos próximos</p>
                    <p className="text-2xl font-bold">{overview.today.deadlines}</p>
                  </div>
                  <AlertCircle className="size-8 text-orange-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Retornos pendentes</p>
                    <p className="text-2xl font-bold">{overview.today.followUps}</p>
                  </div>
                  <Phone className="size-8 text-green-500 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Atendimentos</p>
                    <p className="text-2xl font-bold">{overview.today.appointments}</p>
                  </div>
                  <ClipboardList className="size-8 text-purple-500 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Recommendations */}
          <RecommendationList
            recommendations={overview.recommendations}
            onRefresh={onRefresh}
          />
        </TabsContent>

        {/* CLIENTES */}
        <TabsContent value="clientes" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Clientes ativos</p>
                <p className="text-2xl font-bold">{overview.clients.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Sem contato</p>
                <p className="text-2xl font-bold text-orange-600">{overview.clients.withoutContact}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Aguardando retorno</p>
                <p className="text-2xl font-bold text-yellow-600">{overview.clients.pendingReturn}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-red-600">{overview.clients.inactiveDays}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ações rápidas de clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Link href="/clientes/novo">
                  <Button variant="outline" size="sm">
                    <Plus className="size-4 mr-1" />
                    Novo Cliente
                  </Button>
                </Link>
                <Link href="/atendimentos/novo">
                  <Button variant="outline" size="sm">
                    <ClipboardList className="size-4 mr-1" />
                    Ficha Atendimento
                  </Button>
                </Link>
                <Link href="/retornos/novo">
                  <Button variant="outline" size="sm">
                    <Phone className="size-4 mr-1" />
                    Agendar Retorno
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <RecommendationList
            recommendations={overview.recommendations.filter(
              (r) => r.recommendation_type === "clientes"
            )}
            onRefresh={onRefresh}
          />
        </TabsContent>

        {/* JURÍDICO */}
        <TabsContent value="juridico" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Processos ativos</p>
                <p className="text-2xl font-bold">{overview.legal.activeCases}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Sem próxima ação</p>
                <p className="text-2xl font-bold text-orange-600">{overview.legal.pendingAction}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Prazos atrasados</p>
                <p className="text-2xl font-bold text-red-600">{overview.legal.overdueDeadlines}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Propostas pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{overview.legal.pendingProposals}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ações rápidas jurídicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Link href="/processos/novo">
                  <Button variant="outline" size="sm">
                    <Briefcase className="size-4 mr-1" />
                    Novo Caso
                  </Button>
                </Link>
                <Link href="/propostas/nova">
                  <Button variant="outline" size="sm">
                    <FileText className="size-4 mr-1" />
                    Nova Proposta
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <RecommendationList
            recommendations={overview.recommendations.filter(
              (r) => r.recommendation_type === "juridico"
            )}
            onRefresh={onRefresh}
          />
        </TabsContent>

        {/* FINANCEIRO */}
        <TabsContent value="financeiro" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Recebido no mês</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrencyFromCents(overview.financial.receivedMonth)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Previsto no mês</p>
                <p className="text-2xl font-bold">
                  {formatCurrencyFromCents(overview.financial.expectedMonth)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Em atraso</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrencyFromCents(overview.financial.overdueAmount)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Saldo estimado</p>
                <p className={`text-2xl font-bold ${overview.financial.cashflowBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrencyFromCents(overview.financial.cashflowBalance)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ações rápidas financeiras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Link href="/recibos/novo">
                  <Button variant="outline" size="sm">
                    <Receipt className="size-4 mr-1" />
                    Emitir Recibo
                  </Button>
                </Link>
                <Link href="/propostas/nova">
                  <Button variant="outline" size="sm">
                    <FileText className="size-4 mr-1" />
                    Nova Proposta
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <RecommendationList
            recommendations={overview.recommendations.filter(
              (r) => r.recommendation_type === "financeiro"
            )}
            onRefresh={onRefresh}
          />
        </TabsContent>

        {/* CRESCIMENTO */}
        <TabsContent value="crescimento" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Indicações</p>
                <p className="text-2xl font-bold">{overview.growth.referralClients}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Taxa de conversão</p>
                <p className="text-2xl font-bold">
                  {overview.growth.conversionRate > 0 ? `${overview.growth.conversionRate}%` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Capacidade usada</p>
                <p className="text-2xl font-bold">{overview.growth.capacityUsedPercent}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Pronta para contratar?</p>
                <p className={`text-2xl font-bold ${overview.growth.hireReadiness >= 70 ? "text-green-600" : "text-orange-600"}`}>
                  {overview.growth.hireReadiness > 0 ? `${overview.growth.hireReadiness}%` : "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recomendações de crescimento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Continue expandindo sua base de clientes e estruturando sua operação. O sistema irá gerar recomendações com base nos seus dados.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Atalhos rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
            {overview.quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-muted-foreground">{action.label}</span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-md bg-muted/50 p-3">
        <p className="text-xs text-muted-foreground">
          <strong>Aviso:</strong> Esta ferramenta organiza os parâmetros definidos pelo próprio profissional.
          Revise os valores conforme o caso, a regulamentação aplicável e sua estratégia profissional.
          Não constituí aconselhamento jurídico, financeiro ou contábil.
        </p>
      </div>
    </div>
  );
}