export const buildViewEvidence = (params: {
  view_id: string;
  filters?: Record<string, any>;
  records?: any[];
  label?: string;
  value?: number | string;
  kind?: string;
}) => ({
  source: `view.read:${params.view_id}`,
  kind: params.kind ?? "view",
  fetched_at: new Date().toISOString(),
  inputs: { view_id: params.view_id, filters: params.filters ?? {} },
  records: params.records,
  label: params.label,
  value: params.value,
});
