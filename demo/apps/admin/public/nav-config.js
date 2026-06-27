/* Admin Console — single canonical rail navigation (Spec 019/020).
 * Admin tab buttons use `data-tab` + setTab(); the shell resolves them via findTab(). */
window.LEARNEU_APP = 'Admin Console';
window.LEARNEU_NAV = [
  { label: 'Overview', icon: '📊', tab: 'overview' },
  { label: 'Users & sheets', icon: '👥', tab: 'users' },
  { label: 'Activity', icon: '📈', tab: 'activity' },
  { label: 'Safety & Quality', icon: '🛡️', tab: 'safety' },
  { label: 'Reference data', icon: '📚', tab: 'data' },
  { label: 'Integrations', icon: '🔌', tab: 'integrations' },
  { label: 'Content Governance', icon: '⚖️', tab: 'governance' },
  { label: 'Hierarchy', icon: '🏫', tab: 'hierarchy' },
  { label: 'A/B Experiments', icon: '🧪', tab: 'experiments' }
];
