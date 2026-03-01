export function shouldRouteConversationalDefault(params: {
  intent: string;
  selectedTools: string[];
  hasViableViewCandidates: boolean;
  isExplicitMetricQuery: boolean;
  isIntegrationCoverageQuery: boolean;
  isPendingWorkQuery: boolean;
  isPlanningLikeQuery: boolean;
  antiFallbackIntent: boolean;
}): boolean {
  return (
    !params.isPendingWorkQuery &&
    !params.isPlanningLikeQuery &&
    !params.antiFallbackIntent &&
    !params.isExplicitMetricQuery &&
    !params.isIntegrationCoverageQuery &&
    params.selectedTools.length === 0 &&
    !params.hasViableViewCandidates &&
    (
      params.intent === "operational_query" ||
      params.intent === "governance_query" ||
      params.intent === "unsupported_domain"
    )
  );
}
