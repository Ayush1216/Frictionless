/**
 * Readiness rubric parsing & gap analysis utilities.
 */
export interface GapItem {
  item: string;
  category?: string;
  currentPoints?: number;
  maxPoints?: number;
  severity: 'high' | 'medium' | 'low';
}

/** Rubric item from scored_rubric (startup_readiness_results) */
export interface RubricItem {
  Question?: string;
  Answer?: string | null;
  Points?: number;
  Value?: string | null;
  Reasoning?: string | null;
  maximum_points?: number;
  Subtopic_Name?: string;
  [k: string]: unknown;
}

/** Parsed category from scored_rubric */
export interface ParsedRubricCategory {
  key: string;
  name: string;
  score: number;
  weight: number;
  maximumPoint: number;
  items: RubricItem[];
}

const METADATA_KEYS = ['weight', 'Category_Name', 'maximum_point'];
const SKIP_KEYS = ['totals', '_overall'];

export function formatCategoryKey(k: string): string {
  return k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Parse scored_rubric JSON into structured categories with rubric items.
 */
export function parseScoredRubric(rubric: Record<string, unknown>): ParsedRubricCategory[] {
  const result: ParsedRubricCategory[] = [];

  for (const [catKey, catVal] of Object.entries(rubric)) {
    if (SKIP_KEYS.includes(catKey.toLowerCase())) continue;
    if (!catVal || typeof catVal !== 'object' || Array.isArray(catVal)) continue;

    const meta = catVal as Record<string, unknown>;
    const categoryName = (meta.Category_Name as string) || formatCategoryKey(catKey);
    const weight = (meta.weight as number) ?? 0;
    const maximumPoint = (meta.maximum_point as number) ?? 100;

    const items: RubricItem[] = [];
    for (const [subKey, subVal] of Object.entries(meta)) {
      if (METADATA_KEYS.includes(subKey)) continue;
      if (!Array.isArray(subVal)) continue;
      for (const item of subVal) {
        if (item && typeof item === 'object' && 'options' in item) {
          items.push(item as RubricItem);
        }
      }
    }

    const totalPoints = items.reduce((sum, i) => sum + ((i.Points as number) ?? 0), 0);
    const totalMax = items.reduce((sum, i) => sum + ((i.maximum_points as number) ?? 0), 0);
    const score = totalMax > 0 ? Math.round((totalPoints / totalMax) * 100) : 0;

    result.push({ key: catKey, name: categoryName, score, weight, maximumPoint, items });
  }

  return result;
}

function formatKey(k: string): string {
  return formatCategoryKey(k);
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
