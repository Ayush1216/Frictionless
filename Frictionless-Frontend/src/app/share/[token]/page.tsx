'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Building2,
  FolderOpen,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Download,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Users,
  Calendar,
  MapPin,
  Briefcase,
  ListChecks,
  Minus,
  CircleDot,
  Sun,
  Moon,
  Brain,
  Eye,
  Target as TargetIcon,
  Zap,
  BarChart3,
  Shield,
} from 'lucide-react';

/* ================================================================
   TYPES
   ================================================================ */
type RubricItem = {
  question: string;
  answer?: string | null;
  points: number;
  maxPoints: number;
  reasoning?: string | null;
};

type ShareCategory = {
  name: string;
  key: string;
  score: number;
  weight?: number;
  maximumPoint?: number;
  itemCount?: number;
  missingCount?: number;
  items?: RubricItem[];
};

type ShareTask = {
  title: string;
  priority: string;
  points: number;
  status: string;
  description: string;
};

type CompanyProfile = {
  company_name?: string;
  description?: string;
  industry?: string;
  stage?: string;
  founded_year?: number;
  location?: string;
  website?: string;
  team_size?: number;
};

type AIInsights = {
  executive_summary?: string;
  investor_verdict?: string;
  top_priorities?: string[];
};

type ScoreHistoryEntry = { score: number; date: string };

type ReadinessSnapshot = {
  score?: number;
  company_name?: string;
  generated_at?: string;
  categories?: ShareCategory[];
  delta?: number;
  completedTasks?: number;
  totalTasks?: number;
  company_profile?: CompanyProfile;
  tasks?: Record<string, ShareTask[]>;
  scoreHistory?: ScoreHistoryEntry[];
  aiInsights?: AIInsights;
};

type SharePayload = {
  share_type: 'company_profile' | 'data_room' | 'readiness_report';
  company_name?: string;
  documents?: unknown[];
  readiness?: ReadinessSnapshot;
  error?: string;
};

/* ================================================================
   THEME COLORS — Light & Dark
   ================================================================ */
type ThemeColors = {
  bg: string; bgCard: string; bgCardAlt: string;
  text: string; textSecondary: string; textMuted: string;
  border: string; borderLight: string;
  greenBg: string; greenBorder: string; greenText: string;
  redBg: string; redBorder: string; redText: string;
  amberText: string; indigoText: string;
};

const DARK: ThemeColors = {
  bg: '#0a0a1a', bgCard: '#111827', bgCardAlt: '#0f172a',
  text: '#f1f5f9', textSecondary: '#94a3b8', textMuted: '#4b5563',
  border: '#1e293b', borderLight: '#1e293b',
  greenBg: 'rgba(34,197,94,0.04)', greenBorder: 'rgba(34,197,94,0.15)', greenText: '#22c55e',
  redBg: 'rgba(239,68,68,0.04)', redBorder: 'rgba(239,68,68,0.15)', redText: '#ef4444',
  amberText: '#f59e0b', indigoText: '#818cf8',
};

const LIGHT: ThemeColors = {
  bg: '#f8fafc', bgCard: '#ffffff', bgCardAlt: '#f1f5f9',
  text: '#0f172a', textSecondary: '#475569', textMuted: '#94a3b8',
  border: '#e2e8f0', borderLight: '#f1f5f9',
  greenBg: 'rgba(34,197,94,0.06)', greenBorder: 'rgba(34,197,94,0.2)', greenText: '#16a34a',
  redBg: 'rgba(239,68,68,0.06)', redBorder: 'rgba(239,68,68,0.2)', redText: '#dc2626',
  amberText: '#d97706', indigoText: '#4f46e5',
};

/* ================================================================
   HELPERS
   ================================================================ */
function getScoreColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  return '#ef4444';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  return 'Need Improvement';
}

function getPriorityColor(p: string) {
  if (p === 'critical') return '#ef4444';
  if (p === 'high') return '#f97316';
  if (p === 'medium') return '#f59e0b';
  return '#6b7280';
}

function getPriorityLabel(p: string) {
  if (p === 'critical') return 'Critical';
  if (p === 'high') return 'High';
  if (p === 'medium') return 'Medium';
  return 'Low';
}

/* ================================================================
   SVG Components
   ================================================================ */
