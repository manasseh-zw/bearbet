import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import { getFieldError, PasswordInput } from "#/components/auth/password-input";
import { Logo } from "#/components/shared/brand";
import { Button } from "#/components/ui/button";
import { resetPassword } from "#/lib/auth-client";
import {
	type PasswordResetFormInput,
	passwordResetFormSchema,
} from "#/lib/schemas/auth.schema";

const defaultValues: PasswordResetFormInput = {
	password: "",
	confirmPassword: "",
};

export function ResetPasswordForm({
	error,
	token,
}: {
	error?: string;
	token?: string;
}) {
	const [resetComplete, setResetComplete] = useState(false);
	const passwordReset = useMutation({
		mutationFn: (value: PasswordResetFormInput) => {
			if (!token) throw new Error("This reset link is invalid or has expired.");
			return resetPassword({ ...value, token });
		},
		onSuccess: () => setResetComplete(true),
	});
	const form = useForm({
		defaultValues,
		validators: {
			onChange: passwordResetFormSchema,
			onSubmit: passwordResetFormSchema,
		},
		onSubmit: async ({ value }) => {
			await passwordReset.mutateAsync(value);
		},
	});

	return (
		<div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/20 sm:p-8">
			<Link to="/" aria-label="BearBet home" className="inline-flex">
				<Logo className="text-3xl" />
			</Link>

			<div className="mt-8">
				<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
					{resetComplete ? "Password updated" : "Set a new password"}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{resetComplete
						? "Your password has been changed. You can now sign in with it."
						: "Choose a strong password you haven’t used before."}
				</p>
			</div>

			{resetComplete ? (
				<div className="mt-7">
					<Button render={<Link to="/login" />} size="lg" className="w-full">
						Continue to sign in
					</Button>
				</div>
			) : token && !error ? (
				<form
					className="mt-7 grid gap-5"
					aria-busy={passwordReset.isPending}
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
					noValidate
				>
					<fieldset disabled={passwordReset.isPending} className="contents">
						<form.Field name="password">
							{(field) => (
								<PasswordInput
									label="New password"
									name={field.name}
									autoComplete="new-password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={field.handleChange}
									error={
										field.state.meta.isTouched
											? getFieldError(field.state.meta.errors)
											: undefined
									}
								/>
							)}
						</form.Field>
						<form.Field name="confirmPassword">
							{(field) => (
								<PasswordInput
									label="Confirm new password"
									name={field.name}
									autoComplete="new-password"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={field.handleChange}
									error={
										field.state.meta.isTouched
											? getFieldError(field.state.meta.errors)
											: undefined
									}
								/>
							)}
						</form.Field>

						{passwordReset.error ? (
							<p className="text-sm text-destructive" role="alert">
								{passwordReset.error.message}
							</p>
						) : null}

						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Button
									type="submit"
									size="lg"
									className="w-full"
									disabled={
										!canSubmit || isSubmitting || passwordReset.isPending
									}
								>
									{passwordReset.isPending ? (
										<LoaderCircleIcon
											className="animate-spin"
											aria-hidden="true"
										/>
									) : null}
									{passwordReset.isPending
										? "Updating password..."
										: "Update password"}
								</Button>
							)}
						</form.Subscribe>
					</fieldset>
				</form>
			) : (
				<div
					className="mt-7 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
					role="alert"
				>
					This password reset link is invalid or has expired. Request a new one
					to continue.
				</div>
			)}

			{!resetComplete ? (
				<p className="mt-6 text-center text-sm text-muted-foreground">
					<Link
						to="/forgot-password"
						className="font-medium text-primary hover:underline"
					>
						Request another reset link
					</Link>
				</p>
			) : null}
		</div>
	);
}
