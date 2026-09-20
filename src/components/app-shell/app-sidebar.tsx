import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Facehash } from "facehash";
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
	PlusCircleIcon,
	RefreshCwIcon,
	SettingsIcon,
	ShieldCheckIcon,
	UserRoundIcon,
	UserRoundPlusIcon,
	WalletCardsIcon,
	XIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { Logo } from "#/components/shared/brand";
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
import { walletQueries } from "#/lib/queries/wallet.queries";

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
const adminCasinoNavigation = casinoNavigation.filter(
	(item) => item.to !== "/bonuses",
);

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
	const user = session?.user;
	const isPlayer = user?.role === "user";
	const wallet = useQuery({
		...walletQueries.current(),
		enabled: isPlayer,
	});
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
					<Skeleton className="h-3 w-14 bg-sidebar-accent" />
					<Skeleton className="h-4 w-24 bg-sidebar-accent" />
				</div>
			</output>
		);
	}

	const amount = wallet.data
		? new Intl.NumberFormat(undefined, {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			})
		: null;
	const playableBalance =
		wallet.data && amount
			? formatMinorUnits(wallet.data.playableBalanceMinor, amount)
			: null;

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
					{user ? (
						<Facehash
							name={user.name || user.id}
							size={36}
							colors={["#f6c453", "#e9a923", "#ffd978"]}
							intensity3d="subtle"
							className="shrink-0 overflow-hidden rounded-lg font-semibold text-[#211805] ring-1 ring-primary/30"
						/>
					) : (
						<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-accent text-sidebar-foreground">
							<UserRoundIcon className="size-4" />
						</span>
					)}
					<span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
						{user ? (
							user.role === "admin" ? (
								<>
									<span className="text-xs text-sidebar-foreground/45">
										Signed in as
									</span>
									<span className="truncate text-xl leading-none font-semibold text-sidebar-foreground">
										Administrator
									</span>
								</>
							) : wallet.isPending ? (
								<>
									<span className="text-xs text-sidebar-foreground/45">
										Balance
									</span>
									<Skeleton className="mt-1 h-4 w-24 bg-sidebar-accent" />
								</>
							) : wallet.isError ? (
								<>
									<span className="text-xs text-sidebar-foreground/45">
										Balance
									</span>
									<span className="truncate font-medium text-destructive">
										Unavailable
									</span>
								</>
							) : (
								<span className="truncate text-xl leading-none font-semibold text-sidebar-foreground tabular-nums">
									{playableBalance}{" "}
									<span className="text-sm text-primary">
										{wallet.data?.currencyCode}
									</span>
								</span>
							)
						) : (
							<>
								<span className="font-medium text-sidebar-foreground">
									Player account
								</span>
								<span className="text-xs text-sidebar-foreground/45">
									Sign in to play
								</span>
							</>
						)}
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
							{user.role === "admin" ? (
								<div className="px-2 py-2.5">
									<p className="text-xs text-muted-foreground">
										Current access
									</p>
									<p className="mt-0.5 text-lg font-semibold">Administrator</p>
								</div>
							) : wallet.data && amount ? (
								<div className="px-2 py-2.5">
									<p className="text-xs text-muted-foreground">
										Available to play
									</p>
									<p className="mt-0.5 text-lg font-semibold tabular-nums">
										{playableBalance}{" "}
										<span className="text-xs text-primary">
											{wallet.data.currencyCode}
										</span>
									</p>
									<div className="mt-2 grid grid-cols-2 gap-2 text-xs">
										<span className="text-muted-foreground">Cash</span>
										<span className="text-right tabular-nums">
											{formatMinorUnits(
												wallet.data.balances.cashBalanceMinor,
												amount,
											)}{" "}
											{wallet.data.currencyCode}
										</span>
										<span className="text-muted-foreground">Bonus</span>
										<span className="text-right tabular-nums">
											{formatMinorUnits(
												wallet.data.balances.bonusBalanceMinor,
												amount,
											)}{" "}
											{wallet.data.currencyCode}
										</span>
									</div>
								</div>
							) : wallet.isError ? (
								<DropdownMenuItem
									closeOnClick={false}
									onClick={() => wallet.refetch()}
								>
									<RefreshCwIcon
										className={wallet.isFetching ? "animate-spin" : undefined}
									/>
									{wallet.isFetching ? "Retrying..." : "Retry balance"}
								</DropdownMenuItem>
							) : null}
							<DropdownMenuSeparator />
							{user.role === "admin" ? (
								<DropdownMenuItem render={<Link to="/admin" />}>
									<ShieldCheckIcon />
									Admin dashboard
								</DropdownMenuItem>
							) : (
								<>
									<DropdownMenuItem render={<Link to="/wallet" />}>
										<PlusCircleIcon />
										Add funds
									</DropdownMenuItem>
									<DropdownMenuItem render={<Link to="/profile" />}>
										<SettingsIcon />
										Profile
									</DropdownMenuItem>
								</>
							)}
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

function formatMinorUnits(valueMinor: number, formatter: Intl.NumberFormat) {
	return formatter.format(valueMinor / 100);
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
	const { data: session } = authClient.useSession();
	const isAdmin = session?.user.role === "admin";

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
				<NavigationGroup
					items={isAdmin ? adminCasinoNavigation : casinoNavigation}
				/>
				{!isAdmin ? (
					<NavigationGroup label="Your account" items={accountNavigation} />
				) : null}
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
