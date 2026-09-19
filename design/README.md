# DevTask design references

This directory contains visual references used to guide the DevTask mobile experience. The images are source-of-truth references for layout direction and interaction intent, not generated screenshots of every current implementation state.

| Reference | Product area | Implementation relationship |
| --- | --- | --- |
| `auth-screen-ref.png` | Sign-in and sign-up | Compare with `src/app/sign-in.tsx`, `src/app/sign-up.tsx`, and the shared theme values. |
| `splash-to-yourset-ref.png` | Splash, welcome, and onboarding transition | Compare with `src/app/welcome.tsx` and `src/app/onboarding.tsx`. |
| `add-project-to-emptystates-ref.png` | Project creation and empty states | Compare with `src/app/add-project.tsx`, `src/app/projects.tsx`, and `src/app/empty-states.tsx`. |
| `design-system-ref.png` | Typography, colors, spacing, controls, and cards | Compare with `src/constants/theme.ts`, `src/global.css`, and `src/components/`. |
| `full-system-design-ref.png` | End-to-end product flow and screen relationships | Use as the broad product map when adding or reviewing routes. |

## How to use the references

When implementing a screen, first identify the matching reference and the nearest existing shared component. Reuse the design tokens instead of introducing screen-specific colors or spacing. Preserve the empty, loading, error, and authenticated states even when a reference shows only the ideal state.

The reference images should be reviewed alongside [`docs/DESIGN_SYSTEM.md`](../docs/DESIGN_SYSTEM.md) and the implementation contract in [`docs/DEVTASK_IMPLEMENTATION_BASELINE.md`](../docs/DEVTASK_IMPLEMENTATION_BASELINE.md). If a new screen materially changes navigation or the product flow, update this index and the architecture documentation in the same pull request.
