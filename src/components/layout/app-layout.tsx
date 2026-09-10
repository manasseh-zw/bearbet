import type { PropsWithChildren } from "react";
import { Logo } from "#/components/brand";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "#/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

export function AppLayout({ children }: PropsWithChildren) {
	return (
		<SidebarProvider desktopCollapsible={false} className="bg-sidebar">
			<AppSidebar />
			<SidebarInset className="min-h-svh overflow-hidden bg-background md:m-2 md:ml-0 md:min-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-l-0 md:border-border">
				<header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:hidden">
					<SidebarTrigger aria-label="Open navigation" />
					<Logo className="text-2xl" />
				</header>
				<div className="min-h-0 flex-1">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
