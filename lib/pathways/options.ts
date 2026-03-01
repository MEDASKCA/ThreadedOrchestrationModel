import { Pathway } from "./schema";

const uniq = (values: string[]) => Array.from(new Set(values)).sort();

export const buildFilterOptions = (pathways: Pathway[]) => {
  return {
    specialties: uniq(pathways.map((p) => p.specialty)),
    consultants: uniq(pathways.map((p) => p.consultant)),
    sites: uniq(pathways.map((p) => p.site)),
  };
};
