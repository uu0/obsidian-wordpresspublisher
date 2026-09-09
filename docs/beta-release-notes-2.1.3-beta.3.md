# WordPress Publisher 2.1.3-beta.3

This beta refines the publishing dialog and its feedback during long uploads.

## What changed

- The header now identifies the current note, destination profile and content type.
- The footer separates editing and saving controls from the primary publish action and repeats the destination before submission.
- Publishing reports four explicit stages: content preparation, media upload, WordPress submission and local writeback. Media progress includes the current item and count when available.
- Errors stay on screen until dismissed. When the server result is uncertain, the dialog explains the recovery path and removes direct retry to reduce duplicate posts.
- Small screens use a clearer single-column flow, compact collapsible settings, larger touch targets and bottom-sheet progress/error panels.
- Decorative completion animation is shorter and lighter, and is disabled when reduced motion is requested.

## Compatibility

- Obsidian minimum version remains 1.1.1.
- Existing profiles, frontmatter and WordPress REST/XML-RPC behavior remain compatible.
- The progress reporter is internal and optional, so existing publishing paths still work without it.

## Validation

- TypeScript typecheck
- Production build
- Full Jest suite, including mobile settings and publishing lifecycle coverage

Live validation against the user's WordPress server is still recommended before promoting this beta to a stable release.
