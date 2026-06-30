# Monitoring evidence - 2026-06-30

## Public endpoint observations

All public app root URLs returned the shared LearnEU login portal during read-only HTTP checks:

- learner: `https://app-learner-web-learneu-demo.azurewebsites.net/`
- parent: `https://app-parent-portal-learneu-demo.azurewebsites.net/`
- teacher: `https://app-teacher-console-learneu-demo.azurewebsites.net/`
- admin: `https://app-admin-learneu-demo.azurewebsites.net/`
- director: `https://app-director-portal-learneu-demo.azurewebsites.net/`

## Non-destructive limitations

Post-login workflows, write-only probes, wake-up actions, health reloads, generation, approval, save, send, and deployment actions were not performed in this scheduled run.

