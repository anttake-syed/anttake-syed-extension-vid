# Commit Message Style

## Rules
- Commit messages must be **professional and clean**.
- The **subject line** must follow conventional commits: `type(scope): short description`
- The **body** (if needed) describes **what changed and why** — not how the implementation works internally.
- Do NOT include implementation strategy commentary in the body (e.g. "Zero backend cost", "Core code unchanged", "Switch variant by changing one line"). That belongs in documentation, not commit history.
- Keep the body factual and concise. Bullet points listing changed files/behaviors are fine.
- No marketing language in commit messages.

## Good Example
```
feat(extension): add interactive onboarding tour for free users

- Adds a guided spotlight overlay that demonstrates cloud upload on first launch
- Tour is skippable and shown once per session
- Upgrade modal links to pricing page with source tracking
```

## Bad Example (do not do this)
```
feat(demo): add modular interactive demo tour overlay for new extension users

Zero-backend-cost, fully isolated demo system for new free users.
- demoVariants.js: Central config. Switch between variants by changing ACTIVE_VARIANT_ID. Zero core code changes needed.
- edit.html: 4 lines added at the bottom. Comment out initDemoTour() to completely disable. Core edit.js is completely unchanged.
```
