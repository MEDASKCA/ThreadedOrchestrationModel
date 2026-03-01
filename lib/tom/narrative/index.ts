export const buildPtlNarrative = (counts: Record<string, number>) => {
  const inPool = counts.in_pool ?? 0;
  const urgent = counts.urgent ?? 0;
  const breaching = counts.breaching ?? 0;
  const atRisk = counts.at_risk ?? 0;
  const onTrack = counts.on_track ?? 0;

  const headline = breaching > 0
    ? `Here is what stands out: ${breaching} pathways are breaching and need attention now.`
    : atRisk > 0
      ? `Here is what stands out: no breaches right now, but ${atRisk} pathways are at risk.`
      : "Here is what stands out: everything is on track with no current breaches or at-risk cases.";

  const detail = `At a glance: ${inPool} in pool, ${urgent} urgent, ${breaching} breaching, ${atRisk} at risk, ${onTrack} on track.`;

  return `${headline} ${detail}`;
};

export const buildStaffingNarrative = (connected: boolean) => {
  return connected
    ? "Staffing is connected, but the analytics are not mapped into TOM yet."
    : "I don't have staffing data connected yet.";
};

export const buildSmalltalkNarrative = () => {
  return "Hi - how can I help?";
};
