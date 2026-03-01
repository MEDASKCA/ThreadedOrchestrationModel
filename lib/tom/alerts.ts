import { TOM_THRESHOLDS } from "./thresholds";
import type { Pathway } from "@/lib/pathways/schema";
import type { StockItem } from "@/lib/integrations/types";

export type TomAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  source: string;
};

export const evaluatePathwayAlerts = (pathways: Pathway[]): TomAlert[] => {
  const alerts: TomAlert[] = [];
  const breaching = pathways.filter((p) => p.rtt_status === "breaching");
  const atRisk = pathways.filter((p) => p.rtt_status === "at_risk");
  const stagnant = pathways.filter((p) => {
    const days = Math.floor((Date.now() - new Date(p.last_activity_date).getTime()) / (1000 * 60 * 60 * 24));
    return days > TOM_THRESHOLDS.stagnantDays;
  });

  if (breaching.length >= TOM_THRESHOLDS.ptlBreaching) {
    alerts.push({
      id: `ptl-breach-${breaching.length}`,
      severity: "critical",
      title: "RTT breaches detected",
      detail: `${breaching.length} pathways breaching RTT targets`,
      source: "EPR/PTL",
    });
  }

  if (atRisk.length >= TOM_THRESHOLDS.ptlAtRisk) {
    alerts.push({
      id: `ptl-risk-${atRisk.length}`,
      severity: "warning",
      title: "RTT at-risk pathways",
      detail: `${atRisk.length} pathways at risk of breach`,
      source: "EPR/PTL",
    });
  }

  if (stagnant.length > 0) {
    alerts.push({
      id: `ptl-stagnant-${stagnant.length}`,
      severity: "warning",
      title: "Stagnant pathways",
      detail: `${stagnant.length} pathways have no activity in >${TOM_THRESHOLDS.stagnantDays} days`,
      source: "EPR/PTL",
    });
  }

  return alerts;
};

export const evaluateInventoryAlerts = (stock: StockItem[]): TomAlert[] => {
  const low = stock.filter((item) => item.quantity < item.minLevel);
  if (low.length < TOM_THRESHOLDS.lowStockCount) return [];
  return [
    {
      id: `stock-low-${low.length}`,
      severity: "warning",
      title: "Low stock items",
      detail: `${low.length} items below minimum stock level`,
      source: "Inventory",
    },
  ];
};

export const evaluateAlerts = (pathways: Pathway[], stock: StockItem[]) => {
  return [...evaluatePathwayAlerts(pathways), ...evaluateInventoryAlerts(stock)];
};
