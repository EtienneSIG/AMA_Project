'use strict';

const crypto = require('crypto');

const FALLBACK_SKILLS = [
  { skillId: 'SK-FRAC-ADD', label: 'Add fractions', chapter: 'Fractions - operations', level: 0.42, attempts: 3 },
  { skillId: 'SK-FRAC-SIMPLIFY', label: 'Simplify fractions', chapter: 'Fractions - basics', level: 0.55, attempts: 4 },
  { skillId: 'SK-FRAC-WORD', label: 'Fraction word problems', chapter: 'Fractions - word problems', level: 0.34, attempts: 2 },
  { skillId: 'SK-FRAC-MIXED', label: 'Mixed numbers', chapter: 'Fractions - operations', level: 0.48, attempts: 3 }
];

function text(value, fallback = '') {
  return String(value == null ? fallback : value).trim().slice(0, 500);
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function planIdFor(seed) {
  return crypto.createHash('sha256').update(JSON.stringify(seed)).digest('hex').slice(0, 16);
}

function normaliseMastery(rows) {
  const source = Array.isArray(rows) && rows.length ? rows : FALLBACK_SKILLS;
  return source
    .map(row => ({
      skillId: row.skillId || row.skill_id || row.id || 'SK-UNKNOWN',
      label: row.label || row.skillLabel || row.skill_id || 'Practice skill',
      chapter: row.chapter || 'General',
      level: Math.max(0, Math.min(1, Number(row.level) || 0)),
      attempts: Number(row.attempts) || 0
    }))
    .sort((a, b) => (a.level - b.level) || (a.attempts - b.attempts) || a.label.localeCompare(b.label))
    .slice(0, 5);
}

function buildStudyPlan({ learnerEmail, goal, days, minutesPerDay, mastery }) {
  const focus = normaliseMastery(mastery);
  const dayCount = clampInt(days, 3, 10, 5);
  const minutes = clampInt(minutesPerDay, 10, 45, 20);
  const seed = { learnerEmail, goal, dayCount, minutes, focus: focus.map(s => `${s.skillId}:${s.level}`) };
  const id = planIdFor(seed);
  const schedule = [];
  for (let i = 0; i < dayCount; i++) {
    const primary = focus[i % focus.length] || FALLBACK_SKILLS[0];
    const secondary = focus[(i + 1) % focus.length] || primary;
    schedule.push({
      day: i + 1,
      focusSkillId: primary.skillId,
      focus: primary.label,
      chapter: primary.chapter,
      autonomousSteps: [
        `Diagnose: review the last mastery signal for ${primary.label}.`,
        `Plan: choose one ${minutes}-minute activity in ${primary.chapter}.`,
        `Act: complete 3 adaptive items, then explain one answer in your own words.`,
        `Reflect: compare ${primary.label} with ${secondary.label} and note one confusion point.`
      ],
      teacherOversight: i === dayCount - 1
        ? 'Teacher reviews evidence and decides whether to close the plan or assign remediation.'
        : 'Teacher can adjust or pause the plan before the next day if the learner is stuck.',
      medal: primary.level >= 0.7 ? 'Consistency medal' : 'Catch-up medal',
      successCheck: primary.level >= 0.7
        ? 'Keep accuracy above 80% and submit one clear explanation.'
        : 'Reach at least 2 correct attempts and ask for help if confidence stays low.'
    });
  }
  return {
    id,
    learnerEmail,
    goal: goal || 'Improve fraction mastery this week',
    status: 'teacher_review_required',
    model: 'deterministic-agentic-planner-v1',
    orchestration: [
      'Reads learner mastery signals',
      'Selects weakest skills',
      'Builds a multi-day sequence',
      'Routes plan to teacher approval',
      'Records audit evidence'
    ],
    humanOversight: {
      required: true,
      approverRole: 'teacher',
      rationale: 'The plan can influence learning path and therefore requires teacher approval before learner-facing assignment.'
    },
    schedule
  };
}

module.exports = function mountStudyPlanRoutes(app, { db, cs, APP_ROLE }) {
  app.post('/api/agentic/study-plan/draft', async (req, res) => {
    const actor = req.user;
    if (!actor || !['student', 'teacher', 'admin'].includes(actor.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const learnerEmail = actor.role === 'student'
      ? actor.email
      : text(req.body && req.body.learnerEmail, 'student@learneu.demo').toLowerCase();
    if (actor.role === 'student' && learnerEmail !== actor.email) {
      return res.status(403).json({ error: 'students can only draft plans for themselves' });
    }
    const goal = text(req.body && req.body.goal, 'Improve fraction mastery this week');
    const scan = cs && typeof cs.analyze === 'function' ? await cs.analyze(goal) : { ran: false, blocked: false };
    if (scan.ran && scan.blocked) {
      return res.status(400).json({ error: 'input_blocked', severities: scan.severities, threshold: scan.threshold });
    }
    const mastery = db && db.enabled && typeof db.listMasteryForLearner === 'function'
      ? await db.listMasteryForLearner({ email: learnerEmail, limit: 12 }).catch(() => null)
      : null;
    const plan = buildStudyPlan({
      learnerEmail,
      goal,
      days: req.body && req.body.days,
      minutesPerDay: req.body && req.body.minutesPerDay,
      mastery
    });
    let reviewQuestionId = null;
    if (db && db.enabled && typeof db.createTeacherQuestion === 'function' && actor.role === 'student') {
      const row = await db.createTeacherQuestion({
        learnerEmail,
        learnerName: [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim() || learnerEmail,
        subject: 'Teacher approval needed: agentic study plan',
        question: `Please review and approve this AI-planned study sequence before I follow it.\n\nPlan ${plan.id}: ${plan.goal}\n\nFocus: ${plan.schedule.map(d => d.focus).join(', ')}`
      }).catch(() => null);
      reviewQuestionId = row && row.id ? row.id : null;
    }
    if (db && typeof db.recordAuditEvent === 'function') {
      db.recordAuditEvent({
        eventType: 'agentic_study_plan_drafted',
        actorId: actor.email,
        actorRole: actor.role,
        targetType: 'study_plan',
        targetId: plan.id,
        scope: { learnerEmail, appRole: APP_ROLE, reviewQuestionId, focusSkills: plan.schedule.map(d => d.focusSkillId) },
        outcome: 'teacher_review_required',
        correlationId: plan.id
      }).catch(() => {});
    }
    res.json({ plan, teacherReviewRequired: true, reviewQuestionId });
  });

  app.post('/api/agentic/study-plan/approve', async (req, res) => {
    const actor = req.user;
    if (!actor || !['teacher', 'admin'].includes(actor.role)) {
      return res.status(403).json({ error: 'teacher approval required' });
    }
    const plan = req.body && req.body.plan;
    if (!plan || !plan.id || !Array.isArray(plan.schedule)) {
      return res.status(400).json({ error: 'valid plan required' });
    }
    const approvedPlan = { ...plan, status: 'approved', approvedBy: actor.email, approvedAt: new Date().toISOString() };
    if (db && db.enabled && typeof db.createSheet === 'function' && approvedPlan.learnerEmail) {
      await db.createSheet({
        email: approvedPlan.learnerEmail,
        role: 'student',
        app: 'student',
        title: `Teacher-approved study plan - ${approvedPlan.goal}`,
        prompt: `Approved by ${actor.email}`,
        answer: approvedPlan.schedule.map(day => `## Day ${day.day}: ${day.focus}\n\n${day.autonomousSteps.map(step => `- ${step}`).join('\n')}\n\n**Teacher oversight:** ${day.teacherOversight}\n\n**Medal:** ${day.medal}\n\n**Success check:** ${day.successCheck}`).join('\n\n')
      }).catch(() => null);
    }
    if (db && typeof db.recordAuditEvent === 'function') {
      db.recordAuditEvent({
        eventType: 'agentic_study_plan_approved',
        actorId: actor.email,
        actorRole: actor.role,
        targetType: 'study_plan',
        targetId: approvedPlan.id,
        scope: { learnerEmail: approvedPlan.learnerEmail, appRole: APP_ROLE, dayCount: approvedPlan.schedule.length },
        outcome: 'approved',
        correlationId: approvedPlan.id
      }).catch(() => {});
    }
    res.json({ plan: approvedPlan });
  });
};
