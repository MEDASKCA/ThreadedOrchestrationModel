export interface ViewSpec {
  id: string;
  section: string;
  label: string;
  implemented: boolean;
  read?: (params: { filters?: Record<string, any> }) => Promise<{ data: any; evidence: any[] }>;
  notes?: string;
}