function RadarChartSVG({ categories, theme }: { categories: ShareCategory[]; theme: ThemeColors }) {
  const size = 280;
  const cx = size / 2; const cy = size / 2;
  const maxR = 100;
  const n = categories.length;
  if (n < 3) return null;

  const angleStep = (2 * Math.PI) / n;
  const rings = [25, 50, 75, 100];
  const getPoint = (i: number, pct: number) => {
    const angle = angleStep * i - Math.PI / 2;
    const r = (pct / 100) * maxR;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  const dataPoints = categories.map((c, i) => getPoint(i, c.score));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      {rings.map((r) => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, r));
        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';
        return <path key={r} d={path} fill="none" stroke={theme.border} strokeWidth="0.7" opacity="0.5" />;
      })}
      {categories.map((_, i) => {
        const end = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke={theme.border} strokeWidth="0.5" opacity="0.3" />;
      })}
      <path d={dataPath} fill="rgba(99,102,241,0.12)" stroke="#6366f1" strokeWidth="2.5" />
      {categories.map((c, i) => {
        const p = getPoint(i, c.score);
        const labelP = getPoint(i, 120);
        return (
          <g key={c.key}>
            <circle cx={p.x} cy={p.y} r="4.5" fill={getScoreColor(c.score)} stroke={theme.bg} strokeWidth="1.5" />
            <text x={labelP.x} y={labelP.y} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fill={theme.textSecondary} fontFamily="system-ui" fontWeight="500">
              {c.name.length > 16 ? c.name.slice(0, 14) + '...' : c.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ScoreHistoryChart({ history, theme }: { history: ScoreHistoryEntry[]; theme: ThemeColors }) {
  if (history.length < 2) return null;
  const width = 440; const height = 80;
  const pad = { top: 10, right: 10, bottom: 20, left: 35 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const scores = history.map((e) => e.score);
  const minS = Math.max(0, Math.min(...scores) - 10);
  const maxS = Math.min(100, Math.max(...scores) + 10);
  const range = maxS - minS || 1;

  const points = history.map((e, i) => ({
    x: pad.left + (i / (history.length - 1)) * w,
    y: pad.top + h - ((e.score - minS) / range) * h,
    score: e.score, date: e.date,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = linePath + `L${points[points.length - 1].x},${pad.top + h}L${points[0].x},${pad.top + h}Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      <defs>
        <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <text x={pad.left - 4} y={pad.top + 4} textAnchor="end" fontSize="9" fill={theme.textMuted} fontFamily="system-ui">{Math.round(maxS)}</text>
      <text x={pad.left - 4} y={pad.top + h} textAnchor="end" fontSize="9" fill={theme.textMuted} fontFamily="system-ui">{Math.round(minS)}</text>
      <line x1={pad.left} y1={pad.top + h / 2} x2={pad.left + w} y2={pad.top + h / 2} stroke={theme.border} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.4" />
      <path d={areaPath} fill="url(#histGrad)" />
      <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#6366f1" stroke={theme.bg} strokeWidth="1.5" />
      ))}
      <text x={points[0].x} y={pad.top + h + 14} textAnchor="start" fontSize="8.5" fill={theme.textMuted} fontFamily="system-ui">
        {new Date(points[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </text>
      <text x={points[points.length - 1].x} y={pad.top + h + 14} textAnchor="end" fontSize="8.5" fill={theme.textMuted} fontFamily="system-ui">
        {new Date(points[points.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </text>
    </svg>
  );
}

/* ================================================================
   PDF LOGO — Inline SVG for PDF (not dependent on image loading)
   ================================================================ */
const LOGO_SVG = `<svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="20" fill="url(#lg)"/>
  <defs><linearGradient id="lg" x1="0" y1="0" x2="100" y2="100"><stop stop-color="#6366f1"/><stop offset="1" stop-color="#818cf8"/></linearGradient></defs>
  <circle cx="50" cy="50" r="28" stroke="white" stroke-width="3.5" fill="none"/>
  <path d="M50 32 L50 68 M37 44 L50 32 L63 44" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

/* ================================================================
   ReadinessReport — Full Report with Theme + AI Insights + PDF
   ================================================================ */
function ReadinessReport({ data, companyName }: { data: ReadinessSnapshot; companyName: string }) {
  const [isDark, setIsDark] = useState(true);
  const t = isDark ? DARK : LIGHT;

  const score = data.score ?? 0;
  const categories = data.categories ?? [];
  const scoreColor = getScoreColor(score);
  const sortedCategories = [...categories].sort((a, b) => b.score - a.score);
  const strengths = sortedCategories.filter((c) => c.score >= 80);
  const gaps = sortedCategories.filter((c) => c.score < 60);
  const profile = data.company_profile || {};
  const tasks = data.tasks || {};
  const scoreHistory = data.scoreHistory || [];
  const ai = data.aiInsights || {};

  const allTasks = Object.values(tasks).flat();
  const pendingTasks = allTasks.filter((x) => x.status !== 'done');
  const doneTasks = allTasks.filter((x) => x.status === 'done');
  const totalPotentialPoints = pendingTasks.reduce((sum, x) => sum + x.points, 0);

  // Total rubric items stats
  const totalRubricItems = categories.reduce((s, c) => s + (c.items?.length ?? 0), 0);
  const completedRubricItems = categories.reduce((s, c) => s + (c.items?.filter((i) => i.points >= i.maxPoints && i.maxPoints > 0).length ?? 0), 0);
  const partialRubricItems = categories.reduce((s, c) => s + (c.items?.filter((i) => i.points > 0 && i.points < i.maxPoints).length ?? 0), 0);

  const generatedDate = data.generated_at
    ? new Date(data.generated_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  /* ---------- PDF Generator ---------- */
  const handleDownloadPDF = useCallback(() => {
    const pw = window.open('', '_blank');
    if (!pw) return;

    const catHtml = sortedCategories.map((c) => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid ${DARK.border};">
        <span style="flex:1;font-size:13px;font-weight:500;color:${DARK.text};">${c.name}</span>
        <div style="width:160px;height:8px;border-radius:4px;background:${DARK.border};overflow:hidden;">
          <div style="width:${c.score}%;height:100%;border-radius:4px;background:${getScoreColor(c.score)};"></div>
        </div>
        <span style="width:40px;text-align:right;font-size:13px;font-weight:700;color:${getScoreColor(c.score)};">${c.score}%</span>
        ${c.weight ? `<span style="width:30px;text-align:right;font-size:11px;color:${DARK.textMuted};">${c.weight}%</span>` : ''}
      </div>
    `).join('');

    // AI Insights for PDF
    const aiHtml = (ai.executive_summary || ai.investor_verdict) ? `
      <div style="margin:20px 0;padding:20px;border-radius:12px;background:rgba(99,102,241,0.04);border:1px solid rgba(99,102,241,0.15);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
          ${LOGO_SVG.replace(/width="32" height="32"/, 'width="18" height="18"')}
          <span style="font-size:13px;font-weight:600;color:#818cf8;text-transform:uppercase;letter-spacing:1px;">Frictionless Intelligence</span>
        </div>
        ${ai.executive_summary ? `<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Executive Summary</div><p style="font-size:13px;color:#cbd5e1;line-height:1.6;">${ai.executive_summary}</p></div>` : ''}
        ${ai.investor_verdict ? `<div style="margin-bottom:12px;"><div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Investor Perspective</div><p style="font-size:13px;color:#cbd5e1;line-height:1.6;">${ai.investor_verdict}</p></div>` : ''}
        ${ai.top_priorities && ai.top_priorities.length > 0 ? `<div><div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;">Top Priorities</div>${ai.top_priorities.map((p, i) => `<div style="display:flex;align-items:flex-start;gap:8px;padding:4px 0;"><span style="color:#f59e0b;font-weight:700;font-size:12px;">${i + 1}.</span><span style="font-size:13px;color:#cbd5e1;">${p}</span></div>`).join('')}</div>` : ''}
      </div>` : '';

    // Rubric details
    const rubricHtml = sortedCategories.map((cat) => {
      if (!cat.items || cat.items.length === 0) return '';
      const rows = cat.items.map((item) => {
        const pct = item.maxPoints > 0 ? Math.round((item.points / item.maxPoints) * 100) : 0;
        const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#eab308' : '#ef4444';
        const icon = pct >= 80 ? '&#10003;' : pct > 0 ? '&#9679;' : '&#10007;';
        return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 12px;border-bottom:1px solid #0f172a;">
          <span style="color:${color};font-size:12px;font-weight:700;margin-top:1px;">${icon}</span>
          <div style="flex:1;"><div style="font-size:12px;color:#cbd5e1;line-height:1.4;">${item.question}</div>${item.answer ? `<div style="font-size:11px;color:#64748b;margin-top:1px;">${String(item.answer).slice(0, 100)}${String(item.answer).length > 100 ? '...' : ''}</div>` : ''}</div>
          <span style="font-size:12px;font-weight:700;color:${color};white-space:nowrap;">${item.points}/${item.maxPoints}</span>
        </div>`;
      }).join('');
      return `<div style="margin-bottom:14px;border-radius:10px;border:1px solid ${DARK.border};overflow:hidden;">
        <div style="display:flex;justify-content:space-between;padding:10px 14px;background:${DARK.bgCard};"><span style="font-size:13px;font-weight:600;color:${DARK.text};">${cat.name}</span><span style="font-size:13px;font-weight:700;color:${getScoreColor(cat.score)};">${cat.score}%</span></div>
        ${rows}</div>`;
    }).join('');

    // Tasks
    const tasksHtml = Object.entries(tasks).map(([catName, catTasks]) => {
      if (catTasks.length === 0) return '';
      const rows = catTasks.map((x) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 12px;border-bottom:1px solid #0f172a;">
          <span style="width:7px;height:7px;border-radius:50%;background:${x.status === 'done' ? '#22c55e' : getPriorityColor(x.priority)};flex-shrink:0;"></span>
          <span style="flex:1;font-size:12px;color:${x.status === 'done' ? '#64748b' : '#cbd5e1'};${x.status === 'done' ? 'text-decoration:line-through;' : ''}">${x.title}</span>
          <span style="font-size:10px;font-weight:600;color:${getPriorityColor(x.priority)};text-transform:uppercase;">${getPriorityLabel(x.priority)}</span>
          ${x.points ? `<span style="font-size:11px;font-weight:600;color:#6366f1;">+${x.points}</span>` : ''}
        </div>`).join('');
      return `<div style="margin-bottom:10px;border-radius:10px;border:1px solid ${DARK.border};overflow:hidden;">
        <div style="padding:8px 14px;background:${DARK.bgCard};"><span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">${catName}</span></div>
        ${rows}</div>`;
    }).join('');

    // Profile
    const profileHtml = (profile.description || profile.industry || profile.stage) ? `
      <div style="margin:16px 0;padding:16px;border-radius:12px;background:${DARK.bgCard};border:1px solid ${DARK.border};">
        <div style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Company Profile</div>
        ${profile.description ? `<p style="font-size:13px;color:#94a3b8;line-height:1.5;margin-bottom:10px;">${profile.description}</p>` : ''}
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${[profile.industry && `Industry: ${profile.industry}`, profile.stage && `Stage: ${profile.stage}`, profile.location && `Location: ${profile.location}`, profile.team_size && `Team: ${profile.team_size}`, profile.founded_year && `Founded: ${profile.founded_year}`, profile.website && profile.website].filter(Boolean).map((v) => `<span style="padding:4px 10px;border-radius:6px;background:${DARK.border};font-size:11px;color:#94a3b8;">${v}</span>`).join('')}
        </div>
      </div>` : '';

    // Strengths + Gaps
    const sHtml = strengths.map((s) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(34,197,94,0.08);"><span style="color:#d1d5db;font-size:13px;">${s.name}</span><span style="font-weight:700;color:#22c55e;font-size:13px;">${s.score}%</span></div>`).join('') || '<p style="color:#6b7280;font-size:12px;">None above 70%</p>';
    const gHtml = gaps.map((g) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(239,68,68,0.08);"><span style="color:#d1d5db;font-size:13px;">${g.name}</span><span style="font-weight:700;color:#ef4444;font-size:13px;">${g.score}%</span></div>`).join('') || '<p style="color:#6b7280;font-size:12px;">All above 50%</p>';

    pw.document.write(`<!DOCTYPE html><html><head>
      <title>${companyName} — Investor Frictionless Report</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'DM Sans',system-ui,sans-serif;background:${DARK.bg};color:${DARK.text};}
        .page{max-width:720px;margin:0 auto;padding:28px 20px;}
        @media print{body{padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{padding:14px;}@page{margin:0.4in;size:A4;}.no-print{display:none!important;}.page-break{page-break-before:always;}}
        h2{font-size:13px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;}
      </style>
    </head><body><div class="page">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:14px;border-bottom:1px solid ${DARK.border};margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;">${LOGO_SVG}<span style="font-size:18px;font-weight:700;color:#818cf8;letter-spacing:-0.5px;">Frictionless</span></div>
        <div style="text-align:right;"><div style="font-size:11px;color:#64748b;">Investor Frictionless Report</div><div style="font-size:11px;color:#4b5563;">${generatedDate}</div></div>
      </div>

      <!-- Title -->
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:27px;font-weight:700;color:#f8fafc;margin-bottom:4px;">${companyName}</div>
        ${profile.description ? `<p style="font-size:13px;color:#64748b;max-width:480px;margin:0 auto;line-height:1.5;">${profile.description}</p>` : ''}
      </div>

      <!-- Score -->
      <div style="display:flex;align-items:center;justify-content:center;gap:24px;margin:20px 0;padding:20px;border-radius:14px;background:${DARK.bgCard};border:1px solid ${DARK.border};">
        <div style="width:110px;height:110px;border-radius:50%;border:5px solid ${scoreColor};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
          <div style="font-size:39px;font-weight:700;color:${scoreColor};line-height:1;">${Math.round(score)}</div>
          <div style="font-size:10px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">${getScoreLabel(score)}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px 20px;">
          <div style="text-align:center;"><div style="font-size:19px;font-weight:700;color:#f8fafc;">${categories.length}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Categories</div></div>
          <div style="text-align:center;"><div style="font-size:19px;font-weight:700;color:#22c55e;">${strengths.length}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Strengths</div></div>
          <div style="text-align:center;"><div style="font-size:19px;font-weight:700;color:#ef4444;">${gaps.length}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Gaps</div></div>
          <div style="text-align:center;"><div style="font-size:19px;font-weight:700;color:#6366f1;">${data.completedTasks ?? doneTasks.length}/${data.totalTasks ?? allTasks.length}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Tasks</div></div>
          <div style="text-align:center;"><div style="font-size:19px;font-weight:700;color:#22c55e;">${completedRubricItems}/${totalRubricItems}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Rubric Items</div></div>
          ${data.delta ? `<div style="text-align:center;"><div style="font-size:19px;font-weight:700;color:${(data.delta ?? 0) >= 0 ? '#22c55e' : '#ef4444'};">${(data.delta ?? 0) >= 0 ? '+' : ''}${data.delta}%</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Change</div></div>` : `<div style="text-align:center;"><div style="font-size:19px;font-weight:700;color:#f59e0b;">+${totalPotentialPoints}</div><div style="font-size:10px;color:#64748b;text-transform:uppercase;">Pts Available</div></div>`}
        </div>
      </div>

      ${aiHtml}
      ${profileHtml}

      <!-- Categories -->
      <div style="padding:16px;border-radius:12px;background:${DARK.bgCard};border:1px solid ${DARK.border};margin-bottom:14px;">
        <h2>Category Breakdown</h2>${catHtml}
      </div>

      <!-- Strengths + Gaps -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div style="padding:14px;border-radius:12px;background:${DARK.greenBg};border:1px solid ${DARK.greenBorder};">
          <div style="font-size:12px;font-weight:600;color:#22c55e;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Strengths</div>${sHtml}
        </div>
        <div style="padding:14px;border-radius:12px;background:${DARK.redBg};border:1px solid ${DARK.redBorder};">
          <div style="font-size:12px;font-weight:600;color:#ef4444;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Improvement Areas</div>${gHtml}
        </div>
      </div>

      <!-- Rubric -->
      <div class="page-break"></div>
      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">${LOGO_SVG.replace(/width="32" height="32"/, 'width="18" height="18"')}<h2 style="margin-bottom:0;">Detailed Assessment</h2></div>
        ${rubricHtml}
      </div>

      <!-- Tasks -->
      ${Object.keys(tasks).length > 0 ? `<div class="page-break"></div><div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">${LOGO_SVG.replace(/width="32" height="32"/, 'width="18" height="18"')}<h2 style="margin-bottom:0;">Recommended Actions</h2><span style="margin-left:auto;font-size:11px;color:#6366f1;font-weight:600;">${pendingTasks.length} pending &middot; ${doneTasks.length} done</span></div>
        ${tasksHtml}</div>` : ''}

      <!-- Footer -->
      <div style="text-align:center;padding:16px 0;border-top:1px solid ${DARK.border};margin-top:14px;">
        <div style="display:inline-flex;align-items:center;gap:6px;margin-bottom:3px;">${LOGO_SVG.replace(/width="32" height="32"/, 'width="14" height="14"')}<span style="font-size:12px;font-weight:600;color:#818cf8;">Frictionless Intelligence</span></div>
        <div style="font-size:10px;color:#4b5563;">${generatedDate} &middot; Confidential</div>
      </div>
    </div></body></html>`);

    pw.document.close();
    setTimeout(() => { pw.print(); }, 800);
  }, [data, companyName, sortedCategories, strengths, gaps, profile, tasks, ai, generatedDate, score, scoreColor, categories, pendingTasks, doneTasks, totalPotentialPoints, completedRubricItems, totalRubricItems]);

  /* ---------- WEB VIEW ---------- */
  return (
    <div style={{ background: t.bg, color: t.text, minHeight: '100vh', transition: 'background 0.3s, color 0.3s' }}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">

        {/* Sticky top bar: logo + theme toggle */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Frictionless" width={36} height={36} className="rounded-lg" />
            <span className="text-lg font-bold tracking-tight" style={{ color: t.indigoText }}>Frictionless</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg transition-colors"
              style={{ background: isDark ? '#1e293b' : '#e2e8f0' }}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
            <div className="text-right">
              <div className="text-[12px]" style={{ color: t.textMuted }}>Investor Frictionless Report</div>
              <div className="text-[12px]" style={{ color: t.textMuted }}>{generatedDate}</div>
            </div>
          </div>
        </div>

        {/* Company title */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-1.5" style={{ color: t.text }}>{companyName}</h1>
          {profile.description && (
            <p className="text-sm max-w-xl mx-auto leading-relaxed" style={{ color: t.textSecondary }}>{profile.description}</p>
          )}
        </motion.div>

        {/* Score hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-5 p-6 rounded-2xl"
          style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
        >
          <div
            className="w-32 h-32 rounded-full flex flex-col items-center justify-center shrink-0"
            style={{ border: `5px solid ${scoreColor}` }}
          >
            <span className="text-4xl font-bold leading-none" style={{ color: scoreColor }}>{Math.round(score)}</span>
            <span className="text-[11px] font-semibold uppercase tracking-wider mt-1" style={{ color: t.textMuted }}>{getScoreLabel(score)}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><div className="text-xl font-bold" style={{ color: t.text }}>{categories.length}</div><div className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Categories</div></div>
            <div><div className="text-xl font-bold" style={{ color: t.greenText }}>{strengths.length}</div><div className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Strengths</div></div>
            <div><div className="text-xl font-bold" style={{ color: t.redText }}>{gaps.length}</div><div className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Gaps</div></div>
            <div><div className="text-xl font-bold" style={{ color: t.indigoText }}>{data.completedTasks ?? doneTasks.length}/{data.totalTasks ?? allTasks.length}</div><div className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Tasks</div></div>
            <div><div className="text-xl font-bold" style={{ color: t.greenText }}>{completedRubricItems}/{totalRubricItems}</div><div className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Rubric Items</div></div>
            {data.delta !== undefined && data.delta !== 0 ? (
              <div>
                <div className="text-xl font-bold flex items-center justify-center gap-1" style={{ color: data.delta >= 0 ? t.greenText : t.redText }}>
                  {data.delta >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {data.delta >= 0 ? '+' : ''}{data.delta}%
                </div>
                <div className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Change</div>
              </div>
            ) : totalPotentialPoints > 0 ? (
              <div><div className="text-xl font-bold" style={{ color: t.amberText }}>+{totalPotentialPoints}</div><div className="text-[11px] uppercase tracking-wider" style={{ color: t.textMuted }}>Pts Available</div></div>
            ) : null}
          </div>
        </motion.div>

        {/* AI Insights */}
        {(ai.executive_summary || ai.investor_verdict || (ai.top_priorities && ai.top_priorities.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl p-5 mb-5"
            style={{ background: isDark ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.06)', border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.2)'}` }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Image src="/logo.png" alt="Frictionless" width={20} height={20} className="rounded" />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.indigoText }}>Frictionless Intelligence</span>
            </div>

            {ai.executive_summary && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Brain className="w-3.5 h-3.5" style={{ color: t.indigoText }} />
                  <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>Executive Summary</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: t.text }}>{ai.executive_summary}</p>
              </div>
            )}

            {ai.investor_verdict && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Eye className="w-3.5 h-3.5" style={{ color: t.amberText }} />
                  <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>Investor Perspective</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: t.text }}>{ai.investor_verdict}</p>
              </div>
            )}

            {ai.top_priorities && ai.top_priorities.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3.5 h-3.5" style={{ color: t.amberText }} />
                  <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>Top Priorities</span>
                </div>
                <div className="space-y-1.5">
                  {ai.top_priorities.map((p, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-xs font-bold shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: isDark ? '#1e293b' : '#e2e8f0', color: t.amberText }}>{i + 1}</span>
                      <span className="text-xs leading-relaxed" style={{ color: t.text }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Company Profile */}
        {(profile.industry || profile.stage || profile.location) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl p-5 mb-4"
            style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4" style={{ color: t.indigoText }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>Company Profile</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.industry && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: t.bgCardAlt, color: t.textSecondary, border: `1px solid ${t.border}` }}><Briefcase className="w-3 h-3" /> {profile.industry}</span>}
              {profile.stage && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: t.bgCardAlt, color: t.textSecondary, border: `1px solid ${t.border}` }}><TrendingUp className="w-3 h-3" /> {profile.stage}</span>}
              {profile.location && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: t.bgCardAlt, color: t.textSecondary, border: `1px solid ${t.border}` }}><MapPin className="w-3 h-3" /> {profile.location}</span>}
              {profile.team_size && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: t.bgCardAlt, color: t.textSecondary, border: `1px solid ${t.border}` }}><Users className="w-3 h-3" /> {profile.team_size} members</span>}
              {profile.founded_year && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: t.bgCardAlt, color: t.textSecondary, border: `1px solid ${t.border}` }}><Calendar className="w-3 h-3" /> Founded {profile.founded_year}</span>}
              {profile.website && <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: t.bgCardAlt, color: t.textSecondary, border: `1px solid ${t.border}` }}><Globe className="w-3 h-3" /> {profile.website}</span>}
            </div>
          </motion.div>
        )}

        {/* Score History */}
        {scoreHistory.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="rounded-2xl p-5 mb-4"
            style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4" style={{ color: t.indigoText }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>Score History</h2>
            </div>
            <ScoreHistoryChart history={scoreHistory} theme={t} />
          </motion.div>
        )}

        {/* Radar + Category Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {categories.length >= 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
              className="rounded-2xl p-4 flex items-center justify-center"
              style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
            >
              <RadarChartSVG categories={categories} theme={t} />
            </motion.div>
          )}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
            className="rounded-2xl p-5" style={{ background: t.bgCard, border: `1px solid ${t.border}` }}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: t.textSecondary }}>Category Breakdown</h2>
            <div className="space-y-3">
              {sortedCategories.map((cat, idx) => {
                const color = getScoreColor(cat.score);
                return (
                  <motion.div key={cat.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 + idx * 0.03 }} className="flex items-center gap-3">
                    <span className="text-xs font-medium flex-1 truncate" style={{ color: t.textSecondary }}>{cat.name}</span>
                    <div className="w-28 h-2.5 rounded-full overflow-hidden" style={{ background: t.bgCardAlt }}>
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} initial={{ width: 0 }} animate={{ width: `${cat.score}%` }} transition={{ duration: 0.8, delay: 0.18 + idx * 0.03 }} />
                    </div>
                    <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color }}>{cat.score}%</span>
                    {cat.weight && <span className="text-[11px] w-8 text-right" style={{ color: t.textMuted }}>{cat.weight}%</span>}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Strengths + Gaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="rounded-2xl p-5" style={{ background: t.greenBg, border: `1px solid ${t.greenBorder}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" style={{ color: t.greenText }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.greenText }}>Strengths</h3>
            </div>
            {strengths.length > 0 ? (
              <div className="space-y-2">{strengths.map((s) => (
                <div key={s.key} className="flex items-center justify-between text-sm">
                  <span style={{ color: t.text }}>{s.name}</span>
                  <span className="font-bold tabular-nums" style={{ color: t.greenText }}>{s.score}%</span>
                </div>
              ))}</div>
            ) : <p className="text-xs" style={{ color: t.textMuted }}>No categories above 70%</p>}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }}
            className="rounded-2xl p-5" style={{ background: t.redBg, border: `1px solid ${t.redBorder}` }}
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: t.redText }} />
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.redText }}>Areas for Improvement</h3>
            </div>
            {gaps.length > 0 ? (
              <div className="space-y-2">{gaps.map((g) => (
                <div key={g.key} className="flex items-center justify-between text-sm">
                  <span style={{ color: t.text }}>{g.name}</span>
                  <span className="font-bold tabular-nums" style={{ color: t.redText }}>{g.score}%</span>
                </div>
              ))}</div>
            ) : <p className="text-xs" style={{ color: t.textMuted }}>All categories above 50%</p>}
          </motion.div>
        </div>

        {/* Detailed Assessment */}
        {sortedCategories.some((c) => c.items && c.items.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4" style={{ color: t.indigoText }} />
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>Detailed Assessment</h2>
              <span className="text-[11px] ml-auto" style={{ color: t.textMuted }}>{completedRubricItems} complete &middot; {partialRubricItems} partial &middot; {totalRubricItems - completedRubricItems - partialRubricItems} missing</span>
            </div>
            <div className="space-y-3">
              {sortedCategories.map((cat) => {
                if (!cat.items || cat.items.length === 0) return null;
                const color = getScoreColor(cat.score);
                const catComplete = cat.items.filter((i) => i.points >= i.maxPoints && i.maxPoints > 0).length;
                return (
                  <div key={cat.key} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                    <div className="flex items-center justify-between px-5 py-3" style={{ background: t.bgCard, borderBottom: `1px solid ${t.border}` }}>
                      <span className="text-sm font-semibold" style={{ color: t.text }}>{cat.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px]" style={{ color: t.textMuted }}>{catComplete}/{cat.items.length}</span>
                        <span className="text-sm font-bold" style={{ color }}>{cat.score}%</span>
                      </div>
                    </div>
                    <div>
                      {cat.items.map((item, idx) => {
                        const pct = item.maxPoints > 0 ? Math.round((item.points / item.maxPoints) * 100) : 0;
                        const itemColor = pct >= 80 ? t.greenText : pct >= 60 ? t.amberText : t.redText;
                        return (
                          <div key={idx} className="flex items-start gap-3 px-5 py-2.5" style={{ borderBottom: `1px solid ${t.borderLight}` }}>
                            <div className="mt-0.5 shrink-0">
                              {pct >= 80 ? <CheckCircle2 className="w-4 h-4" style={{ color: itemColor }} /> : pct > 0 ? <CircleDot className="w-4 h-4" style={{ color: itemColor }} /> : <Minus className="w-4 h-4" style={{ color: itemColor }} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs leading-relaxed" style={{ color: t.text }}>{item.question}</div>
                              {item.answer && <div className="text-[12px] mt-0.5 truncate" style={{ color: t.textMuted }}>{String(item.answer)}</div>}
                              {item.reasoning && <div className="text-[11px] mt-0.5 italic" style={{ color: t.textMuted }}>{String(item.reasoning).slice(0, 150)}</div>}
                            </div>
                            <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: itemColor }}>{item.points}/{item.maxPoints}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Tasks */}
        {Object.keys(tasks).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4" style={{ color: t.indigoText }} />
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>Recommended Actions</h2>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold" style={{ color: t.indigoText }}>{pendingTasks.length} pending</span>
                <span className="font-semibold" style={{ color: t.greenText }}>{doneTasks.length} done</span>
                {totalPotentialPoints > 0 && <span className="font-semibold" style={{ color: t.amberText }}>+{totalPotentialPoints} pts</span>}
              </div>
            </div>

            {allTasks.length > 0 && (
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: t.bgCardAlt }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(doneTasks.length / allTasks.length) * 100}%`, background: 'linear-gradient(to right, #6366f1, #22c55e)' }} />
                </div>
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: t.textMuted }}>{Math.round((doneTasks.length / allTasks.length) * 100)}%</span>
              </div>
            )}

            <div className="space-y-3">
              {Object.entries(tasks).map(([catName, catTasks]) => {
                if (catTasks.length === 0) return null;
                const catDone = catTasks.filter((x) => x.status === 'done').length;
                return (
                  <div key={catName} className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${t.border}` }}>
                    <div className="flex items-center justify-between px-5 py-3" style={{ background: t.bgCard, borderBottom: `1px solid ${t.border}` }}>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textSecondary }}>{catName}</span>
                      <span className="text-[12px]" style={{ color: t.textMuted }}>{catDone}/{catTasks.length} done</span>
                    </div>
                    <div>
                      {catTasks.map((task, idx) => {
                        const isDone = task.status === 'done';
                        return (
                          <div key={idx} className="flex items-center gap-3 px-5 py-2.5" style={{ borderBottom: `1px solid ${t.borderLight}` }}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isDone ? t.greenText : getPriorityColor(task.priority) }} />
                            <span className={`flex-1 text-xs ${isDone ? 'line-through' : ''}`} style={{ color: isDone ? t.textMuted : t.text }}>{task.title}</span>
                            <span className="text-[11px] font-semibold uppercase" style={{ color: getPriorityColor(task.priority) }}>{getPriorityLabel(task.priority)}</span>
                            {task.points > 0 && <span className="text-[11px] font-semibold tabular-nums" style={{ color: t.indigoText }}>+{task.points}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Download */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="text-center py-6">
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-2.5 px-10 py-4 rounded-xl text-white text-sm font-semibold transition-all shadow-lg"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)' }}
          >
            <Download className="w-4.5 h-4.5" />
            Download as PDF
          </button>
        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 pt-4 pb-8" style={{ borderTop: `1px solid ${t.border}` }}>
          <Image src="/logo.png" alt="Frictionless" width={16} height={16} className="rounded opacity-60" />
          <span className="text-xs" style={{ color: t.textMuted }}>
            Powered by <span className="font-semibold" style={{ color: t.indigoText }}>Frictionless Intelligence</span> &middot; {generatedDate}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Main Share Page
   ================================================================ */
export default function SharePage() {
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((data) => setPayload(data))
      .catch(() => setPayload({ share_type: 'company_profile', error: 'Failed to load' }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  if (!payload || payload.error) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex flex-col items-center justify-center p-6">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Link Invalid or Expired</h1>
        <p className="text-gray-400 text-sm mb-6 text-center max-w-md">
          This share link may have expired or been revoked. Please request a new link from the owner.
        </p>
        <Link href="/" className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium">Go to Frictionless</Link>
      </div>
    );
  }

  if (payload.share_type === 'readiness_report' && payload.readiness) {
    return (
      <ReadinessReport
        data={payload.readiness}
        companyName={payload.readiness.company_name || payload.company_name || 'Startup'}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          {payload.share_type === 'data_room' ? <FolderOpen className="w-8 h-8 text-indigo-400" /> : <Building2 className="w-8 h-8 text-indigo-400" />}
          <div>
            <h1 className="text-2xl font-bold">{payload.share_type === 'data_room' ? 'Data Room' : 'Company Profile'}</h1>
            <p className="text-sm text-gray-400">{payload.company_name || 'Shared via Frictionless'}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
          <p className="text-sm text-gray-300">
            {payload.share_type === 'company_profile' ? 'View-only access to the company profile.' :
              Array.isArray(payload.documents) && payload.documents.length > 0 ? `${payload.documents.length} document(s) available.` : 'Data room documents.'}
          </p>
        </div>
        <p className="text-xs text-gray-600 mt-6 text-center">
          Shared via <Link href="/" className="text-indigo-400 hover:underline">Frictionless Intelligence</Link>
        </p>
      </motion.div>
    </div>
  );
}
