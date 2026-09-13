# badge

2026-09-13, golden pair via merge, migrated the customized polymorphic badge wrapper to Base UI's render utilities.

## Changed

- `src/components/ui/badge.tsx:1` replaces Radix Slot with Base UI `useRender` and `mergeProps` while retaining all Bearbet badge variants.
- The public polymorphic prop changed from `asChild` to Base UI's `render` prop. No current consumer needed an update.
- Leftover scan passed: `grep -n "radix-ui\|@radix-ui" src/components/ui/badge.tsx` returned no matches.

## Left alone

- Existing badge consumers were left unchanged because they render the default `<span>`.

## Behavior changes

The polymorphic API is now `render={<Element />}` instead of `asChild`.

## Verify by hand

- Check the currency and Virtual funds badges on the wallet page.
- Tab to any badge rendered as a link in future and confirm focus styles follow the rendered element.
