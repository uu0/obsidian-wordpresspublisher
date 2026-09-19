# WordPress Publisher 2.1.4

Version 2.1.4 fixes local image preview and publishing for both Obsidian embeds and standard Markdown images.

## Image publishing

- Obsidian embeds such as `![[Pasted image 20260918204445.png]]` are replaced completely after upload.
- Published WordPress content no longer contains leftover filename fragments such as `sted image ...png]]`.
- Obsidian embeds and following Markdown links are discovered independently, preventing overlapping replacements.
- Standard Markdown images use the same corrected replacement boundaries.

## Preview

- Local Vault image paths are resolved to Obsidian resource URLs before the preview is displayed.
- Remote HTTP, data, blob and existing Obsidian resource URLs remain unchanged.

## Validation

- 23 test suites and 240 tests pass.
- Strict TypeScript checking passes.
- The production plugin bundle builds successfully.

## Compatibility

- Minimum Obsidian version: 1.1.1.
- Existing posts containing malformed filename fragments must be published again or edited manually; installing the update does not rewrite existing WordPress content.
