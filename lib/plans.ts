export const planIntervals = ['monthly', 'annual'] as const;
export type PlanInterval = (typeof planIntervals)[number];
