/* Teacher Console — single canonical rail navigation (Spec 019/020).
 * Used by the shell on EVERY page (dashboard + sub-pages) so the menu is identical
 * everywhere. `tab` items switch the in-page section (or deep-link via /?tab= from a
 * sub-page); `href` items open a page. */
window.LEARNEU_APP = 'Teacher Console';
window.LEARNEU_NAV = [
  { label: 'Home', icon: '🏠', href: '/home.html' },
  { label: 'Ask the assistant', icon: '💬', tab: 'ask' },
  { label: 'Learner inbox', icon: '📥', tab: 'inbox' },
  { label: 'Class dashboard', icon: '🧑‍🏫', tab: 'class' },
  { label: 'Assessment', icon: '📝', tab: 'assessment' },
  { label: 'Adaptive paths', icon: '🧭', tab: 'adaptive' },
  { label: 'Integrations', icon: '🔌', tab: 'interop' },
  { label: 'Content versions', icon: '📚', tab: 'content' },
  { label: 'Oversight & audit', icon: '🛡️', tab: 'audit' },
  { label: 'Moderation', icon: '🚦', tab: 'moderation' },
  { label: 'Sharing', icon: '🔗', tab: 'sharing' },
  { label: 'Videos', icon: '📺', tab: 'videos' },
  { label: 'Well-being', icon: '💛', tab: 'wellbeing' }
];
