import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import type { AppContext } from "../provider";
import appCss from "../styles.css?url";

const siteOrigin = "https://bearbet.vercel.app";
const siteName = "BearBet";
const siteDescription =
	"A casino-only demo with virtual funds, games, bonuses, and a simulated wallet.";
const socialImage = `${siteOrigin}/images/bearbet_og.webp`;

export const Route = createRootRouteWithContext<AppContext>()({
	head: ({ match, matches }) => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				name: "apple-mobile-web-app-title",
				content: siteName,
			},
			{
				name: "description",
				content: siteDescription,
			},
			{
				property: "og:site_name",
				content: siteName,
			},
			{
				property: "og:title",
				content: siteName,
			},
			{
				property: "og:description",
				content: siteDescription,
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:url",
				content: `${siteOrigin}${matches.at(-1)?.pathname ?? match.pathname}`,
			},
			{
				property: "og:image",
				content: socialImage,
			},
			{
				property: "og:image:secure_url",
				content: socialImage,
			},
			{
				property: "og:image:type",
				content: "image/webp",
			},
			{
				property: "og:image:width",
				content: "1672",
			},
			{
				property: "og:image:height",
				content: "941",
			},
			{
				property: "og:image:alt",
				content:
					"BearBet casino gaming with a bear in a tuxedo, cards, chips, and roulette.",
			},
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:title",
				content: siteName,
			},
			{
				name: "twitter:description",
				content: siteDescription,
			},
			{
				name: "twitter:image",
				content: socialImage,
			},
			{
				name: "twitter:image:alt",
				content:
					"BearBet casino gaming with a bear in a tuxedo, cards, chips, and roulette.",
			},
			{
				title: siteName,
			},
		],
		links: [
			{
				rel: "canonical",
				href: `${siteOrigin}${matches.at(-1)?.pathname ?? match.pathname}`,
			},
			{
				rel: "icon",
				type: "image/png",
				href: "/favicon-96x96.png",
				sizes: "96x96",
			},
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg",
			},
			{
				rel: "shortcut icon",
				href: "/favicon.ico",
			},
			{
				rel: "apple-touch-icon",
				sizes: "180x180",
				href: "/apple-touch-icon.png",
			},
			{
				rel: "manifest",
				href: "/site.webmanifest",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
