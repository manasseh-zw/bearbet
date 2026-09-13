# switch

2026-09-13, golden pair via merge, migrated the customized switch wrapper to Base UI while preserving Bearbet sizing and state classes.

## Changed

- `src/components/ui/switch.tsx:3` now uses `@base-ui/react/switch` and Base UI's typed root props.
- Existing `data-checked`, `data-unchecked`, and `data-disabled` classes already matched Base UI and remain unchanged.
- Leftover scan passed: `grep -n "radix-ui\|@radix-ui" src/components/ui/switch.tsx` returned no matches.

## Left alone

- No product component currently consumes the switch wrapper, so no call site needed changes.

## Behavior changes

Base UI renders the switch root as a span with a hidden input instead of a button. The wrapper's keyboard and form behavior now comes from that input.

## Verify by hand

- Toggle both switch sizes with pointer and Space.
- Confirm checked, unchecked, focus, disabled, and invalid styles.
- Submit a form containing a named switch and check the submitted value.
