import type { ReactNode } from "react";

export function RoutePlaceholder({
	title,
	description,
	children,
}: {
	title: string;
	description: string;
	children?: ReactNode;
}) {
	return (
		<main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
			<p className="mt-2 max-w-2xl text-sm text-muted-foreground">
				{description}
			</p>
			{children}
		</main>
	);
}
