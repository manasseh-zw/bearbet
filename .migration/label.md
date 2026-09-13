# label

2026-09-13, golden pair via merge, migrated the customized label wrapper to a native label while retaining its Bearbet classes.

## Changed

- `src/components/ui/label.tsx:6` now renders a native `<label>`, since Base UI has no label component, and keeps the existing class list and public `Label` API.
- Leftover scan passed: `grep -n "radix-ui\|@radix-ui" src/components/ui/label.tsx` returned no matches.

## Left alone

- Auth form consumers were left unchanged because they use the wrapper's stable `htmlFor` and native label props.

## Behavior changes

The wrapper no longer gets Radix Label's double-click text-selection prevention. Its existing `select-none` class preserves that behavior.

## Verify by hand

- Click each login and registration label and confirm focus moves to its input.
- Double-click a label and confirm the text is not selected.
