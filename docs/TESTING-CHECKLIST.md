# WordPress Publisher V2 Testing Checklist

## Pre-Testing Setup

- [ ] Plugin installed and enabled
- [ ] WordPress site configured in settings
- [ ] API credentials verified
- [ ] Test note prepared with content
- [ ] Network connectivity confirmed

## Phase 1: Core Architecture

### Tab System
- [ ] Modal opens successfully
- [ ] Settings tab displays correctly
- [ ] Preview tab displays correctly
- [ ] AI Assistant tab displays correctly
- [ ] Tab switching works smoothly
- [ ] Tab state persists during session
- [ ] Active tab indicator shows correctly

### State Management
- [ ] Form values persist when switching tabs
- [ ] Generated content persists across tabs
- [ ] Image selection persists
- [ ] Edit mode state maintained
- [ ] Modal remembers last used settings

## Phase 2: AI Features

### Featured Image Generation

#### AI Generation
- [ ] "Generate with AI" button visible
- [ ] Click triggers generation
- [ ] Loading indicator shows
- [ ] Generated image displays
- [ ] Image can be regenerated
- [ ] Error handling works (invalid API key)
- [ ] Generated image cached

#### Unsplash Integration
- [ ] Search input appears
- [ ] Search returns results
- [ ] Results display as grid
- [ ] Click selects image
- [ ] Selected image shows in preview
- [ ] Attribution displayed
- [ ] Search handles no results
- [ ] Selected image cached

#### Vault Browser
- [ ] "Browse Vault" button works
- [ ] Image list displays
- [ ] Images from vault shown
- [ ] Click selects image
- [ ] Selected image previews
- [ ] Handles vault with no images
- [ ] Selected image cached

#### Local Upload
- [ ] Upload button visible
- [ ] File picker opens
- [ ] Selected file uploads
- [ ] Preview shows uploaded image
- [ ] Handles invalid file types
- [ ] Handles large files

### Excerpt Generation
- [ ] "Generate Excerpt" button visible
- [ ] Click triggers generation
- [ ] Loading indicator shows
- [ ] Generated excerpt displays
- [ ] Excerpt can be edited
- [ ] Excerpt can be regenerated
- [ ] Error handling works
- [ ] Generated excerpt cached

### Tag Suggestions
- [ ] "Generate Tags" button visible
- [ ] Click triggers generation
- [ ] Loading indicator shows
- [ ] Suggested tags display
- [ ] Tags can be added individually
- [ ] Tags can be edited
- [ ] Tags can be removed
- [ ] Duplicate tags prevented
- [ ] Generated tags cached

## Phase 3: Preview & Editing

### Preview Display
- [ ] Preview tab shows content
- [ ] HTML renders correctly
- [ ] Images display properly
- [ ] Links work correctly
- [ ] Code blocks formatted
- [ ] Lists render properly
- [ ] Tables display correctly

### Inline Editing
- [ ] "Edit" button visible
- [ ] Click enables edit mode
- [ ] Content becomes editable
- [ ] Changes can be made
- [ ] "Save" button appears
- [ ] Save updates preview
- [ ] "Cancel" discards changes
- [ ] Edit mode indicator shows

### Tag Editing
- [ ] Tags display in preview
- [ ] Click tag to edit
- [ ] Edit inline works
- [ ] Enter saves changes
- [ ] Escape cancels edit
- [ ] Delete button removes tag
- [ ] Add new tag works
- [ ] Tag validation works

## Phase 4: Image Management

### Cache System
- [ ] First generation caches image
- [ ] Reopen modal loads cached image
- [ ] Cache indicator shows
- [ ] "Use Cached" option available
- [ ] "Generate New" clears cache
- [ ] Cache persists across sessions
- [ ] Cache clears on demand

### Image Sources
- [ ] Source indicator shows correctly
- [ ] "AI" badge for AI-generated
- [ ] "Unsplash" badge for Unsplash
- [ ] "Vault" badge for vault images
- [ ] "Cached" badge for cached images
- [ ] Source tracked correctly

### Image Upload to WordPress
- [ ] Image uploads to media library
- [ ] Media ID returned
- [ ] Featured image set correctly
- [ ] Handles upload failures
- [ ] Progress indicator shows
- [ ] Duplicate detection works

## Phase 5: Visual & Interaction

### Button Effects
- [ ] Ripple effect on click
- [ ] Hover state shows
- [ ] Active state shows
- [ ] Disabled state shows
- [ ] Loading state shows
- [ ] Transitions smooth

