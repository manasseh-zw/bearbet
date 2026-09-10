import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_guest")({
	component: GuestLayout,
});

function GuestLayout() {
	return (
		<main className="flex min-h-svh items-center justify-center bg-background p-4 sm:p-6">
			<Outlet />
		</main>
	);
}
