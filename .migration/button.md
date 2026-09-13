# button

2026-09-13, golden pair via merge, migrated the customized button wrapper to Base UI and retained Bearbet variants and data attributes.

## Changed

- `src/components/ui/button.tsx:1` now uses `@base-ui/react/button` and exposes Base UI's `render` prop in place of Radix `asChild`.
- `src/components/casino/guest/guest-lobby.tsx` now renders the registration link through the button's `render` prop.
- `src/components/wallet/wallet-page.tsx` now renders the transaction-history link through the button's `render` prop.
- Leftover scan passed: `grep -n "radix-ui\|@radix-ui"` returned no matches in these files.

## Left alone

- Buttons that render as native buttons were left unchanged because their props and behavior carry across.

## Behavior changes

The polymorphic API is now `render={<Element />}` instead of `asChild`. Native button behavior is unchanged.

## Verify by hand

- Open the guest lobby and follow the Register now link.
- Open the wallet and follow the View all link.
- Submit each authentication form with the keyboard and confirm its button still works.
