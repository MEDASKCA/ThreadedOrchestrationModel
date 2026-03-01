import { useState } from "react";

export type OpsSummary = {
  pathwaysTotal: number;
  breaching: number;
  atRisk: number;
  urgent: number;
};

export type LogisticsSummary = {
  shiftsTotal: number;
  unfilledShifts: number;
  lowStockItems: number;
};

export const useOpsSummary = (initial: OpsSummary) => {
  const [summary, setSummary] = useState(initial);
  return { summary, setSummary };
};

export const useLogisticsSummary = (initial: LogisticsSummary) => {
  const [summary, setSummary] = useState(initial);
  return { summary, setSummary };
};
