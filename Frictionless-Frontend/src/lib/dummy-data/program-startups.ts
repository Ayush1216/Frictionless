/**
 * Program-Startup assignments: links startups to programs with stage, mentor, notes, score history.
 * psId = program-startup id used in routes.
 */

export interface ProgramStartupAssignment {
  id: string; // psId
  program_id: string;
  startup_org_id: string;
  stage_id: string;
  mentor_id: string | null;
  notes: string;
  score_history: Array<{ date: string; score: number }>;
}

export const dummyProgramStartups: ProgramStartupAssignment[] = [
  // prog-1 (upcoming) - Application Review stage
  { id: 'ps-prog1-neuralpay', program_id: 'prog-1', startup_org_id: 'startup-neuralpay', stage_id: 'prog-1-s1', mentor_id: 'mentor-1', notes: 'Strong fintech fit. Schedule interview.', score_history: [{ date: '2025-02-01', score: 82 }] },
  { id: 'ps-prog1-greengrid', program_id: 'prog-1', startup_org_id: 'startup-greengrid', stage_id: 'prog-1-s1', mentor_id: null, notes: 'Cleantech focus. Review metrics.', score_history: [{ date: '2025-02-01', score: 65 }] },
  { id: 'ps-prog1-medflow', program_id: 'prog-1', startup_org_id: 'startup-medflow', stage_id: 'prog-1-s1', mentor_id: null, notes: 'Early stage. Needs deck update.', score_history: [{ date: '2025-02-01', score: 45 }] },
  // prog-2 (completed)
  { id: 'ps-prog2-neuralpay', program_id: 'prog-2', startup_org_id: 'startup-neuralpay', stage_id: 'prog-2-s6', mentor_id: 'mentor-1', notes: 'Graduated. Strong pitch improvement.', score_history: [{ date: '2025-01-06', score: 78 }, { date: '2025-02-14', score: 82 }] },
  { id: 'ps-prog2-datavault', program_id: 'prog-2', startup_org_id: 'startup-datavault', stage_id: 'prog-2-s6', mentor_id: 'mentor-2', notes: 'Excellent data room. Ready for Series B.', score_history: [{ date: '2025-01-06', score: 88 }, { date: '2025-02-14', score: 91 }] },
  { id: 'ps-prog2-financeai', program_id: 'prog-2', startup_org_id: 'startup-financeai', stage_id: 'prog-2-s6', mentor_id: 'mentor-3', notes: 'Polished narrative. Great investor intros.', score_history: [{ date: '2025-01-06', score: 80 }, { date: '2025-02-14', score: 85 }] },
  { id: 'ps-prog2-cloudnine', program_id: 'prog-2', startup_org_id: 'startup-cloudnine', stage_id: 'prog-2-s5', mentor_id: 'mentor-4', notes: 'In mock meetings. Strong technical story.', score_history: [{ date: '2025-01-06', score: 72 }, { date: '2025-02-01', score: 77 }] },
  { id: 'ps-prog2-shopsphere', program_id: 'prog-2', startup_org_id: 'startup-shopsphere', stage_id: 'prog-2-s4', mentor_id: 'mentor-5', notes: 'Working on investor outreach strategy.', score_history: [{ date: '2025-01-06', score: 54 }, { date: '2025-01-20', score: 58 }] },
  { id: 'ps-prog2-eduspark', program_id: 'prog-2', startup_org_id: 'startup-eduspark', stage_id: 'prog-2-s5', mentor_id: 'mentor-6', notes: 'Pitch refinement complete. Ready for mocks.', score_history: [{ date: '2025-01-06', score: 63 }, { date: '2025-02-01', score: 69 }] },
  { id: 'ps-prog2-cybershield', program_id: 'prog-2', startup_org_id: 'startup-cybershield', stage_id: 'prog-2-s6', mentor_id: 'mentor-2', notes: 'Graduated. SOC 2 story resonated.', score_history: [{ date: '2025-01-06', score: 68 }, { date: '2025-02-14', score: 73 }] },
  { id: 'ps-prog2-foodtech', program_id: 'prog-2', startup_org_id: 'startup-foodtech', stage_id: 'prog-2-s3', mentor_id: null, notes: 'Deck workshop this week.', score_history: [{ date: '2025-01-06', score: 59 }, { date: '2025-01-13', score: 62 }] },
  // prog-3 (active)
  { id: 'ps-prog3-biogenesis', program_id: 'prog-3', startup_org_id: 'startup-biogenesis', stage_id: 'prog-3-s3', mentor_id: 'mentor-2', notes: 'Deep tech story strong. Working on investor deck.', score_history: [{ date: '2025-01-20', score: 85 }, { date: '2025-02-01', score: 88 }] },
  { id: 'ps-prog3-quantumleap', program_id: 'prog-3', startup_org_id: 'startup-quantumleap', stage_id: 'prog-3-s4', mentor_id: 'mentor-1', notes: 'Pre-IPO prep. Data room complete.', score_history: [{ date: '2025-01-20', score: 92 }, { date: '2025-02-01', score: 94 }] },
  { id: 'ps-prog3-proptech', program_id: 'prog-3', startup_org_id: 'startup-proptech', stage_id: 'prog-3-s2', mentor_id: 'mentor-5', notes: 'GTM workshop feedback applied.', score_history: [{ date: '2025-01-20', score: 52 }, { date: '2025-02-01', score: 54 }] },
  { id: 'ps-prog3-urbanmobility', program_id: 'prog-3', startup_org_id: 'startup-urbanmobility', stage_id: 'prog-3-s1', mentor_id: null, notes: 'New addition. Onboarding in progress.', score_history: [{ date: '2025-02-01', score: 41 }] },
  { id: 'ps-prog3-agribot', program_id: 'prog-3', startup_org_id: 'startup-agribot', stage_id: 'prog-3-s1', mentor_id: 'mentor-4', notes: 'Hardware focus. Needs financial model.', score_history: [{ date: '2025-01-20', score: 30 }, { date: '2025-02-01', score: 32 }] },
  { id: 'ps-prog3-medflow', program_id: 'prog-3', startup_org_id: 'startup-medflow', stage_id: 'prog-3-s2', mentor_id: 'mentor-6', notes: 'Healthtech workshops. Improving pitch.', score_history: [{ date: '2025-01-20', score: 43 }, { date: '2025-02-01', score: 45 }] },
];
