/**
 * Derive top N "biggest gaps" from scored_rubric: lowest-scoring categories,
 * each with its highest-impact incomplete rubric item.
 */
export interface GapItem {
  item: string;
  severity: 'high' | 'medium' | 'low';
}

const METADATA_KEYS = ['weight', 'Category_Name', 'maximum_point'];

function formatKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getTopGapsFromRubric(
  categories: { name: string; score: number }[],
  scoredRubric: Record<string, unknown> | null | undefined,
  maxGaps: number = 3
): GapItem[] {
  if (!scoredRubric || categories.length === 0 || maxGaps <= 0) return [];
  const sortedCategories = [...categories].sort((a, b) => a.score - b.score);
  const severities: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];
  const gaps: GapItem[] = [];

  for (let i = 0; i < Math.min(maxGaps, sortedCategories.length); i++) {
    const categoryName = sortedCategories[i].name;
    let best: { title: string; impact: number } | null = null;

    for (const [catKey, catVal] of Object.entries(scoredRubric)) {
      if (['totals', '_overall'].includes(catKey.toLowerCase())) continue;
      if (!catVal || typeof catVal !== 'object' || Array.isArray(catVal)) continue;
      const meta = catVal as Record<string, unknown>;
      const name = (meta.Category_Name as string) || formatKey(catKey);
      if (name !== categoryName) continue;

      for (const [subKey, subVal] of Object.entries(meta)) {
        if (METADATA_KEYS.includes(subKey) || !Array.isArray(subVal)) continue;
        for (const subItem of subVal) {
          if (!subItem || typeof subItem !== 'object' || !('options' in subItem)) continue;
          const maxPts = Number((subItem as { maximum_points?: number }).maximum_points ?? 0);
          const pts = Number((subItem as { Points?: number }).Points ?? 0);
          const impact = maxPts - pts;
          if (impact <= 0) continue;
          const title =
            (subItem as { Question?: string }).Question ||
            (subItem as { subcategory_name?: string }).subcategory_name ||
            '';
          if (!best || impact > best.impact) best = { title, impact };
        }
      }
    }

    if (best?.title) {
      gaps.push({
        item: best.title,
        severity: severities[i] ?? 'low',
      });
    }
  }

  return gaps;
}

/**
 * All rubric items that are not at max points (missing/incomplete), with severity
 * by category rank (worst category = high, next = medium, rest = low).
 */
export function getMissingItemsFromRubric(
  categories: { name: string; score: number }[],
  scoredRubric: Record<string, unknown> | null | undefined
): GapItem[] {
  if (!scoredRubric || categories.length === 0) return [];
  const sortedCategories = [...categories].sort((a, b) => a.score - b.score);
  const severityByCategory = new Map<string, 'high' | 'medium' | 'low'>();
  sortedCategories.forEach((c, i) => {
    severityByCategory.set(c.name, i === 0 ? 'high' : i === 1 ? 'medium' : 'low');
  });

  const items: GapItem[] = [];
  for (const [catKey, catVal] of Object.entries(scoredRubric)) {
    if (['totals', '_overall'].includes(catKey.toLowerCase())) continue;
    if (!catVal || typeof catVal !== 'object' || Array.isArray(catVal)) continue;
    const meta = catVal as Record<string, unknown>;
    const categoryName = (meta.Category_Name as string) || formatKey(catKey);
    const severity = severityByCategory.get(categoryName) ?? 'low';

    for (const [subKey, subVal] of Object.entries(meta)) {
      if (METADATA_KEYS.includes(subKey) || !Array.isArray(subVal)) continue;
      for (const subItem of subVal) {
        if (!subItem || typeof subItem !== 'object' || !('options' in subItem)) continue;
        const maxPts = Number((subItem as { maximum_points?: number }).maximum_points ?? 0);
        const pts = Number((subItem as { Points?: number }).Points ?? 0);
        if (maxPts <= 0 || pts >= maxPts) continue;
        const title =
          (subItem as { Question?: string }).Question ||
          (subItem as { subcategory_name?: string }).subcategory_name ||
          '';
        if (title) items.push({ item: title, severity });
      }
    }
  }
  return items;
}
