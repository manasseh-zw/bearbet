# separator

2026-09-13, golden pair via merge, migrated the customized separator wrapper to Base UI.

## Changed

- `src/components/ui/separator.tsx:3` now imports the callable Base UI separator and retains Bearbet's horizontal and vertical classes.
- The Radix-only `decorative` prop was removed. No consumer passed it.
- Leftover scan passed: `grep -n "radix-ui\|@radix-ui" src/components/ui/separator.tsx` returned no matches.

## Left alone

- Sidebar and layout consumers were left unchanged because they only pass shared DOM and orientation props.

## Behavior changes

Base UI always renders a semantic separator with `role="separator"`. The old wrapper defaulted to Radix's decorative mode.

## Verify by hand

- Check horizontal dividers in the app shell and wallet page.
- Collapse and expand the sidebar and confirm its divider dimensions remain correct.
