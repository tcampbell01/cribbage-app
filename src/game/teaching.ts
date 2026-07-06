import { ScoreResult } from './scoring';

const CATEGORY_LABELS = {
  fifteens: 'Fifteens',
  pairs: 'Pairs',
  runs: 'Runs',
  flush: 'Flush',
  nobs: 'Nobs',
};

export function formatScoreBreakdown(score: ScoreResult) {
  if (score.items.length === 0) return ['No scoring combinations. Total: 0.'];

  return [
    ...score.items.map((item) => `${CATEGORY_LABELS[item.category]}: ${item.label} (${item.points})`),
    `Total: ${score.total}`,
  ];
}
