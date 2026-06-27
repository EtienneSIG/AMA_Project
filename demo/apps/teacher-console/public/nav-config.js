/* Teacher Console — declarative rail navigation for standalone sub-pages (Spec 019/020).
 * The shell (shell.js) reads window.LEARNEU_NAV on pages that have no in-page tabs,
 * so the left menu stays consistent when navigating to Moderation / Sharing / etc. */
window.LEARNEU_NAV = [
  { label: 'Dashboard', href: '/', icon: '🏠' },
  { label: 'Moderation', href: '/moderation.html', icon: '🛡️' },
  { label: 'Sharing', href: '/sharing-log.html', icon: '🔗' },
  { label: 'Videos', href: '/video-catalogue.html', icon: '📺' },
  { label: 'Well-being', href: '/wellbeing.html', icon: '💛' }
];
