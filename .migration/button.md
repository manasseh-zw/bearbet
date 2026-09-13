# Button

2026-09-13, engine consumer sweep, link semantics corrected after the Base UI migration.

## Changed

- `src/components/casino/guest/guest-lobby.tsx`: replaced a Button-rendered registration link with a TanStack Link styled by `buttonVariants`.
- `src/components/wallet/wallet-page.tsx`: replaced a Button-rendered history link with a TanStack Link styled by `buttonVariants`.
- The leftover scan found no `radix-ui` or `@radix-ui` references in these files.

## Left alone

- `src/components/ui/button.tsx`: the shared Base UI Button wrapper already matches the shadcn registry pattern.
- Link-backed sidebar menu items use the sidebar wrapper rather than the Base UI Button component, so they do not trigger this warning.

## Behavior changes

Links now retain native link semantics while keeping the same button appearance.

## Verify by hand

- Open the guest lobby and follow "Register now" with a mouse and keyboard.
- Sign in, open the wallet, and follow "View all" with a mouse and keyboard.
- Confirm neither page logs the Base UI native-button warning.