### Input Focus
- [ ] Focus ring appears
- [ ] Focus animation plays
- [ ] Blur removes focus state
- [ ] Tab navigation works
- [ ] Focus visible for keyboard users

### Tag Interactions
- [ ] Hover lifts tag
- [ ] Click selects tag
- [ ] Delete button rotates on hover
- [ ] Add animation plays
- [ ] Remove animation plays
- [ ] Transitions smooth

### Card Effects
- [ ] Hover elevates card
- [ ] Shadow increases
- [ ] Transition smooth
- [ ] Click feedback shows

### Loading States
- [ ] Skeleton screens show
- [ ] Pulse animation plays
- [ ] Spinner shows for actions
- [ ] Progress bars update
- [ ] Loading text displays

### Messages & Tooltips
- [ ] Success messages slide in
- [ ] Error messages slide in
- [ ] Messages auto-dismiss
- [ ] Tooltips show on hover
- [ ] Tooltips position correctly
- [ ] Tooltips hide on leave

## Phase 6: Publishing

### Publish Flow
- [ ] "Publish" button enabled when ready
- [ ] Click triggers publish
- [ ] Loading indicator shows
- [ ] Progress updates display
- [ ] Success message shows
- [ ] Post URL provided
- [ ] Modal closes on success

### Error Handling
- [ ] Network errors caught
- [ ] API errors displayed
- [ ] Validation errors shown
- [ ] User can retry
- [ ] Error details provided
- [ ] Modal stays open on error

### Post Update
- [ ] Existing post detected
- [ ] Update option shown
- [ ] Update preserves content
- [ ] Update preserves metadata
- [ ] Update success confirmed

## Cross-Browser Testing

### Chrome/Edge
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors
- [ ] Performance good

### Firefox
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors
- [ ] Performance good

### Safari
- [ ] All features work
- [ ] Animations smooth
- [ ] No console errors
- [ ] Performance good

## Accessibility

### Keyboard Navigation
- [ ] Tab order logical
- [ ] All interactive elements reachable
- [ ] Enter/Space activate buttons
- [ ] Escape closes modal
- [ ] Arrow keys navigate where appropriate

### Screen Reader
- [ ] Modal announced
- [ ] Tabs announced
- [ ] Buttons have labels
- [ ] Images have alt text
- [ ] Errors announced
- [ ] Success announced

### Visual
- [ ] Sufficient color contrast
- [ ] Focus indicators visible
- [ ] Text readable
- [ ] Icons clear
- [ ] Animations not distracting

## Performance

### Load Time
- [ ] Modal opens quickly (<500ms)
- [ ] Tab switches instant
- [ ] Images load progressively
- [ ] No blocking operations

### Memory
- [ ] No memory leaks
- [ ] Cache size reasonable
- [ ] Images optimized
- [ ] DOM updates efficient

### Network
- [ ] API calls minimized
- [ ] Images cached
- [ ] Requests batched where possible
- [ ] Offline handling graceful

## Edge Cases

### Empty States
- [ ] No content handles gracefully
- [ ] No images shows placeholder
- [ ] No tags shows empty state
- [ ] No cache shows generate option

### Long Content
- [ ] Long titles truncate
- [ ] Long excerpts scroll
- [ ] Many tags wrap correctly
- [ ] Large images scale

### Special Characters
- [ ] Unicode in title works
- [ ] Emoji in content works
- [ ] HTML entities handled
- [ ] Special chars in tags work

### Network Issues
- [ ] Offline mode detected
- [ ] Timeout handled
- [ ] Retry mechanism works
- [ ] Error messages clear

## Regression Testing

### Legacy Features
- [ ] Basic publishing still works
- [ ] Manual image upload works
- [ ] Custom fields work
- [ ] Categories work
- [ ] Tags work
- [ ] Status settings work
- [ ] Visibility settings work

### Settings
- [ ] All settings respected
- [ ] Prompt templates work
- [ ] API keys validated
- [ ] Defaults applied correctly

## Final Checks

- [ ] No console errors
- [ ] No console warnings
- [ ] Build succeeds
- [ ] TypeScript compiles
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped

## Sign-Off

- [ ] Developer tested
- [ ] Code reviewed
- [ ] QA approved
- [ ] Documentation reviewed
- [ ] Ready for release

---

**Testing Date**: ___________
**Tester**: ___________
**Version**: 1.3.0
**Build**: ___________

**Notes**:
