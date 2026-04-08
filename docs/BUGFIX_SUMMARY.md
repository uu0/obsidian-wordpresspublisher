# Bug Fix: Featured Image Inconsistency

## Problem
When `featuredImageId` and `featurePicture` in frontmatter become inconsistent (e.g., user manually edits one field), it causes:
- Preview shows wrong or no image
- Published post may have different featured image than expected
- No validation or warning to alert users

## Root Cause
The plugin treats these two fields independently:
- `featuredImageId`: Used for publishing (sent to WordPress API)
- `featurePicture`: Used for preview display (shows thumbnail)

When they become inconsistent (e.g., user manually edits frontmatter), there was no validation or automatic synchronization.

## Solution

### 1. Enhanced Remote Data Fetching
**File**: `abstract-wp-client.ts`, `wp-rest-client.ts`, `frontmatter-manager.ts`

- Modified `getPost()` to include `_embed` parameter to fetch featured media info
- Updated `RemotePostData` interface to include `featurePicture` field
- Now fetches both `featuredImageId` and `featurePicture` URL from WordPress when loading remote post data

### 2. Added Media URL Fetching Method
**Files**: `abstract-wp-client.ts`, `wp-rest-client.ts`, `wp-xml-rpc-client.ts`

- Added `getMediaUrl()` abstract method to `AbstractWordPressClient`
- Implemented in both REST and XML-RPC clients
- Allows fetching media URL by ID for synchronization

### 3. Automatic Synchronization on Publish
**File**: `abstract-wp-client.ts` (in `tryToPublish` method)

- Before updating frontmatter after successful publish, checks if `featuredImageId` exists but `featurePicture` is missing
- Automatically fetches the media URL from WordPress and syncs it to frontmatter
- Only syncs when no custom `updateMatterData` callback is provided (which handles new uploads)

### 4. Preview Warning
**Files**: `wp-publish-modal-v2.ts`, `i18n/en.json`, `i18n/zh-cn.json`, `styles.css`

- Added inconsistency detection in preview tab
- Shows warning banner when `featuredImageId` exists but `featurePicture` is empty
- Informs user that preview may be inaccurate and will be synced on publish
- Added styled warning component with proper i18n support

## Changes Summary

### Modified Files
1. `src/abstract-wp-client.ts`
   - Added `getMediaUrl()` abstract method
   - Enhanced `fetchRemotePostData()` to include `featurePicture`
   - Added auto-sync logic in `tryToPublish()`

2. `src/wp-rest-client.ts`
   - Modified `getPost()` to include `_embed` parameter
   - Implemented `getMediaUrl()` method

3. `src/wp-xml-rpc-client.ts`
   - Implemented `getMediaUrl()` method using `wp.getMediaItem`

4. `src/frontmatter-manager.ts`
   - Added `featurePicture` field to `RemotePostData` interface

5. `src/wp-publish-modal-v2.ts`
   - Added inconsistency detection in `renderPreviewContent()`
   - Shows warning banner when inconsistency detected

6. `src/i18n/en.json` & `src/i18n/zh-cn.json`
   - Added warning messages:
     - `publishModal_previewInconsistencyWarning`
     - `publishModal_previewInconsistencyDesc`

7. `styles.css`
   - Added `.wp-preview-warning` styles
   - Added `.wp-preview-warning-desc` styles

## Testing Scenarios

### Scenario 1: User manually sets invalid `featuredImageId`
**Before**: Preview shows old image, publish may fail silently or use wrong image
**After**: Warning shown in preview, auto-syncs correct URL on publish

### Scenario 2: User deletes `featurePicture` but keeps `featuredImageId`
**Before**: Preview shows no image, but publish uses the ID (confusing)
**After**: Warning shown, auto-syncs URL on publish

### Scenario 3: User manually edits `featurePicture` to wrong URL
**Before**: Preview shows wrong image, publish uses correct ID (misleading)
**After**: Warning shown if ID exists but URL is empty

### Scenario 4: Normal workflow (upload new image)
**Before**: Works correctly
**After**: Still works correctly, no changes to normal flow

## Benefits
1. **User Experience**: Clear warnings when inconsistency detected
2. **Data Integrity**: Automatic synchronization prevents drift
3. **Reliability**: Fetches authoritative data from WordPress
4. **Backward Compatible**: Doesn't break existing workflows
5. **Proactive**: Syncs on every publish, keeping data fresh

## Notes
- Synchronization only happens when `featuredImageId` exists but `featurePicture` is missing
- Does not interfere with new image uploads (handled by `updateMatterData` callback)
- Uses WordPress REST API `_embed` parameter for efficient data fetching
- XML-RPC implementation uses `wp.getMediaItem` method
