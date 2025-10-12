# 5 Less Obvious Blockers for Mobile Keyboard

## 1. ⚠️ MobileViewportLock Overwrites Viewport Meta
**Location:** `src/features/chat/MobileViewportLock.tsx` line 21-23

**Issue:**
```typescript
viewportMeta.setAttribute('content', 
  'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
);
```
- Removes `interactive-widget=overlays-content` when it runs
- Currently `active={false}` but still a risk
- If ever activated, completely breaks keyboard handling

**Fix:** Update to preserve `interactive-widget=overlays-content`

---

## 2. ⚠️ Inconsistent Mobile Breakpoints
**Locations:**
- `useKeyboardAwareInput`: checks `window.innerWidth > 768`
- `useIsMobile` hook: uses `640px` breakpoint
- CSS: `@media screen and (max-width: 768px)`

**Issue:**
- Device at 700px width:
  - CSS thinks it's mobile → applies fixed positioning
  - Hook thinks it's desktop → doesn't attach ref or listen
  - Transform never applies!

**Fix:** Use consistent breakpoint everywhere (640px or 768px)

---

## 3. ⚠️ Static Width Check at Mount
**Location:** `useKeyboardAwareInput.ts` line 12

```typescript
if (typeof window === 'undefined' || window.innerWidth > 768) return;
```

**Issue:**
- Check happens ONCE at component mount
- If window resizes (orientation change, browser resize), hook never re-initializes
- Hook early-returns and never sets up listeners

**Fix:** Use `useIsMobile()` hook or media query listener

---

## 4. ⚠️ pb-safe Class on Input Container
**Location:** `ChatBox.tsx` line 192

```tsx
className="pb-safe mobile-input-area mobile-input-container"
```

**Issue:**
- `pb-safe` adds `padding-bottom: env(safe-area-inset-bottom)`
- On some devices, this could be 20-40px
- Combined with `bottom: 0`, input might already be elevated
- Transform might be applying from wrong baseline

**Fix:** Remove `pb-safe` from input container (already fixed at bottom)

---

## 5. ⚠️ CSS Specificity Battle
**Location:** `src/index.css` line 284-293

**Mobile Form Protector CSS:**
```css
.mobile-form-protector .mobile-footer-fixed {
  position: fixed !important;
  bottom: 0 !important;
  z-index: 50 !important;
  padding-bottom: env(safe-area-inset-bottom, 0px) !important;
}
```

**Issue:**
- If any parent has `mobile-form-protector` class:
  - Looks for `.mobile-footer-fixed` child
  - Applies competing z-index (50 vs our 40)
  - Applies padding-bottom that might interfere
- Different positioning rules than our `.mobile-input-container`

**Fix:** Check if any parent containers have `mobile-form-protector` class

---

## Debugging Steps

1. **Console log in hook to verify it runs:**
   ```typescript
   console.log('[useKeyboardAwareInput] Hook initialized on mobile');
   ```

2. **Check if --kb var is updating:**
   ```typescript
   console.log('[useKeyboardAwareInput] --kb value:', kbHeight);
   ```

3. **Verify ref is attached:**
   ```typescript
   console.log('[useKeyboardAwareInput] Container ref:', container);
   ```

4. **Check computed styles in browser:**
   - Inspect input container element
   - Look at computed `position`, `bottom`, `transform`
   - See if any rules are being overridden

5. **Test viewport meta isn't being changed:**
   - Check meta tag in DOM after page load
   - Verify it still has `interactive-widget=overlays-content`

