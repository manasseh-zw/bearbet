import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	BadgeCheckIcon,
	BadgePercentIcon,
	ChevronUpIcon,
	CircleDollarSignIcon,
	CircleHelpIcon,
	DicesIcon,
	FileClockIcon,
	LayoutDashboardIcon,
	LogOutIcon,
	ShieldCheckIcon,
	UsersIcon,
	WalletCardsIcon,
	XIcon,
} from "lucide-react";
import type { PropsWithChildren } from "react";
import { Logo } from "#/components/shared/brand";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
} from "#/components/ui/sidebar";
import { Skeleton } from "#/components/ui/skeleton";
import { authClient, signOutPlayer } from "#/lib/auth-client";

type AdminNavigationItem = {
	label: string;
	icon: LucideIcon;
	to:
		| "/admin"
		| "/admin/users"
		| "/admin/withdrawals"
		| "/admin/games"
		| "/admin/bonuses"
		| "/admin/activity";
};

const operationalNavigation: AdminNavigationItem[] = [
	{ label: "Overview", icon: LayoutDashboardIcon, to: "/admin" },
	{ label: "Users", icon: UsersIcon, to: "/admin/users" },
	{ label: "Withdrawals", icon: WalletCardsIcon, to: "/admin/withdrawals" },
];

const catalogueNavigation: AdminNavigationItem[] = [
	{ label: "Games", icon: DicesIcon, to: "/admin/games" },
	{ label: "Bonuses", icon: BadgePercentIcon, to: "/admin/bonuses" },
	{ label: "Activity", icon: FileClockIcon, to: "/admin/activity" },
];

function MobileCloseButton() {
	const { setOpenMobile } = useSidebar();

	return (
		<Button
			aria-label="Close navigation"
			className="ml-auto md:hidden"
			onClick={() => setOpenMobile(false)}
			size="icon-sm"
			variant="ghost"
		>
			<XIcon />
		</Button>
	);
}

function AdminNavigationGroup({
	items,
	label,
}: {
	items: AdminNavigationItem[];
	label: string;
}) {
	const { pathname } = useLocation();
	const { setOpenMobile } = useSidebar();

	return (
		<SidebarGroup className="p-0">
			<SidebarGroupLabel className="mb-1 h-7 px-2 text-xs font-medium text-sidebar-foreground/55">
				{label}
			</SidebarGroupLabel>
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map(({ icon: Icon, label: itemLabel, to }) => {
						const isActive =
							pathname === to ||
							(to !== "/admin" && pathname.startsWith(`${to}/`));

						return (
							<SidebarMenuItem key={to}>
								{isActive ? (
									<span
										aria-hidden="true"
										className="absolute top-1/2 -left-4 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary"
									/>
								) : null}
								<SidebarMenuButton
									isActive={isActive}
									render={<Link to={to} onClick={() => setOpenMobile(false)} />}
									tooltip={itemLabel}
									className="h-10 gap-3 rounded-lg px-2 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-transparent data-active:text-sidebar-foreground data-active:[&_svg]:text-primary"
								>
									<Icon className="size-5 text-sidebar-foreground/45" />
									<span>{itemLabel}</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

function AdminProfile() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const logout = useMutation({
		mutationFn: signOutPlayer,
		onSuccess: async () => {
			await navigate({ to: "/", replace: true });
		},
	});
	const user = session?.user;
	const displayName = user?.name || user?.email || "Administrator";
	const initials = displayName
		.split(/\s+/)
		.map((part) => part[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

	if (isPending) {
		return (
			<div className="flex h-14 items-center gap-3 px-2">
				<Skeleton className="size-9 rounded-lg bg-sidebar-accent" />
				<Skeleton className="h-4 w-28 bg-sidebar-accent" />
			</div>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<SidebarMenuButton
						className="h-auto gap-3 rounded-lg px-2 py-2.5 hover:bg-sidebar-accent"
						size="lg"
					/>
				}
			>
				<Avatar className="rounded-lg" size="lg">
					<AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
						{initials || <ShieldCheckIcon />}
					</AvatarFallback>
				</Avatar>
				<span className="grid min-w-0 flex-1 text-left leading-tight">
					<span className="truncate text-sm font-medium text-sidebar-foreground">
						{displayName}
					</span>
					<span className="mt-1 flex items-center gap-1.5 text-xs text-sidebar-foreground/50">
						<BadgeCheckIcon />
						Administrator
					</span>
				</span>
				<ChevronUpIcon className="ml-auto text-sidebar-foreground/40" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				side="top"
				className="w-(--anchor-width)"
			>
				<DropdownMenuGroup>
					<DropdownMenuLabel className="font-normal">
						<p className="truncate font-medium">{displayName}</p>
						<p className="mt-1 truncate text-xs text-muted-foreground">
							{user?.email || "Admin portal access"}
						</p>
					</DropdownMenuLabel>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					disabled={logout.isPending}
					onClick={() => logout.mutate()}
					variant="destructive"
				>
					<LogOutIcon />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function AdminSidebar() {
	return (
		<Sidebar
			collapsible="offcanvas"
			variant="sidebar"
			className="group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0"
		>
			<SidebarHeader className="gap-3 p-4">
				<div className="flex items-center justify-between">
					<Link aria-label="BearBet admin overview" to="/admin">
						<Logo className="text-3xl" />
					</Link>
					<MobileCloseButton />
				</div>
				<div className="flex items-center gap-2 text-xs text-sidebar-foreground/55">
					<CircleDollarSignIcon className="text-primary" />
					<span>Operations portal</span>
				</div>
			</SidebarHeader>
			<SidebarContent className="gap-8 px-4 py-6">
				<AdminNavigationGroup
					items={operationalNavigation}
					label="Operations"
				/>
				<AdminNavigationGroup items={catalogueNavigation} label="Catalogue" />
			</SidebarContent>
			<SidebarFooter className="gap-0 p-0">
				<div className="px-4 py-3">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton className="h-9 gap-3 rounded-lg px-2 text-sidebar-foreground/65 hover:text-sidebar-foreground">
								<ShieldCheckIcon className="size-5 text-sidebar-foreground/40" />
								<span>Responsible play</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton className="h-9 gap-3 rounded-lg px-2 text-sidebar-foreground/65 hover:text-sidebar-foreground">
								<CircleHelpIcon className="size-5 text-sidebar-foreground/40" />
								<span>Support</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</div>

				<div aria-hidden="true" className="h-px w-full bg-sidebar-border" />

				<div className="p-4">
					<SidebarMenu>
						<SidebarMenuItem>
							<AdminProfile />
						</SidebarMenuItem>
					</SidebarMenu>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}

export function AdminShell({ children }: PropsWithChildren) {
	return (
		<SidebarProvider desktopCollapsible={false} className="bg-sidebar">
			<AdminSidebar />
			<SidebarInset className="min-h-svh overflow-hidden bg-background md:m-2 md:ml-0 md:min-h-[calc(100svh-1rem)] md:rounded-xl md:border md:border-border">
				<header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:hidden">
					<SidebarTrigger aria-label="Open admin navigation" />
					<Logo className="text-2xl" />
					<Badge className="ml-auto" variant="outline">
						Admin
					</Badge>
				</header>
				<div className="min-h-0 flex-1">{children}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
