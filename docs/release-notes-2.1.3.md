# WordPress Publisher 2.1.3

Version 2.1.3 makes publishing safer during network failures and clearer during long uploads, while preserving the existing article and page workflow.

## Publishing reliability

- Every publish remains bound to the note that opened the publishing dialog.
- Concurrent local edits are detected and preserved.
- A confirmed WordPress result can be written back locally without sending the post again.
- An uncertain server result blocks blind retry and provides an explicit reconciliation command.
- Media uploads use receipts so completed uploads can be reused safely.

## Interface and mobile experience

- The dialog identifies the source note, destination site and content type before submission.
- Preparation, media upload, WordPress submission and local writeback have distinct progress stages.
- Failures remain visible until the user acts; uncertain results do not offer unsafe direct retry.
- Small screens use a single-column flow, collapsible settings, larger touch targets and a clearer primary action.
- Animation is shorter and respects the operating system's reduced-motion preference.

## Authentication and security

- Ribbon and command launches acknowledge the action while authentication and site metadata load.
- REST Basic authentication supports Unicode usernames and WordPress Application Passwords pasted with display spaces.
- WordPress authentication and permission errors are preserved instead of being reduced to a generic password error.
- Passwords, OAuth tokens and configured API keys are encrypted before storage.
- Published and previewed HTML is sanitized.
- REST requests require HTTPS except for localhost development.

## Compatibility

- Minimum Obsidian version: 1.1.1.
- Posts and pages are supported through the WordPress REST API.
- WordPress core REST authentication requires an Application Password created under **Users → Profile → Application Passwords**.
- XML-RPC and configured authentication extensions retain their existing password behavior.

## Validation

- 23 test suites and 236 tests pass.
- Strict TypeScript checking passes.
- The production plugin bundle builds successfully.
