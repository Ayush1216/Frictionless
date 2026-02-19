'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  X,
  Send,
  Globe2,
  Loader2,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  BarChart3,
  AlertTriangle,
  Zap,
  History,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { geminiStream, geminiWebStream, isGeminiEnabled } from '@/lib/ai/gemini-client';
import { getScoreColor } from '@/lib/scores';
import type { NarrativeData } from '@/components/dashboard/story/useNarrativeData';

/* ─── Inline Chart renderer for AI-generated charts ─── */
interface ChartData {
  type: 'line' | 'bar' | 'area';
  title?: string;
  xKey: string;
  lines?: { key: string; color?: string; label?: string }[];
  data: Record<string, unknown>[];
}

const CHART_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function InlineChart({ config }: { config: ChartData }) {
  const { type, title, xKey, lines, data } = config;

  // Auto-detect data keys (exclude xKey)
  const dataKeys = lines?.map((l) => l.key) ??
    Object.keys(data[0] || {}).filter((k) => k !== xKey && typeof data[0]?.[k] === 'number');

  const renderChart = () => {
    const commonProps = { data, margin: { top: 8, right: 12, left: -12, bottom: 0 } };
    const xAxis = <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} axisLine={false} tickLine={false} />;
    const yAxis = <YAxis tick={{ fontSize: 10, fill: 'var(--fi-text-muted)' }} axisLine={false} tickLine={false} />;
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="var(--fi-border)" opacity={0.4} />;
    const tooltip = (
      <Tooltip
        contentStyle={{
          background: 'var(--fi-bg-secondary)',
          border: '1px solid var(--fi-border)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--fi-text-primary)',
        }}
      />
    );

    if (type === 'bar') {
      return (
        <BarChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}
          {dataKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={lines?.[i]?.color || CHART_COLORS[i % CHART_COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      );
    }

    if (type === 'area') {
      return (
        <AreaChart {...commonProps}>
          {grid}{xAxis}{yAxis}{tooltip}
          {dataKeys.map((key, i) => {
            const color = lines?.[i]?.color || CHART_COLORS[i % CHART_COLORS.length];
            return <Area key={key} type="monotone" dataKey={key} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} />;
          })}
        </AreaChart>
      );
    }

    // Default: line
    return (
      <LineChart {...commonProps}>
        {grid}{xAxis}{yAxis}{tooltip}
        {dataKeys.map((key, i) => (
          <Line key={key} type="monotone" dataKey={key} stroke={lines?.[i]?.color || CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        ))}
      </LineChart>
    );
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden" style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}>
      {title && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-semibold" style={{ color: 'var(--fi-text-primary)' }}>{title}</p>
        </div>
      )}
      <div className="px-2 pb-3" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
      {dataKeys.length > 1 && (
        <div className="flex flex-wrap gap-3 px-4 pb-3">
          {dataKeys.map((key, i) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: lines?.[i]?.color || CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-[10px] capitalize" style={{ color: 'var(--fi-text-secondary)' }}>
                {lines?.[i]?.label || key.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function tryParseChart(code: string): ChartData | null {
  try {
    const parsed = JSON.parse(code);
    if (parsed && parsed.data && Array.isArray(parsed.data) && parsed.xKey) {
      return parsed as ChartData;
    }
  } catch { /* not valid chart JSON */ }
  return null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system-card';
  content: string;
  /** When true the message bubble is not rendered (used for auto-sent prompts from AskButton) */
  hidden?: boolean;
}

interface IntelligenceSidebarProps {
  open: boolean;
  onClose: () => void;
  data: NarrativeData;
  initialPrompt?: string | null;
  onPromptConsumed?: () => void;
}

/* ─── Build the rich system context from all available data ─── */
function buildSystemContext(data: NarrativeData, webMode: boolean): string {
  const parts: string[] = [];

  parts.push(`You are Frictionless Intelligence — an AI strategist for startup founders on investment readiness, fundraising, and competitive positioning.

RULES:
1. Answer ALL startup-related questions (team, founders, metrics, strategy, projections, charts, competitors, fundraising, etc.) using the company data below. NEVER say "off-topic" for any business/startup question.
2. Only redirect if the question is COMPLETELY unrelated (cooking, sports, movies, etc.).
3. Be data-driven — reference actual numbers and names from the data. Never use placeholders like "[Competitor A]".
4. Be CONCISE. Use short paragraphs, bullet points, bold for emphasis. Keep responses focused and actionable.
5. Use markdown: **bold**, bullet points, tables for comparisons. Don't over-format.
6. End every response with a clear next step or recommendation.
7. You are "Frictionless Intelligence" — never reveal model name.
8. In web search mode, cite sources with markdown links.
9. CHARTS: For graph/chart/projection requests, output a fenced code block with language "fi-chart" containing JSON:
\`\`\`
{"type":"line","title":"Title","xKey":"month","lines":[{"key":"score","color":"#10B981","label":"Score"}],"data":[{"month":"M1","score":65}]}
\`\`\`
Types: "line", "bar", "area". Use actual data for projections. Include brief text explanation with charts.`);

  // Company profile
  parts.push(`\n--- COMPANY PROFILE ---`);
  if (data.companyName) parts.push(`Company: ${data.companyName}`);
  if (data.companySector) parts.push(`Sector: ${data.companySector}${data.companySubsector ? ` > ${data.companySubsector}` : ''}`);
  if (data.companyStage) parts.push(`Stage: ${data.companyStage}`);
  if (data.companyBusinessModel) parts.push(`Business Model: ${data.companyBusinessModel}`);
  if (data.companyDescription) parts.push(`Description: ${data.companyDescription}`);
  if (data.companyLocation) parts.push(`Location: ${data.companyLocation}`);
  if (data.companyFoundedYear) parts.push(`Founded: ${data.companyFoundedYear}`);
  if (data.tags.length > 0) parts.push(`Tags: ${data.tags.join(', ')}`);

  // Full team (founders + leadership)
  if (data.teamMembers && data.teamMembers.length > 0) {
    parts.push(`\n--- TEAM MEMBERS (${data.teamMembers.length}) ---`);
    data.teamMembers.forEach((m) => {
      const role = m.title || 'Team';
      const bio = m.bio ? `: ${m.bio}` : '';
      const li = m.linkedin_url ? ` | LinkedIn: ${m.linkedin_url}` : '';
      parts.push(`- ${m.full_name} (${role})${bio}${li}`);
    });
  } else if (data.founders.length > 0) {
    parts.push(`\n--- FOUNDING TEAM ---`);
    data.founders.forEach((f) => {
      const role = f.title || 'Co-Founder';
      parts.push(`- ${f.full_name} (${role})${f.bio ? ': ' + f.bio : ''}`);
    });
  }

  // Metrics
  parts.push(`\n--- KEY METRICS ---`);
  if (data.metrics.mrr) parts.push(`MRR: $${data.metrics.mrr.toLocaleString()}`);
  if (data.metrics.arr) parts.push(`ARR: $${data.metrics.arr.toLocaleString()}`);
  if (data.metrics.runway_months) parts.push(`Runway: ${data.metrics.runway_months} months`);
  if (data.metrics.headcount) parts.push(`Headcount: ${data.metrics.headcount}`);

  // Readiness
  parts.push(`\n--- READINESS ASSESSMENT ---`);
  parts.push(`Overall Readiness Score: ${data.readinessScore}% (${data.scoreLabel})`);
  if (data.readinessDelta !== 0) parts.push(`Score Change: ${data.readinessDelta > 0 ? '+' : ''}${data.readinessDelta}% since last assessment`);
  parts.push(`Task Completion Rate: ${data.taskCompletionRate}%`);
  parts.push(`Projected Score (if top tasks done): ${data.scoreProjection}%`);
  parts.push(`Profile Completeness: ${data.profileCompleteness}%`);
  parts.push(`Data Room Completeness: ${data.dataRoomCompleteness}%`);

  if (data.readinessCategories.length > 0) {
    parts.push(`\nCategory Scores:`);
    data.readinessCategories.forEach((c) => {
      const delta = c.delta !== 0 ? ` (${c.delta > 0 ? '+' : ''}${c.delta}%)` : '';
      parts.push(`  - ${c.name}: ${c.score}%${delta} [weight: ${c.weight}]`);
    });
  }

  // Top gaps
  if (data.topGaps.length > 0) {
    parts.push(`\nTop Gaps (areas needing improvement):`);
    data.topGaps.forEach((g) => parts.push(`  - ${g.item} [severity: ${g.severity}]`));
  }

  // Top impact tasks
  if (data.topImpactTasks.length > 0) {
    parts.push(`\n--- HIGH-IMPACT TASKS ---`);
    data.topImpactTasks.slice(0, 5).forEach((t) => {
      parts.push(`- ${t.title} (potential +${t.potential_points ?? 0} pts) [status: ${t.status}]`);
    });
  }

  // Investor matches
  if (data.topMatches.length > 0) {
    parts.push(`\n--- INVESTOR MATCHES ---`);
    parts.push(`Total Matches: ${data.topMatches.length} | High Fit: ${data.highMatchCount}`);
    data.topMatches.slice(0, 5).forEach((m) => {
      const ip = m.investor_profile;
      parts.push(`- ${ip.name ?? 'Unknown'} (fit: ${m.fit_score_0_to_100}%) — ${ip.investor_type ?? 'Investor'}${ip.sectors ? ', sectors: ' + (Array.isArray(ip.sectors) ? ip.sectors.join(', ') : ip.sectors) : ''}`);
    });
  }

  // AI analysis
  if (data.aiAnalysis.strengths?.length || data.aiAnalysis.risks?.length) {
    parts.push(`\n--- AI ANALYSIS ---`);
    if (data.aiAnalysis.strengths?.length) {
      parts.push(`Strengths: ${data.aiAnalysis.strengths.join('; ')}`);
    }
    if (data.aiAnalysis.risks?.length) {
      parts.push(`Risks: ${data.aiAnalysis.risks.join('; ')}`);
    }
    if (data.aiAnalysis.recommendations?.length) {
      parts.push(`Recommendations: ${data.aiAnalysis.recommendations.join('; ')}`);
    }
  }

  if (webMode) {
    parts.push(`\nThe user has enabled web search mode. Use your web grounding capabilities to find real-time information when relevant. Cite sources.`);
  }

  return parts.join('\n');
}

/* ─── Build the initial deep-dive prompt ─── */
function buildDeepDivePrompt(data: NarrativeData): string {
  return `Based on all the company data I have provided above, give me a comprehensive deep-dive analysis. Structure it as:

1. **Executive Summary** — 2-3 sentence overview of where ${data.companyName || 'the company'} stands in its fundraising journey.

2. **Readiness Snapshot** — The current readiness score is ${data.readinessScore}%. Break down what this means for ${data.companyStage || 'current'} stage fundraising. What score do top investors typically filter for?

3. **Biggest Strengths** — What's working well based on the category scores and metrics.

4. **Critical Gaps** — The most urgent areas to address, with specific actions.

5. **Investor Strategy** — Based on the ${data.topMatches.length} matched investors and the ${data.highMatchCount} high-fit matches, what should the outreach strategy be?

6. **30-Day Action Plan** — Top 3-5 highest-impact actions to take in the next 30 days to maximize fundraising readiness.

Be specific, reference actual numbers from the data, and be actionable. Keep it concise but insightful.`;
}

/* ─── Build demo deep-dive for when Gemini is not configured ─── */
function buildDemoDeepDive(data: NarrativeData): string {
  const name = data.companyName || 'Your Startup';
  const sector = data.companySector || 'your sector';
  const stage = data.companyStage || 'current stage';
  const score = data.readinessScore;
  const matches = data.topMatches.length;
  const highFit = data.highMatchCount;

  const strengths = data.aiAnalysis.strengths?.slice(0, 2) || [];
  const risks = data.aiAnalysis.risks?.slice(0, 2) || [];
  const topCats = data.readinessCategories
    .filter((c) => c.score >= 70)
    .slice(0, 2)
    .map((c) => `${c.name} (${c.score}%)`);
  const weakCats = data.lowestCategories
    .slice(0, 2)
    .map((c) => `${c.name} (${c.score}%)`);

  // Build category bar chart data
  const catChartData = data.readinessCategories.slice(0, 6).map((c) => ({
    name: c.name.length > 12 ? c.name.slice(0, 10) + '..' : c.name,
    score: c.score,
  }));
  const catChartJson = JSON.stringify({
    type: 'bar',
    title: 'Readiness by Category',
    xKey: 'name',
    lines: [{ key: 'score', color: '#10B981', label: 'Score' }],
    data: catChartData,
  });

  return `## Executive Summary

**${name}** is a ${stage} ${sector} startup with a readiness score of **${score}%**. ${score >= 70 ? 'You\'re approaching investor-ready territory.' : score >= 50 ? 'There\'s solid foundation here, but key gaps need attention before fundraising.' : 'Significant work is needed to become investor-ready.'} Here's your deep-dive analysis.

## Readiness Snapshot

Your overall score of **${score}%** puts you ${score >= 81 ? 'in the top tier' : score >= 65 ? 'in the competitive range' : 'below where most investors filter'}. Most active ${stage} investors filter for startups scoring **75%+** on readiness assessments.

\`\`\`fi-chart
${catChartJson}
\`\`\`

${topCats.length > 0 ? `**Strong areas:** ${topCats.join(', ')}` : ''}
${weakCats.length > 0 ? `\n**Needs work:** ${weakCats.join(', ')}` : ''}

## Biggest Strengths

${strengths.length > 0 ? strengths.map((s) => `- ${s}`).join('\n') : `- Your presence in the ${sector} sector positions you in a growing market\n- You've completed an initial readiness assessment — most startups haven't`}

## Critical Gaps

${risks.length > 0 ? risks.map((r) => `- **${r}** — address this before any investor outreach`).join('\n') : `- ${weakCats.length > 0 ? `**${weakCats[0]}** needs immediate attention` : 'Complete your readiness assessment for specific gap analysis'}\n- Ensure your data room and pitch deck are investor-ready`}

## Investor Strategy

You have **${matches} investor matches** with **${highFit} high-fit** opportunities. ${highFit > 0 ? 'Focus your initial outreach on high-fit investors who align with your sector and stage.' : 'Improve your readiness score to unlock higher-fit matches.'}

${data.topMatches.slice(0, 3).map((m) => `- **${m.investor_profile.name ?? 'Investor'}** — ${m.fit_score_0_to_100}% fit score`).join('\n')}

## 30-Day Action Plan

${data.topImpactTasks.slice(0, 3).map((t, i) => `${i + 1}. **${t.title}** — potential +${t.potential_points ?? 0} points to your readiness score`).join('\n') || '1. Complete your full readiness assessment\n2. Upload key documents to your data room\n3. Refine your company profile and pitch narrative'}

---

*Enable your Gemini API key for real-time AI-powered analysis tailored to your specific data.*`;
}

/* ─── Build contextual demo response for AskButton prompts ─── */
function buildContextualDemo(prompt: string, data: NarrativeData): string {
  const name = data.companyName || 'Your Startup';
  const score = data.readinessScore;
  const lowerPrompt = prompt.toLowerCase();

  // Graph / chart / projection requests
  if (lowerPrompt.includes('graph') || lowerPrompt.includes('chart') || lowerPrompt.includes('projection') || lowerPrompt.includes('forecast') || lowerPrompt.includes('draw') || lowerPrompt.includes('visuali')) {
    // Generate projected readiness score data over months
    const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6', 'Month 7', 'Month 8', 'Month 9', 'Month 10'];
    const projectedGrowth = score < 70 ? 3.5 : score < 80 ? 2.5 : 1.5;
    const projData = months.map((m, i) => ({
      month: m,
      score: Math.min(100, Math.round(score + projectedGrowth * (i + 1) + Math.random() * 2 - 1)),
      target: 85,
    }));
    const chartJson = JSON.stringify({
      type: 'area',
      title: `${name} — Readiness Score Projection`,
      xKey: 'month',
      lines: [
        { key: 'score', color: '#10B981', label: 'Projected Score' },
        { key: 'target', color: '#3B82F6', label: 'Investor Target (85%)' },
      ],
      data: projData,
    });

    // Category breakdown bar chart
    const catData = data.readinessCategories.slice(0, 6).map((c) => ({
      name: c.name.length > 15 ? c.name.slice(0, 13) + '..' : c.name,
      current: c.score,
      projected: Math.min(100, c.score + (c.score < 60 ? 15 : c.score < 75 ? 10 : 5)),
    }));
    const barChartJson = JSON.stringify({
      type: 'bar',
      title: 'Category Scores — Current vs Projected',
      xKey: 'name',
      lines: [
        { key: 'current', color: '#EF4444', label: 'Current' },
        { key: 'projected', color: '#10B981', label: 'Projected' },
      ],
      data: catData,
    });

    return `## Readiness Score Projection for ${name}\n\nBased on your current score of **${score}%** and the impact of completing your top tasks, here's the projected growth over the next 10 months:\n\n\`\`\`fi-chart\n${chartJson}\n\`\`\`\n\n**Key assumptions:**\n- Completing **${data.topImpactTasks.length} high-impact tasks** at a steady pace\n- The investor-ready threshold is **85%** (blue line)\n- Growth rate accounts for diminishing returns at higher scores\n\n### Category Breakdown\n\n\`\`\`fi-chart\n${barChartJson}\n\`\`\`\n\n**Action plan to hit these targets:**\n${data.topImpactTasks.slice(0, 3).map((t, i) => `${i + 1}. **${t.title}** — potential +${t.potential_points ?? 0} pts`).join('\n')}\n\n*Enable your Gemini API key for more detailed projections.*`;
  }

  // Fundraising plan / fund / raise requests
  if (lowerPrompt.includes('fundrais') || lowerPrompt.includes('fund') || lowerPrompt.includes('raise') || lowerPrompt.includes('plan')) {
    const stage = data.companyStage || 'Series A';
    const raisePlan = [
      { quarter: 'Q1', target: stage === 'Pre-Seed' ? 250 : stage === 'Seed' ? 500 : 2000, pipeline: stage === 'Pre-Seed' ? 150 : stage === 'Seed' ? 300 : 1200 },
      { quarter: 'Q2', target: stage === 'Pre-Seed' ? 500 : stage === 'Seed' ? 1200 : 5000, pipeline: stage === 'Pre-Seed' ? 400 : stage === 'Seed' ? 800 : 3500 },
      { quarter: 'Q3', target: stage === 'Pre-Seed' ? 750 : stage === 'Seed' ? 2000 : 8000, pipeline: stage === 'Pre-Seed' ? 700 : stage === 'Seed' ? 1800 : 7000 },
      { quarter: 'Q4', target: stage === 'Pre-Seed' ? 1000 : stage === 'Seed' ? 3000 : 12000, pipeline: stage === 'Pre-Seed' ? 950 : stage === 'Seed' ? 2800 : 11000 },
    ];
    const fundChartJson = JSON.stringify({
      type: 'bar',
      title: `${stage} Fundraising Plan ($K)`,
      xKey: 'quarter',
      lines: [
        { key: 'target', color: '#3B82F6', label: 'Target ($K)' },
        { key: 'pipeline', color: '#10B981', label: 'Pipeline ($K)' },
      ],
      data: raisePlan,
    });
    return `## Fundraising Plan for ${name}\n\nBased on your **${stage}** stage and current readiness of **${score}%**, here's a realistic fundraising plan:\n\n\`\`\`fi-chart\n${fundChartJson}\n\`\`\`\n\n**Strategy:**\n- **${data.highMatchCount} high-fit investors** are your priority targets\n- At ${score}% readiness, focus on improving to **85%+** before major outreach\n- Target: **$${raisePlan[3].target}K** cumulative by Q4\n\n| Quarter | Target | Activity |\n|---------|--------|----------|\n| Q1 | $${raisePlan[0].target}K | Build pipeline, warm introductions |\n| Q2 | $${raisePlan[1].target}K | Active outreach to high-fit investors |\n| Q3 | $${raisePlan[2].target}K | Term sheet negotiations |\n| Q4 | $${raisePlan[3].target}K | Close round |\n\n*Enable your Gemini API key for personalized fundraising models.*`;
  }

  // Task-specific response
  if (lowerPrompt.includes('task') || lowerPrompt.includes('how to') || lowerPrompt.includes('help me')) {
    return `## Here's how to approach this\n\n**Context:** ${name} currently has a readiness score of **${score}%**. This task directly impacts your fundraising readiness.\n\n**Step-by-step approach:**\n\n1. **Gather the required information** — Check your existing documents, pitch deck, and financial records\n2. **Focus on investor expectations** — At the ${data.companyStage || 'current'} stage, investors want to see clear metrics and traction\n3. **Use specific data points** — Reference your ${data.companySector || 'sector'} benchmarks\n\n**Example:**\n> If you're preparing financial projections, investors at ${data.companyStage || 'your stage'} typically want to see 18-24 month forecasts with clear assumptions tied to your unit economics.\n\n**Impact:** Completing this could improve your readiness score by several points, moving you closer to the **75%+ threshold** where top investors start paying attention.\n\n*Enable your Gemini API key for personalized, detailed guidance.*`;
  }

  // Readiness-specific
  if (lowerPrompt.includes('readiness') || lowerPrompt.includes('score') || lowerPrompt.includes('improve')) {
    const weakCats = data.lowestCategories.slice(0, 3).map((c) => `| ${c.name} | ${c.score}% | ${c.score >= 70 ? 'On track' : c.score >= 50 ? 'Needs work' : 'Critical'} |`).join('\n');
    return `## Readiness Analysis for ${name}\n\nYour current score of **${score}%** ${score >= 75 ? 'is competitive' : score >= 50 ? 'shows promise but needs improvement' : 'needs significant work'}.\n\n**Areas that need the most attention:**\n\n| Category | Score | Status |\n|----------|-------|--------|\n${weakCats}\n\n**Fastest path to improvement:**\n${data.topImpactTasks.slice(0, 3).map((t, i) => `${i + 1}. **${t.title}** — potential +${t.potential_points ?? 0} pts`).join('\n')}\n\n**Benchmark:** Most successful ${data.companyStage || 'Series A'} companies in ${data.companySector || 'your sector'} score **75-85%** before starting investor outreach.\n\n*Enable your Gemini API key for deeper analysis.*`;
  }

  // Investor / competitor / market questions
  if (lowerPrompt.includes('investor') || lowerPrompt.includes('match') || lowerPrompt.includes('outreach')) {
    return `## Investor Intelligence for ${name}\n\nYou have **${data.topMatches.length} investor matches** with **${data.highMatchCount} high-fit** opportunities.\n\n**Top matches:**\n\n| Investor | Fit Score | Type |\n|----------|-----------|------|\n${data.topMatches.slice(0, 5).map((m) => `| ${m.investor_profile.name ?? 'Unknown'} | ${m.fit_score_0_to_100}% | ${m.investor_profile.investor_type ?? 'VC'} |`).join('\n')}\n\n**Outreach strategy:**\n- Start with your **highest-fit matches** — they're pre-qualified for your stage and sector\n- Lead with your strongest category scores as proof points\n- Address your weakest areas proactively in your narrative\n\n**Example opening:**\n> "We're a ${data.companyStage || 'Series A'} ${data.companySector || 'tech'} company that has achieved [key metric]. We're raising to [goal] and believe there's strong alignment with your portfolio thesis."\n\n*Enable your Gemini API key for personalized outreach templates.*`;
  }

  // Competitor questions
  if (lowerPrompt.includes('competitor') || lowerPrompt.includes('competitive') || lowerPrompt.includes('market') || lowerPrompt.includes('landscape')) {
    return `## Competitive Landscape for ${name}\n\nAs a **${data.companyStage || 'Series A'}** startup in the **${data.companySector || 'tech'}** sector, here's what we know about your competitive positioning:\n\n**Your Readiness vs Market:**\n\n| Metric | ${name} | Typical ${data.companyStage || 'Series A'} |\n|--------|---------|-------------------|\n| Readiness Score | ${score}% | 55-70% |\n| Task Completion | ${data.taskCompletionRate}% | 40-60% |\n| Investor Matches | ${data.topMatches.length} | 3-8 |\n\n**Competitive advantages to highlight:**\n- ${data.aiAnalysis.strengths?.[0] || 'Your sector positioning'}\n- ${data.aiAnalysis.strengths?.[1] || 'Completion of readiness assessment'}\n\n**To identify specific competitors**, enable web search mode and ask me to research competitors in the ${data.companySector || 'tech'} space.\n\n*Enable your Gemini API key for real-time competitor analysis.*`;
  }

  // Generic fallback
  return `## Analysis for ${name}\n\n**Quick snapshot:**\n\n| Metric | Value |\n|--------|-------|\n| Readiness Score | ${score}% |\n| Stage | ${data.companyStage || 'N/A'} |\n| Sector | ${data.companySector || 'N/A'} |\n| Investor Matches | ${data.topMatches.length} |\n| Task Completion | ${data.taskCompletionRate}% |\n\n**Key insight:** ${data.lowestCategories[0] ? `Your biggest opportunity is in **${data.lowestCategories[0].name}** (${data.lowestCategories[0].score}%). Improving this area would have the largest impact on your overall readiness.` : 'Complete a readiness assessment to unlock detailed insights.'}\n\n**Recommended next step:** ${data.topImpactTasks[0] ? `Focus on *${data.topImpactTasks[0].title}* — this single task could add +${data.topImpactTasks[0].potential_points ?? 0} points to your score.` : 'Start with your highest-impact readiness tasks.'}\n\n*Enable your Gemini API key for in-depth, personalized analysis.*`;
}

/* ─── Context summary card data ─── */
function getContextSummary(data: NarrativeData) {
  return {
    score: data.readinessScore,
    delta: data.readinessDelta,
    label: data.scoreLabel,
    matchCount: data.topMatches.length,
    highFit: data.highMatchCount,
    taskRate: data.taskCompletionRate,
    topGap: data.lowestCategories[0]?.name ?? null,
    topGapScore: data.lowestCategories[0]?.score ?? null,
    strengths: data.aiAnalysis.strengths?.slice(0, 2) ?? [],
    risks: data.aiAnalysis.risks?.slice(0, 2) ?? [],
  };
}

/* ─── DB persistence via intelligence API ─── */
import { fetchThreads, createThread, deleteThread as apiDeleteThread, fetchMessages, streamChatMessage } from '@/lib/api/intelligence';
import type { ChatThread } from '@/types/database';

interface HistoryEntry {
  id: string;       // thread ID
  title: string;
  createdAt: string;
}

/* ─── Generate a concise title from the first user message ─── */
function smartTitle(message: string): string {
  // Strip boilerplate prompt prefixes
  let text = message
    .replace(/^(help me with this readiness task:|based on all the company data.*?give me a|analyze my|give me a)\s*/i, '')
    .replace(/^[""]/, '')
    .replace(/[""].*$/, '')
    .trim();

  // If it starts with a quoted task title, extract it
  const quoted = message.match(/[""]([^""]+)[""]/);
  if (quoted) text = quoted[1];

  // Truncate to a reasonable length
  if (text.length > 55) text = text.slice(0, 52) + '...';

  return text || 'Deep Dive Analysis';
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

export function IntelligenceSidebar({ open, onClose, data, initialPrompt, onPromptConsumed }: IntelligenceSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [webMode, setWebMode] = useState(false);
  const [hasAutoLaunched, setHasAutoLaunched] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef(false);
  const restoredRef = useRef(false);
  const prevOpenRef = useRef(false);

  const contextSummary = useMemo(() => getContextSummary(data), [data]);

  // Auto-save current thread to history when sidebar closes
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (wasOpen && !open) {
      // Sidebar just closed — save current thread to history and reset for next open
      if (activeThreadId && messages.length > 0) {
        const firstUser = messages.find((m) => m.role === 'user');
        const title = firstUser
          ? smartTitle(firstUser.content)
          : 'Deep Dive Analysis';
        setHistory((prev) => [
          { id: activeThreadId, title, createdAt: new Date().toISOString() },
          ...prev.filter((h) => h.id !== activeThreadId),
        ]);
      }
      // Reset state so next open starts a fresh conversation
      abortRef.current = true;
      setMessages([]);
      setActiveThreadId(null);
      setIsStreaming(false);
      setInput('');
      setHasAutoLaunched(false);
      setShowHistory(false);
      restoredRef.current = false;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load threads from DB for history
  const refreshHistory = useCallback(async () => {
    try {
      const threads = await fetchThreads();
      setHistory(
        threads
          .filter((t: ChatThread) => t.title !== '__intelligence_active__')
          .map((t: ChatThread) => ({
            id: t.id,
            title: t.title || 'Deep Dive Analysis',
            createdAt: t.created_at,
          }))
      );
    } catch { /* ignore */ }
  }, []);

  // On sidebar open: load active thread or auto-launch deep dive
  useEffect(() => {
    if (!open) return;

    if (!restoredRef.current) {
      restoredRef.current = true;
      // Try to load the most recent thread
      (async () => {
        try {
          const threads = await fetchThreads();
          if (threads.length > 0) {
            const latest = threads[0]; // Most recent
            const msgs = await fetchMessages(latest.id);
            if (msgs.length > 0) {
              setActiveThreadId(latest.id);
              setMessages(
                msgs.map((m) => ({
                  id: m.id,
                  role: m.role as 'user' | 'assistant' | 'system-card',
                  content: m.content,
                }))
              );
              setHasAutoLaunched(true);
              // Load remaining threads for history
              setHistory(
                threads.slice(1)
                  .filter((t: ChatThread) => t.title !== '__intelligence_active__')
                  .map((t: ChatThread) => ({
                    id: t.id,
                    title: t.title || 'Deep Dive Analysis',
                    createdAt: t.created_at,
                  }))
              );
              return;
            }
          }
        } catch { /* fallback to fresh */ }

        // No existing thread — launch deep dive
        if (!hasAutoLaunched) {
          setHasAutoLaunched(true);
          if (initialPrompt) {
            handleInitialPrompt(initialPrompt);
            onPromptConsumed?.();
          } else {
            runDeepDive();
          }
        }
      })();
    } else if (!hasAutoLaunched && messages.length === 0) {
      setHasAutoLaunched(true);
      if (initialPrompt) {
        handleInitialPrompt(initialPrompt);
        onPromptConsumed?.();
      } else {
        runDeepDive();
      }
    }

    setTimeout(() => inputRef.current?.focus(), 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Handle new initialPrompt while already open (e.g. user clicks another Ask button)
  useEffect(() => {
    if (open && initialPrompt && hasAutoLaunched) {
      handleInitialPrompt(initialPrompt);
      onPromptConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const getSystemContext = useCallback(
    () => buildSystemContext(data, webMode),
    [data, webMode]
  );

  /* ── Ensure we have a thread ID (creates one if needed) ── */
  const ensureThread = useCallback(async (title?: string): Promise<string | null> => {
    if (activeThreadId) return activeThreadId;
    try {
      const thread = await createThread(title ?? 'Deep Dive Analysis');
      if (thread) {
        setActiveThreadId(thread.id);
        return thread.id;
      }
    } catch { /* ignore */ }
    return null;
  }, [activeThreadId]);

  /* ── Helper: stream via server API (saves to DB automatically) ── */
  const streamViaServer = useCallback(async (
    threadId: string,
    userText: string,
    onChunk: (accumulated: string) => void,
  ): Promise<string> => {
    let accumulated = '';
    try {
      const body = await streamChatMessage(threadId, userText, { responseMode: 'concise' });
      if (!body) {
        accumulated = 'Sorry, I could not reach the server. Please try again.';
        onChunk(accumulated);
        return accumulated;
      }
      const reader = body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done || abortRef.current) break;
        accumulated += decoder.decode(value, { stream: true });
        onChunk(accumulated);
      }
    } catch {
      if (!accumulated) {
        accumulated = 'Sorry, I encountered an error. Please try again.';
        onChunk(accumulated);
      }
    }
    return accumulated;
  }, []);

  /* ── Fallback: client-side Gemini or demo mode ── */
  const streamClientSide = useCallback(async (
    prompt: string,
    onChunk: (accumulated: string) => void,
    opts?: { demo?: string }
  ): Promise<string> => {
    let accumulated = '';
    try {
      if (isGeminiEnabled()) {
        const stream = webMode
          ? geminiWebStream(prompt, { temperature: 0.4, maxTokens: 4096 })
          : geminiStream(prompt, { temperature: 0.4, maxTokens: 4096 });
        for await (const chunk of stream) {
          if (abortRef.current) break;
          accumulated += chunk;
          onChunk(accumulated);
        }
      } else if (opts?.demo) {
        for (const word of opts.demo.split(' ')) {
          if (abortRef.current) break;
          accumulated += word + ' ';
          onChunk(accumulated);
          await new Promise((r) => setTimeout(r, 15));
        }
      }
    } catch {
      accumulated = 'Sorry, I encountered an error. Please try again.';
      onChunk(accumulated);
    }
    return accumulated;
  }, [webMode]);

  /* ── Handle initial prompt (from AskButton) ── */
  const handleInitialPrompt = useCallback(async (prompt: string) => {
    if (isStreaming) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: prompt, hidden: true };
    const assistantMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);
    abortRef.current = false;

    const updateLastMsg = (text: string) => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: text };
        }
        return updated;
      });
    };

    // Try server-side streaming (saves to DB)
    const threadId = await ensureThread(prompt.slice(0, 60));
    if (threadId) {
      await streamViaServer(threadId, prompt, updateLastMsg);
    } else {
      // Fallback: client-side
      const context = buildSystemContext(data, webMode);
      const fullPrompt = `${context}\n\nUser: ${prompt}\n\nAssistant:`;
      await streamClientSide(fullPrompt, updateLastMsg, { demo: buildContextualDemo(prompt, data) });
    }

    setIsStreaming(false);
  }, [data, isStreaming, webMode, ensureThread, streamViaServer, streamClientSide]);

  /* ── Deep dive (auto on open) ── */
  const runDeepDive = useCallback(async () => {
    if (isStreaming) return;

    const assistantMsg: Message = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: '',
    };
    setMessages([assistantMsg]);
    setIsStreaming(true);
    abortRef.current = false;

    const updateMsg = (text: string) => {
      setMessages([{ ...assistantMsg, content: text }]);
    };

    const deepDivePrompt = buildDeepDivePrompt(data);

    // Try server-side streaming (saves to DB)
    const threadId = await ensureThread('Deep Dive Analysis');
    if (threadId) {
      await streamViaServer(threadId, deepDivePrompt, updateMsg);
    } else {
      // Fallback: client-side
      const context = buildSystemContext(data, false);
      const fullPrompt = `${context}\n\n${deepDivePrompt}`;
      await streamClientSide(fullPrompt, updateMsg, { demo: buildDemoDeepDive(data) });
    }

    setIsStreaming(false);
  }, [data, isStreaming, ensureThread, streamViaServer, streamClientSide]);

  /* ── Send user message ── */
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const assistantMsg: Message = { id: `a-${Date.now()}`, role: 'assistant', content: '' };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput('');
    setIsStreaming(true);
    abortRef.current = false;

    const updateLastMsg = (text: string) => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === 'assistant') {
          updated[updated.length - 1] = { ...last, content: text };
        }
        return updated;
      });
    };

    // Try server-side streaming (saves to DB)
    const threadId = await ensureThread(text.slice(0, 60));
    if (threadId) {
      await streamViaServer(threadId, text, updateLastMsg);
    } else {
      // Fallback: client-side
      const context = getSystemContext();
      const historyText = [...messages, userMsg]
        .filter((m) => m.role !== 'system-card')
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .slice(-10)
        .join('\n\n');
      const fullPrompt = `${context}\n\n${historyText}\n\nAssistant:`;
      const demo = `Based on **${data.companyName || 'your startup'}'s** data with a readiness score of **${data.readinessScore}%**, here's my quick analysis.\n\n*Enable your Gemini API key for deeper analysis.*`;
      await streamClientSide(fullPrompt, updateLastMsg, { demo });
    }

    setIsStreaming(false);
  }, [input, isStreaming, messages, getSystemContext, data, ensureThread, streamViaServer, streamClientSide]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = useCallback(async () => {
    abortRef.current = true;
    // Current thread becomes a history entry (already saved in DB)
    if (activeThreadId && messages.length > 0) {
      const firstUser = messages.find((m) => m.role === 'user');
      const title = firstUser ? smartTitle(firstUser.content) : 'Deep Dive Analysis';
      setHistory((prev) => [
        { id: activeThreadId, title, createdAt: new Date().toISOString() },
        ...prev.filter((h) => h.id !== activeThreadId),
      ]);
    }
    setMessages([]);
    setActiveThreadId(null);
    setIsStreaming(false);
    setInput('');
    setHasAutoLaunched(false);
    setShowHistory(false);
  }, [activeThreadId, messages]);

  const loadFromHistory = useCallback(async (entry: HistoryEntry) => {
    setLoadingHistory(true);
    try {
      // Move current thread to history if it has content
      if (activeThreadId && messages.length > 0 && activeThreadId !== entry.id) {
        const firstUser = messages.find((m) => m.role === 'user');
        const title = firstUser ? firstUser.content.slice(0, 50) : 'Deep Dive Analysis';
        setHistory((prev) => [
          { id: activeThreadId, title, createdAt: new Date().toISOString() },
          ...prev.filter((h) => h.id !== activeThreadId && h.id !== entry.id),
        ]);
      }
      // Load messages from DB
      const msgs = await fetchMessages(entry.id);
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant' | 'system-card',
          content: m.content,
        }))
      );
      setActiveThreadId(entry.id);
      setHasAutoLaunched(true);
      setShowHistory(false);
    } catch {
      // If fetch fails, still switch
      setShowHistory(false);
    } finally {
      setLoadingHistory(false);
    }
  }, [activeThreadId, messages]);

  const deleteHistoryEntry = useCallback(async (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    // Delete from DB in background
    apiDeleteThread(id).catch(() => {});
  }, []);

  const scoreColor = getScoreColor(contextSummary.score);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg flex flex-col overflow-hidden"
            style={{
              background: 'var(--fi-bg-primary)',
              borderLeft: '1px solid var(--fi-border)',
              boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
            }}
          >

            {/* ── Header ── */}
            <div
              className="shrink-0 px-5 py-4"
              style={{
                borderBottom: '1px solid var(--fi-border)',
                background: 'linear-gradient(180deg, rgba(16,185,129,0.06) 0%, var(--fi-bg-primary) 100%)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(16,185,129,0.12)' }}
                    >
                      <Image src="/ai-logo.png" alt="" width={22} height={22} />
                    </div>
                    <div
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                      style={{
                        background: 'var(--fi-primary)',
                        borderColor: 'var(--fi-bg-primary)',
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold" style={{ color: 'var(--fi-text-primary)' }}>
                      Deep Dive Analysis
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--fi-text-muted)' }}>
                      Frictionless Intelligence
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setWebMode((p) => !p)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: webMode ? 'rgba(16,185,129,0.15)' : 'var(--fi-bg-tertiary)',
                      color: webMode ? 'var(--fi-primary)' : 'var(--fi-text-muted)',
                      border: `1px solid ${webMode ? 'var(--fi-primary)' : 'var(--fi-border)'}`,
                      boxShadow: webMode ? '0 0 8px rgba(16,185,129,0.2)' : 'none',
                    }}
                    title={webMode ? 'Web search ON — powered by Google Search' : 'Enable web search'}
                  >
                    <Globe2 className={`w-3.5 h-3.5 ${webMode ? 'animate-pulse' : ''}`} />
                    Web
                  </button>
                  <button
                    onClick={() => setShowHistory((p) => !p)}
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--fi-bg-secondary)]"
                    style={{ color: showHistory ? 'var(--fi-primary)' : 'var(--fi-text-muted)' }}
                    title="Chat history"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetChat}
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--fi-bg-secondary)]"
                    style={{ color: 'var(--fi-text-muted)' }}
                    title="New conversation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg transition-colors hover:bg-[var(--fi-bg-secondary)]"
                    style={{ color: 'var(--fi-text-muted)' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Context cards strip */}
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                <ContextChip
                  icon={<Target className="w-3.5 h-3.5" />}
                  label="Readiness"
                  value={`${contextSummary.score}%`}
                  color={scoreColor}
                  delta={contextSummary.delta}
                />
                <ContextChip
                  icon={<Users className="w-3.5 h-3.5" />}
                  label="Matches"
                  value={String(contextSummary.matchCount)}
                  detail={contextSummary.highFit > 0 ? `${contextSummary.highFit} high` : undefined}
                />
                <ContextChip
                  icon={<BarChart3 className="w-3.5 h-3.5" />}
                  label="Tasks"
                  value={`${contextSummary.taskRate}%`}
                />
                {contextSummary.topGap && (
                  <ContextChip
                    icon={<AlertTriangle className="w-3.5 h-3.5" />}
                    label="Top Gap"
                    value={contextSummary.topGap}
                    color="var(--fi-score-need-improvement)"
                  />
                )}
              </div>
            </div>

            {/* ── History Panel ── */}
            {showHistory ? (
              <div className="flex-1 overflow-y-auto px-5 py-5" style={{ scrollbarWidth: 'thin' }}>
                <div className="flex items-center gap-2 mb-4">
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-[var(--fi-bg-secondary)]"
                    style={{ color: 'var(--fi-text-muted)' }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--fi-text-primary)' }}>
                    Chat History
                  </h4>
                </div>

                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <History className="w-8 h-8 mb-3" style={{ color: 'var(--fi-text-muted)', opacity: 0.4 }} />
                    <p className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>No previous conversations</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--fi-text-muted)', opacity: 0.6 }}>
                      Press the reset button to save the current chat to history
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((entry) => {
                      const date = new Date(entry.createdAt);
                      const timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                      return (
                        <div
                          key={entry.id}
                          className="group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                          style={{ background: 'var(--fi-bg-secondary)', border: '1px solid var(--fi-border)' }}
                          onClick={() => loadFromHistory(entry)}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: 'rgba(16,185,129,0.1)' }}
                          >
                            <Image src="/ai-logo.png" alt="" width={16} height={16} className="object-contain" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--fi-text-primary)' }}>
                              {entry.title}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'var(--fi-text-muted)' }}>
                              {timeStr}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteHistoryEntry(entry.id); }}
                            className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--fi-bg-tertiary)]"
                            style={{ color: 'var(--fi-text-muted)' }}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>

            {/* ── Messages ── */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--fi-border) transparent' }}
            >
              {messages.map((msg, idx) => {
                if (msg.hidden) return null;
                return (<motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx === 0 ? 0 : 0.05 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="w-full flex gap-3">
                      <div className="shrink-0 mt-1">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
                          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}
                        >
                          <Image src="/ai-logo.png" alt="Frictionless" width={18} height={18} className="object-contain" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        {msg.content ? (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => (
                                  <p
                                    className="text-sm leading-relaxed mb-3 last:mb-0"
                                    style={{ color: 'var(--fi-text-secondary)' }}
                                  >
                                    {children}
                                  </p>
                                ),
                                h1: ({ children }) => (
                                  <h1
                                    className="text-base font-bold mt-5 mb-2"
                                    style={{ color: 'var(--fi-text-primary)' }}
                                  >
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2
                                    className="text-sm font-bold mt-5 mb-2"
                                    style={{ color: 'var(--fi-text-primary)' }}
                                  >
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3
                                    className="text-sm font-semibold mt-3 mb-1.5"
                                    style={{ color: 'var(--fi-text-primary)' }}
                                  >
                                    {children}
                                  </h3>
                                ),
                                ul: ({ children }) => (
                                  <ul className="space-y-1.5 mb-3 list-none pl-0">{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="space-y-1.5 mb-3 list-none pl-0">{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li
                                    className="text-sm leading-relaxed flex items-start gap-2"
                                    style={{ color: 'var(--fi-text-secondary)' }}
                                  >
                                    <span
                                      className="mt-2 w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{ background: 'var(--fi-primary)' }}
                                    />
                                    <span>{children}</span>
                                  </li>
                                ),
                                strong: ({ children }) => (
                                  <strong style={{ color: 'var(--fi-text-primary)', fontWeight: 600 }}>
                                    {children}
                                  </strong>
                                ),
                                em: ({ children }) => (
                                  <em style={{ color: 'var(--fi-text-muted)', fontStyle: 'italic' }}>
                                    {children}
                                  </em>
                                ),
                                hr: () => (
                                  <hr
                                    className="my-4 border-0 h-px"
                                    style={{ background: 'var(--fi-border)' }}
                                  />
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote
                                    className="my-3 pl-4 py-2 rounded-r-lg"
                                    style={{
                                      borderLeft: '3px solid var(--fi-primary)',
                                      background: 'rgba(16,185,129,0.05)',
                                    }}
                                  >
                                    {children}
                                  </blockquote>
                                ),
                                table: ({ children }) => (
                                  <div className="my-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--fi-border)' }}>
                                    <table className="w-full text-sm">{children}</table>
                                  </div>
                                ),
                                thead: ({ children }) => (
                                  <thead style={{ background: 'var(--fi-bg-secondary)' }}>{children}</thead>
                                ),
                                tbody: ({ children }) => <tbody>{children}</tbody>,
                                tr: ({ children }) => (
                                  <tr style={{ borderBottom: '1px solid var(--fi-border)' }}>{children}</tr>
                                ),
                                th: ({ children }) => (
                                  <th
                                    className="text-left px-3 py-2 text-xs font-semibold"
                                    style={{ color: 'var(--fi-text-primary)' }}
                                  >
                                    {children}
                                  </th>
                                ),
                                td: ({ children }) => (
                                  <td
                                    className="px-3 py-2 text-xs"
                                    style={{ color: 'var(--fi-text-secondary)' }}
                                  >
                                    {children}
                                  </td>
                                ),
                                a: ({ href, children }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm underline decoration-1 underline-offset-2 transition-colors"
                                    style={{ color: 'var(--fi-primary)' }}
                                  >
                                    {children}
                                  </a>
                                ),
                                pre: ({ children }) => {
                                  // Check if the child is a code block with fi-chart language
                                  const child = children as React.ReactElement;
                                  if (child?.props?.className === 'language-fi-chart') {
                                    const raw = String(child.props.children).trim();
                                    const chart = tryParseChart(raw);
                                    if (chart) return <InlineChart config={chart} />;
                                  }
                                  return (
                                    <pre
                                      className="my-3 p-3 rounded-lg text-xs overflow-x-auto"
                                      style={{ background: 'var(--fi-bg-tertiary)', color: 'var(--fi-text-secondary)' }}
                                    >
                                      {children}
                                    </pre>
                                  );
                                },
                                code: ({ className, children }) => {
                                  // If it's a chart code block inside pre, just return raw
                                  if (className === 'language-fi-chart') {
                                    return <code className={className}>{children}</code>;
                                  }
                                  return (
                                    <code
                                      className="text-xs px-1.5 py-0.5 rounded"
                                      style={{
                                        background: 'var(--fi-bg-tertiary)',
                                        color: 'var(--fi-primary)',
                                      }}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                            {isStreaming && msg === messages[messages.length - 1] && (
                              <span
                                className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom"
                                style={{
                                  background: 'var(--fi-primary)',
                                  animation: 'fi-cursor-blink 0.8s step-end infinite',
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 py-2">
                            <div className="flex gap-1">
                              {[0, 1, 2].map((i) => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full"
                                  style={{ background: 'var(--fi-primary)' }}
                                  animate={{ opacity: [0.3, 1, 0.3] }}
                                  transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                  }}
                                />
                              ))}
                            </div>
                            <span className="text-sm" style={{ color: 'var(--fi-text-muted)' }}>
                              {webMode ? 'Searching the web...' : 'Analyzing your data...'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-3"
                      style={{
                        background: 'var(--fi-primary)',
                        color: '#fff',
                      }}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )}
                </motion.div>
                );
              })}

              {/* Suggested follow-ups after deep dive completes */}
              {!isStreaming && messages.length > 0 && messages.length <= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap gap-2 mt-2 pl-10"
                >
                  {[
                    'How can I improve my weakest category?',
                    'What should I tell investors about my metrics?',
                    'Draft an outreach email for my top investor match',
                    'What\'s my competitive advantage?',
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => {
                        setInput(prompt);
                        setTimeout(() => {
                          const fakeEvent = { trim: () => prompt } as unknown;
                          void (fakeEvent);
                        }, 0);
                      }}
                      className="text-xs px-3 py-2 rounded-xl transition-all hover:scale-[1.02]"
                      style={{
                        background: 'var(--fi-bg-secondary)',
                        color: 'var(--fi-text-secondary)',
                        border: '1px solid var(--fi-border)',
                      }}
                    >
                      <Zap className="w-3 h-3 inline mr-1.5" style={{ color: 'var(--fi-primary)' }} />
                      {prompt}
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* ── Input area ── */}
            <div
              className="shrink-0 px-5 py-4"
              style={{
                borderTop: '1px solid var(--fi-border)',
                background: 'linear-gradient(0deg, rgba(16,185,129,0.04) 0%, var(--fi-bg-primary) 100%)',
              }}
            >
              <div
                className="flex items-end gap-2 rounded-2xl p-1.5"
                style={{
                  background: 'var(--fi-bg-secondary)',
                  border: '1px solid var(--fi-border)',
                  transition: 'border-color 0.2s',
                }}
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your readiness, investors, strategy..."
                  rows={1}
                  className="flex-1 resize-none text-sm bg-transparent outline-none min-h-[40px] max-h-[120px] py-2 px-3"
                  style={{ color: 'var(--fi-text-primary)' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isStreaming}
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                  style={{
                    background: input.trim() && !isStreaming
                      ? 'var(--fi-primary)'
                      : 'var(--fi-bg-tertiary)',
                    color: input.trim() && !isStreaming ? '#fff' : 'var(--fi-text-muted)',
                    transform: input.trim() && !isStreaming ? 'scale(1)' : 'scale(0.95)',
                  }}
                >
                  {isStreaming ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--fi-text-muted)', opacity: 0.6 }}>
                  {webMode && <Globe2 className="w-3 h-3" style={{ color: 'var(--fi-primary)' }} />}
                  Frictionless Intelligence {webMode ? '· Grounded with Google Search' : '· AI'}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--fi-text-muted)', opacity: 0.4 }}>
                  Stay focused on fundraising
                </p>
              </div>
            </div>

              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── Context Chip (header strip) ─── */
function ContextChip({
  icon,
  label,
  value,
  color,
  delta,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: string;
  delta?: number;
  detail?: string;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
      style={{
        background: 'var(--fi-bg-secondary)',
        border: '1px solid var(--fi-border)',
      }}
    >
      <span style={{ color: color || 'var(--fi-text-muted)' }}>{icon}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--fi-text-muted)' }}>
          {label}
        </span>
        <span className="text-xs font-bold" style={{ color: color || 'var(--fi-text-primary)' }}>
          {value}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span className="flex items-center text-[10px] font-medium" style={{ color: delta > 0 ? 'var(--fi-score-excellent)' : 'var(--fi-score-need-improvement)' }}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta > 0 ? '+' : ''}{delta}%
          </span>
        )}
        {detail && (
          <span className="text-[10px]" style={{ color: 'var(--fi-primary)' }}>
            {detail}
          </span>
        )}
      </div>
    </div>
  );
}
