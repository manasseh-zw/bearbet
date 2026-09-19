import "@tanstack/react-start/server-only";

import { Resend } from "resend";

import { env } from "#/server/env";

type PasswordResetEmailInput = {
	to: string;
	url: string;
};

export async function sendPasswordResetEmail({
	to,
	url,
}: PasswordResetEmailInput) {
	if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
		if (env.NODE_ENV === "production") {
			throw new Error(
				"Password reset email delivery is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
			);
		}

		console.warn(
			"Password reset email skipped because Resend is not configured.",
		);
		return;
	}

	const resend = new Resend(env.RESEND_API_KEY);
	const result = await resend.emails.send({
		from: env.RESEND_FROM_EMAIL,
		to,
		subject: "Reset your BearBet password",
		text: [
			"We received a request to reset your BearBet password.",
			"",
			`Reset your password: ${url}`,
			"",
			"This link expires soon and can only be used once. If you did not request this, you can safely ignore this email.",
		].join("\n"),
		html: `
			<div style="font-family:Arial,sans-serif;line-height:1.5;color:#171717">
				<h1>Reset your BearBet password</h1>
				<p>We received a request to reset your BearBet password.</p>
				<p><a href="${url}">Reset your password</a></p>
				<p>This link expires soon and can only be used once. If you did not request this, you can safely ignore this email.</p>
			</div>
		`,
	});

	if (result.error) {
		throw new Error(
			`Resend could not deliver the password reset email: ${result.error.message}`,
		);
	}
}
