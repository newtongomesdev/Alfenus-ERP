import { describe, it, expect } from "vitest";

import { FUNNEL_STAGES, type FunnelStageId } from "./pipeline-utils";

describe("Pipeline / CRM Funnel", () => {
  describe("FUNNEL_STAGES", () => {
    it("definiu 6 estágios do funil", () => {
      expect(FUNNEL_STAGES).toHaveLength(6);
    });

    it("cada estágio tem id, label e color", () => {
      FUNNEL_STAGES.forEach((stage) => {
        expect(stage.id).toBeTruthy();
        expect(stage.label).toBeTruthy();
        expect(stage.color).toBeTruthy();
      });
    });

    it("estágios cobrem todo o ciclo de vida", () => {
      const ids = FUNNEL_STAGES.map((s) => s.id);
      expect(ids).toContain("novo");
      expect(ids).toContain("contato");
      expect(ids).toContain("proposta");
      expect(ids).toContain("negociacao");
      expect(ids).toContain("fechado_ganho");
      expect(ids).toContain("fechado_perdido");
    });

    it("fechado_ganho e fechado_perdido são estágios finais", () => {
      const lastTwo = FUNNEL_STAGES.slice(-2).map((s) => s.id);
      expect(lastTwo).toContain("fechado_ganho");
      expect(lastTwo).toContain("fechado_perdido");
    });
  });

  describe("Probabilidade por estágio", () => {
    const probabilityMap: Record<FunnelStageId, number> = {
      novo: 10,
      contato: 25,
      proposta: 50,
      negociacao: 75,
      fechado_ganho: 100,
      fechado_perdido: 0,
    };

    it("probabilidade aumenta ao avançar no funil", () => {
      expect(probabilityMap.novo).toBeLessThan(probabilityMap.contato);
      expect(probabilityMap.contato).toBeLessThan(probabilityMap.proposta);
      expect(probabilityMap.proposta).toBeLessThan(probabilityMap.negociacao);
      expect(probabilityMap.negociacao).toBeLessThan(probabilityMap.fechado_ganho);
    });

    it("fechado_ganho tem 100% de probabilidade", () => {
      expect(probabilityMap.fechado_ganho).toBe(100);
    });

    it("fechado_perdido tem 0% de probabilidade", () => {
      expect(probabilityMap.fechado_perdido).toBe(0);
    });

    it("todos os valores são entre 0 e 100", () => {
      Object.values(probabilityMap).forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("Pipeline column aggregation", () => {
    it("calcula valor total por estágio", () => {
      const leads = [
        { funnelStage: "novo", estimatedValueCents: 100_00 },
        { funnelStage: "novo", estimatedValueCents: 200_00 },
        { funnelStage: "proposta", estimatedValueCents: 500_00 },
      ];

      const columns = FUNNEL_STAGES.map((stage) => {
        const stageLeads = leads.filter((l) => l.funnelStage === stage.id);
        return {
          stage,
          leads: stageLeads,
          totalValue: stageLeads.reduce((sum, l) => sum + l.estimatedValueCents, 0),
        };
      });

      const novoCol = columns.find((c) => c.stage.id === "novo")!;
      expect(novoCol.leads).toHaveLength(2);
      expect(novoCol.totalValue).toBe(300_00);

      const propostaCol = columns.find((c) => c.stage.id === "proposta")!;
      expect(propostaCol.leads).toHaveLength(1);
      expect(propostaCol.totalValue).toBe(500_00);

      const contatoCol = columns.find((c) => c.stage.id === "contato")!;
      expect(contatoCol.leads).toHaveLength(0);
      expect(contatoCol.totalValue).toBe(0);
    });

    it("filtra leads por status ativo", () => {
      const allLeads = [
        { status: "novo", funnelStage: "novo" },
        { status: "em_atendimento", funnelStage: "contato" },
        { status: "qualificado", funnelStage: "proposta" },
        { status: "convertido", funnelStage: "fechado_ganho" },
        { status: "arquivado", funnelStage: "novo" },
      ];

      const activeStatuses = ["novo", "em_atendimento", "qualificado"];
      const active = allLeads.filter((l) => activeStatuses.includes(l.status));
      expect(active).toHaveLength(3);
    });
  });
});
