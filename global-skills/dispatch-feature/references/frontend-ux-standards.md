# Frontend UX Standards

This document is injected into every frontend teammate's prompt.
It defines the minimum expected UX quality level.

## The 4 mandatory states

Every component that displays data MUST implement:

### Loading state
- Skeleton loader that mimics the shape of the expected content
- No generic full-screen spinner — the skeleton gives a preview of the structure
- The skeleton is animated (pulse) to indicate activity
- Max duration before timeout: configurable, default 10s → switches to error state

### Empty state
- Contextual illustration or icon (not a text message alone)
- Clear message explaining why it's empty
- Call-to-action to create the first item or modify filters
- Example: "No budgets defined. Create your first budget to start tracking."

### Error state
- User-friendly error message (not the technical message)
- "Retry" button that retries the action
- If the error persists, show a secondary message with a support link
- Network errors and server errors have different messages

### Success state
- Content displays with a smooth transition from the skeleton
- If it's an action (create, update), feedback via toast/notification
- The success state is the only one that doesn't require an additional UI element

## Responsive

- **Mobile first**: build the mobile version first
- Quasar breakpoints: `$breakpoint-xs` (0-599), `$breakpoint-sm` (600-1023),
  `$breakpoint-md` (1024-1439), `$breakpoint-lg` (1440+)
- Data tables on mobile: switch to card/list view, no horizontal scroll
- Forms on mobile: stacked fields, appropriate native keyboard (inputmode)
- Primary actions: accessible with the thumb (bottom zone of the screen)

## Interactions

- **Debounce** on search/filter inputs: 300ms
- **Optimistic updates** for quick actions (toggle, delete)
  with rollback on API error
- **Confirmation** for destructive actions (delete, reset)
  via Quasar dialog, not window.confirm()
- **Transitions** between states: fade 150ms by default
- **Disabled state** clear on buttons during processing (no double submit)

## Accessibility (minimum)

- All interactive elements have a descriptive `aria-label`
- Keyboard navigation functional (logical tab order, visible focus)
- Minimum contrast WCAG AA (4.5:1 text, 3:1 large text)
- Icons without text have an `aria-label` or a tooltip
- Forms have associated labels (no placeholder as the only label)

## Forms

- Inline validation on blur (not only on submit)
- Error messages below the relevant field, in red, with icon
- Submit button disabled while the form is invalid
- Auto-focus on the first field when opened
- Preserve entered data on server error

## Design system

- Use native Quasar components first (QTable, QForm, QDialog...)
- Do not reinvent a component that exists in Quasar
- Colors, spacing, and typography follow the project's Quasar theme
- Icons come from a single set (Material Icons or the configured one)
