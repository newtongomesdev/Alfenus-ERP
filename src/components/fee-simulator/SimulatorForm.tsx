"use client";

/**
 * SimulatorForm
 * Formulário de entrada para simulação de honorários
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SERVICE_CHARGING_MODELS,
  SERVICE_PRACTICE_AREAS,
} from "@/lib/service-catalog/constants";
import {
  FIELD_PLACEHOLDERS,
  getChargingModelConfig,
} from "@/lib/fee-simulator/constants";
import { formValueToCents } from "@/lib/fee-simulator/engine";
import type { SimulatorInput } from "@/lib/fee-simulator/types";
import type { ChargingModel } from "@/lib/service-catalog/types";

interface SimulatorFormProps {
  initialData?: SimulatorInput;
  onSimulate: (input: SimulatorInput) => void;
  isLoading?: boolean;
}

const SELECT_CLASSES =
  "w-full h-10 rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/50 dark:bg-input/30 dark:border-input";

export function SimulatorForm({
  initialData,
  onSimulate,
  isLoading,
}: SimulatorFormProps) {
  const [serviceName, setServiceName] = useState(initialData?.serviceName ?? "");
  const [chargingModel, setChargingModel] = useState<ChargingModel>(
    initialData?.chargingModel ?? "fixo"
  );
  const [practiceArea, setPracticeArea] = useState(
    initialData?.practiceArea ?? "civel"
  );
  const [baseValue, setBaseValue] = useState(
    initialData?.baseValueCents ? String(initialData.baseValueCents / 100).replace(".", ",") : ""
  );
  const [monthlyValue, setMonthlyValue] = useState(
    initialData?.monthlyValueCents ? String(initialData.monthlyValueCents / 100).replace(".", ",") : ""
  );
  const [hourlyRate, setHourlyRate] = useState(
    initialData?.hourlyRateCents ? String(initialData.hourlyRateCents / 100).replace(".", ",") : ""
  );
  const [estimatedHours, setEstimatedHours] = useState(
    initialData?.estimatedHours?.toString() ?? ""
  );
  const [unitPrice, setUnitPrice] = useState(
    initialData?.unitPriceCents ? String(initialData.unitPriceCents / 100).replace(".", ",") : ""
  );
  const [quantity, setQuantity] = useState(
    initialData?.quantity?.toString() ?? ""
  );
  const [successFeePercentage, setSuccessFeePercentage] = useState(
    initialData?.successFeePercentage?.toString() ?? ""
  );
  const [numberOfInstallments, setNumberOfInstallments] = useState(
    initialData?.numberOfInstallments?.toString() ?? ""
  );
  const [upfrontPercentage, setUpfrontPercentage] = useState(
    initialData?.upfrontPercentage?.toString() ?? ""
  );
  const [estimatedExpenses, setEstimatedExpenses] = useState(
    initialData?.estimatedExpensesCents
      ? String(initialData.estimatedExpensesCents / 100).replace(".", ",")
      : ""
  );

  const modelConfig = getChargingModelConfig(chargingModel);

  const showMensalidade = chargingModel === "mensalidade";
  const showPorHora = chargingModel === "por_hora";
  const showPorAtividade = chargingModel === "por_atividade";
  const showExito =
    chargingModel === "exito" || chargingModel === "hibrido";
  const showParcelado = chargingModel === "parcelado";
  const showBaseValue = !showMensalidade;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const input: SimulatorInput = {
      serviceName,
      chargingModel,
      practiceArea,
      baseValueCents: formValueToCents(baseValue),
      monthlyValueCents: showMensalidade ? formValueToCents(monthlyValue) : undefined,
      hourlyRateCents: showPorHora ? formValueToCents(hourlyRate) : undefined,
      estimatedHours: showPorHora && estimatedHours ? Number(estimatedHours) : undefined,
      unitPriceCents: showPorAtividade ? formValueToCents(unitPrice) : undefined,
      quantity: showPorAtividade && quantity ? Number(quantity) : undefined,
      successFeePercentage: showExito && successFeePercentage
        ? Number(successFeePercentage)
        : undefined,
      numberOfInstallments: showParcelado && numberOfInstallments
        ? Number(numberOfInstallments)
        : undefined,
      upfrontPercentage: showParcelado && upfrontPercentage
        ? Number(upfrontPercentage)
        : undefined,
      estimatedExpensesCents: formValueToCents(estimatedExpenses),
    };

    onSimulate(input);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurar Simulação</CardTitle>
        <p className="text-sm text-muted-foreground">
          Preencha os dados do serviço para gerar cenários de honorários
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Identificação */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Identificação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Nome do Serviço *</Label>
                <Input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: Consulta Inicial"
                  required
                />
              </div>
              <div>
                <Label>Modelo de Cobrança *</Label>
                <select
                  value={chargingModel}
                  onChange={(e) => setChargingModel(e.target.value as ChargingModel)}
                  className={SELECT_CLASSES}
                >
                  {SERVICE_CHARGING_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {modelConfig.description}
                </p>
              </div>
              <div>
                <Label>Área Jurídica *</Label>
                <select
                  value={practiceArea}
                  onChange={(e) => setPracticeArea(e.target.value)}
                  className={SELECT_CLASSES}
                >
                  {SERVICE_PRACTICE_AREAS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Valores */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Valores
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {showBaseValue && (
                <div>
                  <Label>Valor Base (R$) *</Label>
                  <Input
                    value={baseValue}
                    onChange={(e) => setBaseValue(e.target.value)}
                    placeholder={FIELD_PLACEHOLDERS.baseValueCents}
                  />
                </div>
              )}

              {showMensalidade && (
                <div>
                  <Label>Valor Mensal (R$) *</Label>
                  <Input
                    value={monthlyValue}
                    onChange={(e) => setMonthlyValue(e.target.value)}
                    placeholder={FIELD_PLACEHOLDERS.monthlyValueCents}
                  />
                </div>
              )}

              {showPorHora && (
                <>
                  <div>
                    <Label>Valor por Hora (R$) *</Label>
                    <Input
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder={FIELD_PLACEHOLDERS.hourlyRateCents}
                    />
                  </div>
                  <div>
                    <Label>Horas Estimadas *</Label>
                    <Input
                      type="number"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      placeholder={FIELD_PLACEHOLDERS.estimatedHours}
                    />
                  </div>
                </>
              )}

              {showPorAtividade && (
                <>
                  <div>
                    <Label>Preço por Atividade (R$) *</Label>
                    <Input
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      placeholder={FIELD_PLACEHOLDERS.unitPriceCents}
                    />
                  </div>
                  <div>
                    <Label>Quantidade *</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder={FIELD_PLACEHOLDERS.quantity}
                    />
                  </div>
                </>
              )}

              {showExito && (
                <div>
                  <Label>% de Êxito *</Label>
                  <Input
                    type="number"
                    value={successFeePercentage}
                    onChange={(e) => setSuccessFeePercentage(e.target.value)}
                    placeholder={FIELD_PLACEHOLDERS.successFeePercentage}
                  />
                </div>
              )}

              {showParcelado && (
                <>
                  <div>
                    <Label>Nº de Parcelas *</Label>
                    <Input
                      type="number"
                      value={numberOfInstallments}
                      onChange={(e) => setNumberOfInstallments(e.target.value)}
                      placeholder={FIELD_PLACEHOLDERS.numberOfInstallments}
                    />
                  </div>
                  <div>
                    <Label>Entrada (%)</Label>
                    <Input
                      type="number"
                      value={upfrontPercentage}
                      onChange={(e) => setUpfrontPercentage(e.target.value)}
                      placeholder={FIELD_PLACEHOLDERS.upfrontPercentage}
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Despesas Estimadas (R$)</Label>
                <Input
                  value={estimatedExpenses}
                  onChange={(e) => setEstimatedExpenses(e.target.value)}
                  placeholder={FIELD_PLACEHOLDERS.estimatedExpensesCents}
                />
              </div>
            </div>
          </div>

          {/* Ação */}
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isLoading} size="lg">
              {isLoading ? "Calculando..." : "Simular Honorários"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
