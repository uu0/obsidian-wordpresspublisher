## 2.1.3-beta.4

- Acknowledge ribbon and command launches while WordPress authentication and metadata are loading.
- Report missing notes and client setup failures instead of leaving ribbon clicks without feedback.
- Fix REST Basic authentication for Unicode usernames and pasted WordPress application passwords containing display spaces.
- Preserve actionable WordPress authentication errors and add a guarded connecting state to the login dialog.
- Clarify that core REST authentication requires an Application Password rather than the normal website password.
- Validation: 23 suites, 236 tests, strict typecheck and production build passed locally.

## 2.1.3-beta.3

- Reorganize the publishing dialog around the source note, destination site and primary publish action.
- Add stage-by-stage progress for content preparation, media upload, WordPress submission and local writeback.
- Keep failures visible, explain uncertain remote results and block unsafe direct retries.
- Improve small-screen layout, touch targets, collapsible settings and reduced-motion behavior.
- Validation: 22 suites, 230 tests, strict typecheck and production build passed locally.

## 2.1.3-beta.2

- Bind publishes to source notes; preserve concurrent edits and recover confirmed remote results.
- Fix REST page routing, publish sanitization, async success feedback, media failures and credential persistence.
- Add upload receipts, explicit uncertain-result reconciliation and dev CI.
- Validation: 22 suites, 228 tests, strict typecheck and production build passed locally.
- See docs/beta-release-notes-2.1.3-beta.2.md for compatibility and remaining live-validation boundaries.

# Changelog


## [2.1.3-beta.1] - 2026-08-07

- _test build_ — internal refactor / changes under test.
