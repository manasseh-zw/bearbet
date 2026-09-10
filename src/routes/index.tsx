import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "#/components/brand";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	return (
		<main className="grid min-h-svh place-items-center bg-[#181817] px-6 text-[#f7f2e8]">
			<Logo className="text-7xl sm:text-8xl" />
		</main>
	);
}
