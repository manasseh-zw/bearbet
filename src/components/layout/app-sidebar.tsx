import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
	BadgePercentIcon,
	ChevronUpIcon,
	CircleHelpIcon,
	CrownIcon,
	DicesIcon,
	GiftIcon,
	HistoryIcon,
	LoaderCircleIcon,
	LogInIcon,
	LogOutIcon,
	SettingsIcon,
	ShieldCheckIcon,
	UserRoundIcon,
	UserRoundPlusIcon,
	WalletCardsIcon,
	XIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { Logo } from "#/components/brand";
import { Button } from "#/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "#/components/ui/sidebar";
import { Skeleton } from "#/components/ui/skeleton";
import { authClient, signOutPlayer } from "#/lib/auth-client";

type NavigationItem = {
	label: string;
	icon: LucideIcon;
	to: "/" | "/promotions" | "/bonuses" | "/vip" | "/wallet" | "/history";
};

const casinoNavigation: NavigationItem[] = [
	{ label: "Casino", icon: DicesIcon, to: "/" },
	{ label: "Promotions", icon: GiftIcon, to: "/promotions" },
	{ label: "Bonuses", icon: BadgePercentIcon, to: "/bonuses" },
	{ label: "VIP club", icon: CrownIcon, to: "/vip" },
];

const accountNavigation: NavigationItem[] = [
	{ label: "Wallet", icon: WalletCardsIcon, to: "/wallet" },
	{ label: "History", icon: HistoryIcon, to: "/history" },
];

function MobileCloseButton() {
	const { setOpenMobile } = useSidebar();

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			aria-label="Close navigation"
			className="ml-auto md:hidden"
			onClick={() => setOpenMobile(false)}
		>
			<XIcon />
		</Button>
	);
}

function NavigationGroup({
	items,
	label,
}: {
	items: NavigationItem[];
	label?: string;
}) {
	const { pathname } = useLocation();
	const { setOpenMobile } = useSidebar();

	return (
		<SidebarGroup className="p-0">
			{label ? (
				<SidebarGroupLabel className="mb-1 h-7 px-2 text-xs font-medium text-sidebar-foreground/55">
					{label}
				</SidebarGroupLabel>
			) : null}
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map(({ icon: Icon, label: itemLabel, to }) => {
						const isActive =
							to === pathname ||
							(to === "/" && pathname.startsWith("/games/")) ||
							(to !== "/" && pathname.startsWith(`${to}/`));
						const content = (
							<>
								<Icon className="size-5 text-sidebar-foreground/45" />
								<span>{itemLabel}</span>
							</>
						);

						return (
							<SidebarMenuItem key={itemLabel}>
								{isActive ? (
									<span
										aria-hidden="true"
										className="absolute top-1/2 -left-4 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary"
									/>
								) : null}
								<SidebarMenuButton
									isActive={isActive}
									tooltip={itemLabel}
									render={<Link to={to} onClick={() => setOpenMobile(false)} />}
									className="h-10 gap-3 rounded-lg px-2 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-transparent data-active:text-sidebar-foreground data-active:[&_svg]:text-primary"
								>
									{content}
								</SidebarMenuButton>
							</SidebarMenuItem>
						);
					})}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

function PlayerProfile() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();
	const logout = useMutation({
		mutationFn: signOutPlayer,
		onSuccess: async () => {
			await navigate({ to: "/", replace: true });
		},
	});

	if (isPending) {
		return (
			<output
				className="flex h-14 items-center gap-3 px-2"
				aria-label="Loading player account"
			>
				<Skeleton className="size-9 shrink-0 rounded-lg bg-sidebar-accent" />
				<div className="grid flex-1 gap-1.5">
					<Skeleton className="h-3.5 w-24 bg-sidebar-accent" />
					<Skeleton className="h-3 w-36 bg-sidebar-accent" />
				</div>
			</output>
		);
	}

	const user = session?.user;

	return (
		<div>
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<SidebarMenuButton
							size="lg"
							className="h-auto gap-3 rounded-lg px-2 py-2.5 hover:bg-sidebar-accent"
						/>
					}
				>
					<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-accent text-sidebar-foreground">
						<UserRoundIcon className="size-4" />
					</span>
					<span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
						<span className="truncate font-medium text-sidebar-foreground">
							{user?.name ?? "Player account"}
						</span>
						<span className="truncate text-xs text-sidebar-foreground/45">
							{user?.email ?? "Sign in to play"}
						</span>
					</span>
					<ChevronUpIcon className="ml-auto size-4 text-sidebar-foreground/40" />
				</DropdownMenuTrigger>
				<DropdownMenuContent
					side="top"
					align="start"
					className="w-(--anchor-width)"
				>
					{user ? (
						<>
							<DropdownMenuItem render={<Link to="/profile" />}>
								<SettingsIcon />
								Profile
							</DropdownMenuItem>
							{user.role === "admin" ? (
								<DropdownMenuItem render={<Link to="/admin" />}>
									<ShieldCheckIcon />
									Admin
								</DropdownMenuItem>
							) : null}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								disabled={logout.isPending}
								closeOnClick={false}
								onClick={() => logout.mutate()}
							>
								{logout.isPending ? (
									<LoaderCircleIcon className="animate-spin" />
								) : (
									<LogOutIcon />
								)}
								{logout.isPending ? "Signing out..." : "Log out"}
							</DropdownMenuItem>
						</>
					) : (
						<>
							<DropdownMenuItem render={<Link to="/login" />}>
								<LogInIcon />
								Sign in
							</DropdownMenuItem>
							<DropdownMenuItem render={<Link to="/register" />}>
								<UserRoundPlusIcon />
								Create account
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{logout.error ? (
				<p className="mt-2 px-2 text-xs text-destructive" role="alert">
					{logout.error.message}
				</p>
			) : null}
		</div>
	);
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar
			collapsible="offcanvas"
			className="group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0"
			{...props}
		>
			<SidebarHeader className="h-18 justify-center border-b border-sidebar-border px-6 py-0">
				<div className="flex items-center">
					<Logo className="text-2xl text-sidebar-foreground" />
					<MobileCloseButton />
				</div>
			</SidebarHeader>

			<SidebarContent className="gap-8 px-4 py-6">
				<NavigationGroup items={casinoNavigation} />
				<NavigationGroup label="Your account" items={accountNavigation} />
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
							<PlayerProfile />
						</SidebarMenuItem>
					</SidebarMenu>
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
