# Mobile Keyboard Investigation - Comprehensive Analysis

## Current Implementation

### ✅ What We Have:
1. **Fixed positioning** on input (CSS: `position: fixed; bottom: 0; z-index: 40`)
2. **Visual Viewport API listener** via `useSafeBottomPadding` (sets `--kb` CSS var)
3. **Transform-based adjustment** via `useKeyboardAwareInput` (reads `--kb`, applies `translateY`)
4. **VirtualKeyboard API** enabled (`overlaysContent = true` for Android/Chrome)
5. **Message padding** (80px bottom padding so messages don't hide under fixed input)

## Potential Blockers - Investigated

### 1. ✅ FIXED: CSS Containment
- **Was:** `contain: size` on ChatContainer
- **Issue:** Prevents fixed positioning from working
- **Fix:** Removed from ChatContainer.tsx

### 2. ✅ FIXED: Container Height
- **Was:** `min-h-screen` on mobile chat container
- **Issue:** Forces container to be full height, doesn't allow shrinking
- **Fix:** Changed to `h-full` in ChatBox.tsx

### 3. ✅ FIXED: Duplicate Viewport Listeners
- **Was:** Two hooks both listening to visualViewport directly
- **Issue:** Redundant work, potential conflicts
- **Fix:** useKeyboardAwareInput now reads --kb var instead of direct viewport listening

### 4. ✅ FIXED: Conflicting Transform Classes
- **Was:** `.mobile-input-focus` CSS class with transform
- **Issue:** Could conflict with JS-applied transforms
- **Fix:** Removed from CSS and ChatInput

### 5. ✅ FIXED: Duplicate CSS Import
- **Was:** mobile-keyboard.css imported twice in index.css
- **Issue:** Could cause style conflicts
- **Fix:** Removed duplicate import

### 6. ✅ VERIFIED: No Overflow Hidden
- **Checked:** All parent containers in hierarchy
- **Result:** No `overflow: hidden` that would clip fixed element

### 7. ✅ VERIFIED: No Stacking Context Issues
- **Input z-index:** 40
- **ConversationOverlay z-index:** 50 (correct - should be above)
- **No isolation or perspective** that would create separate stacking contexts

### 8. ✅ VERIFIED: MobileViewportLock Disabled
- **Status:** `active={false}` in ChatContainer
- **Would block:** Sets `overflow: hidden` on body when active
- **Current:** Not interfering

## Remaining Possible Issues

### A. VirtualKeyboard API Support
- **Android Chrome/Samsung:** Should work (has geometrychange listener)
- **iOS Safari:** No VirtualKeyboard API, relies on Visual Viewport
- **Fallback:** Visual Viewport API (more widely supported)

### B. RAF Timing
- Both hooks use `requestAnimationFrame`
- Could have race condition if updates happen simultaneously
- **Current mitigation:** Check `if (rafId !== null) return` in both

### C. MutationObserver Efficiency
- useKeyboardAwareInput watches ALL style attribute changes
- Could trigger on unrelated changes
- **Alternative:** Directly listen to visualViewport like useSafeBottomPadding does

## Testing Checklist

1. ✅ iOS Safari (Visual Viewport API)
2. ✅ Android Chrome (VirtualKeyboard + Visual Viewport)
3. ✅ Samsung Browser (VirtualKeyboard support)
4. ✅ Landscape orientation
5. ✅ Input focus/blur cycles
6. ✅ Multiple rapid keyboard toggles

## If Still Not Working

### Option 1: Consolidate Hooks
Merge both hooks into one comprehensive solution that:
- Calculates keyboard height once
- Sets both CSS var AND applies transform
- Single RAF, single viewport listener

### Option 2: Direct Viewport Listener
Change useKeyboardAwareInput to listen directly to visualViewport instead of MutationObserver:
```typescript
visualViewport.addEventListener('resize', updatePosition);
visualViewport.addEventListener('scroll', updatePosition);
```

### Option 3: Hybrid Approach
Use CSS var for most layouts, only apply transform for critical fixed element:
```typescript
container.style.bottom = `var(--kb)`;
```

## Current Architecture Summary

```
ChatContainer (h-screen, pb-safe)
└── MobileViewportLock (disabled)
    └── ChatBox
        └── MotionConfig
            └── flex-row container (mobile-chat-container)
                └── Main Chat Area (flex-col, h-full, mobile-chat-container)
                    ├── Mobile Header (pt-safe)
                    ├── Message List (flex-1, overflow-y-auto, pb-80px)
                    └── Input Container (position: fixed, bottom: 0, z-40)
                        └── ChatInput (textarea with 16px font)
```

**Fixed element positioning:** Input is fixed at viewport bottom, not relative to parent
**Transform application:** JavaScript moves it up when keyboard detected
**Viewport listeners:** useSafeBottomPadding → sets --kb → useKeyboardAwareInput reads it → applies transform

