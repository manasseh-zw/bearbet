export function getInternalRedirect(value: unknown) {
	if (
		typeof value !== "string" ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\")
	) {
		return undefined;
	}

	const redirect = new URL(value, "https://bearbet.local");
	if (redirect.origin !== "https://bearbet.local") {
		return undefined;
	}

	return `${redirect.pathname}${redirect.search}${redirect.hash}`;
}

export function getPostLoginRedirect({
	redirectTo,
	role,
}: {
	redirectTo?: string;
	role?: string | null;
}) {
	return redirectTo ?? (role === "admin" ? "/admin" : "/");
}
