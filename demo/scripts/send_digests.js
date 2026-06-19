// LearnEU — weekly parent digest dispatcher (Feature 6, US4).
//
// Generates one digest per (parent, child) pair for every opted-in parent,
// using the shared DB helpers. Intended to run on a schedule (Sunday 18:00 UTC,
// see send_digests.ps1). Idempotent: re-running for the same ISO week upserts.
//
// "How to help this week" copy is sourced from approved pedagogical guidance,
// reviewed by Learning Sciences (ZPD-aligned, non-prescriptive). Kept in sync
// with the same map served by demo/apps/_shared/server.js.
'use strict';

// Require the parent-portal mirror so `pg` resolves from its node_modules.
const db = require('../apps/parent-portal/db');

const HOW_TO_HELP = {
  numeracy:  'Practise fractions with everyday objects — split a pizza or share coins to make the maths concrete.',
  literacy:  'Read together for 10 minutes and ask your child to summarise the story in their own words.',
  science:   'Cook a simple recipe together and talk about what changes when things heat or cool.',
  language:  'Label a few household objects in the target language and review them at dinner.',
  _default:  'Ask your child to teach you one thing they learned this week — explaining it back deepens learning.'
};
function howToHelpFor(summary) {
  const dom = summary && summary.weakestDomain ? summary.weakestDomain.domain
    : (summary && summary.topDomains && summary.topDomains[0] ? summary.topDomains[0].domain : null);
  const key = dom ? String(dom).toLowerCase() : '_default';
  return HOW_TO_HELP[key] || HOW_TO_HELP._default;
}

// ISO week start (Monday) in UTC for a given date.
function isoWeekStart(d) {
  const dt = new Date(d);
  const day = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - day);
  return dt.toISOString().slice(0, 10);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await db.init();
  if (!db.enabled) {
    console.error('[send_digests] Database not configured (PG_HOST/PG_USER unset). Nothing to do.');
    process.exit(2);
  }
  const weekStart = isoWeekStart(new Date());
  const recipients = (await db.listDigestRecipients()) || [];
  console.log(`[send_digests] week ${weekStart} · ${recipients.length} opted-in (parent,child) pairs · dryRun=${dryRun}`);

  let generated = 0, sent = 0, skipped = 0;
  for (const r of recipients) {
    try {
      const summary = await db.weeklyChildSummary({ childEmail: r.childEmail, weekStart });
      if (!summary || summary.itemsCompleted === 0 && summary.activeDays === 0) {
        // Still send a gentle nudge digest even with no activity, but flag tone.
        summary.tone = summary.tone || 'neutral';
      }
      if (dryRun) {
        console.log(`  would send -> ${r.parentEmail} / ${r.childEmail} (${summary.tone}, ${summary.itemsCompleted} items)`);
        skipped++;
        continue;
      }
      const digest = await db.upsertParentDigest({
        parentEmail: r.parentEmail,
        childEmail: r.childEmail,
        weekStart,
        summary,
        howToHelp: howToHelpFor(summary),
        tone: summary.tone,
        language: r.language || 'en'
      });
      generated++;
      if (digest && digest.id) {
        await db.markDigestSent({ id: digest.id });
        sent++;
      }
    } catch (e) {
      console.error(`  ERROR ${r.parentEmail}/${r.childEmail}:`, String(e).slice(0, 200));
    }
  }
  console.log(`[send_digests] done · generated=${generated} sent=${sent} skipped=${skipped}`);
  process.exit(0);
}

main().catch((e) => { console.error('[send_digests] fatal:', e); process.exit(1); });
