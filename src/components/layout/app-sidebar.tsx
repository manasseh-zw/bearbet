import type { LucideIcon } from "lucide-react";
import {
	BadgePercentIcon,
	CircleHelpIcon,
	CrownIcon,
	DicesIcon,
	GiftIcon,
	ReceiptTextIcon,
	ShieldCheckIcon,
	UserRoundIcon,
	WalletCardsIcon,
	XIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { Logo } from "#/components/brand";
import { Button } from "#/components/ui/button";
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
	SidebarRail,
	useSidebar,
} from "#/components/ui/sidebar";

type NavigationItem = {
	label: string;
	icon: LucideIcon;
	isActive?: boolean;
};

const casinoNavigation: NavigationItem[] = [
	{ label: "Casino", icon: DicesIcon, isActive: true },
	{ label: "Promotions", icon: GiftIcon },
	{ label: "Bonuses", icon: BadgePercentIcon },
	{ label: "VIP club", icon: CrownIcon },
];

const accountNavigation: NavigationItem[] = [
	{ label: "Wallet", icon: WalletCardsIcon },
	{ label: "Transactions", icon: ReceiptTextIcon },
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
	return (
		<SidebarGroup className="p-0">
			{label ? (
				<SidebarGroupLabel className="mb-1 h-7 px-2 text-xs font-medium text-sidebar-foreground/55">
					{label}
				</SidebarGroupLabel>
			) : null}
			<SidebarGroupContent>
				<SidebarMenu>
					{items.map(({ icon: Icon, isActive, label: itemLabel }) => (
						<SidebarMenuItem key={itemLabel}>
							{isActive ? (
								<span
									aria-hidden="true"
									className="absolute top-1/2 -left-4 h-6 w-1 -translate-y-1/2 rounded-full bg-primary"
								/>
							) : null}
							<SidebarMenuButton
								isActive={isActive}
								tooltip={itemLabel}
								className="h-10 gap-3 rounded-lg px-2 text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-active:bg-transparent data-active:text-sidebar-foreground data-active:[&_svg]:text-primary"
							>
								<Icon className="size-5 text-sidebar-foreground/45" />
								<span>{itemLabel}</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					))}
				</SidebarMenu>
			</SidebarGroupContent>
		</SidebarGroup>
	);
}

export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="offcanvas" className="border-r-0" {...props}>
			<SidebarHeader className="h-24 justify-center border-b border-sidebar-border px-6 py-0">
				<div className="flex items-center">
					<Logo className="text-[2rem] text-sidebar-foreground" />
					<MobileCloseButton />
				</div>
			</SidebarHeader>

			<SidebarContent className="gap-8 px-4 py-6">
				<NavigationGroup items={casinoNavigation} />
				<NavigationGroup label="Your account" items={accountNavigation} />
			</SidebarContent>

			<SidebarFooter className="gap-4 border-t border-sidebar-border p-4">
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

				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							className="h-auto gap-3 rounded-lg px-2 py-2.5 hover:bg-sidebar-accent"
						>
							<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-accent text-sidebar-foreground">
								<UserRoundIcon className="size-4" />
							</span>
							<span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium text-sidebar-foreground">
									Player account
								</span>
								<span className="truncate text-xs text-sidebar-foreground/45">
									Sign in to play
								</span>
							</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
