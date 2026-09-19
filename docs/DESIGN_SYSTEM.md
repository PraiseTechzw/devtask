# DevTask design system

Use this document with `design/full-system-design-ref.png` and `design/design-system-ref.png`. The source of truth for implementation tokens is `src/constants/theme.ts`; reusable native primitives live in `src/components/ui/devtask-ui.tsx`.

## Visual language

- Dark-first: deep navy backgrounds, layered blue-black surfaces, cyan/electric-blue actions, hairline blue-gray borders, and restrained blue glows.
- Calm and focused: one dominant call to action per screen, generous vertical rhythm, cards with 14–18px radii, and no dense enterprise tables.
- Health semantics: active = green, slowing = amber, stalled = orange, dying = red, completed = cyan. Never convey health with color alone—include the label/status badge.

## Typography

Inter is bundled at 400, 500, 600, 700, and 800 and is loaded at the root before app content renders. Use the `Typography` tokens rather than `fontWeight` strings:

- Display 38px; H1 32px; H2 24px; H3 20px; H4 18px.
- Body 16px; caption 14px; small 12px.
- Use `Typography.metric` and the platform mono family for percentages, dates, counts, time estimates, and developer data.

## Component contract

Use the shared primitives rather than introducing equivalent screen-local controls:

- `AppButton`: primary, secondary, or ghost action.
- `Surface`: card/container treatment.
- `FormField`: labelled single-line input treatment.
- `ProgressBar`: bounded 0–100 progress with screen-reader value.
- `StatusBadge`: the five product-health states.
- `IconTile`: square icon/navigation action.
- `EmptyState`: illustration/icon, copy, and optional action.
- `OnboardingPagination`: 3-step onboarding indicator after the welcome screen.
- `SegmentedControl`, `Toggle`, `CheckControl`: filters/settings/form controls.
- `MetricCard`, `ListRow`: dashboard and project-list building blocks.

All controls already include the appropriate React Native accessibility role/state. New components must do the same.
