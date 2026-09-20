import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LoaderCircleIcon } from "lucide-react";
import { useState } from "react";

import { getFieldError } from "#/components/auth/password-input";
import { Logo } from "#/components/shared/brand";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { requestPasswordReset } from "#/lib/auth-client";
import {
	type ForgotPasswordFormInput,
	forgotPasswordFormSchema,
} from "#/lib/schemas/auth.schema";

const defaultValues: ForgotPasswordFormInput = { email: "" };

export function ForgotPasswordForm() {
	const [requestSent, setRequestSent] = useState(false);
	const resetRequest = useMutation({
		mutationFn: requestPasswordReset,
		onSuccess: () => setRequestSent(true),
	});
	const form = useForm({
		defaultValues,
		validators: {
			onChange: forgotPasswordFormSchema,
			onSubmit: forgotPasswordFormSchema,
		},
		onSubmit: async ({ value }) => {
			await resetRequest.mutateAsync(value);
		},
	});

	return (
		<div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl shadow-black/20 sm:p-8">
			<Link to="/" aria-label="BearBet home" className="inline-flex">
				<Logo className="text-3xl" />
			</Link>

			<div className="mt-8">
				<h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
					Forgot your password?
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Enter your email and we’ll send you a secure reset link.
				</p>
			</div>

			{requestSent ? (
				<output
					className="mt-6 block w-full rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm leading-6 text-foreground"
					aria-live="polite"
				>
					If an account exists for that email, we’ll send a reset link shortly.
					Check your inbox and spam folder.
				</output>
			) : (
				<form
					className="mt-7 grid gap-5"
					aria-busy={resetRequest.isPending}
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
					noValidate
				>
					<fieldset disabled={resetRequest.isPending} className="contents">
						<form.Field name="email">
							{(field) => {
								const error = getFieldError(field.state.meta.errors);
								const invalid = field.state.meta.isTouched && Boolean(error);

								return (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>Email address</Label>
										<Input
											id={field.name}
											name={field.name}
											type="email"
											autoComplete="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={invalid}
											aria-describedby={
												invalid ? `${field.name}-error` : undefined
											}
											className="h-10"
										/>
										{invalid ? (
											<p
												id={`${field.name}-error`}
												className="text-xs text-destructive"
												role="alert"
											>
												{error}
											</p>
										) : null}
									</div>
								);
							}}
						</form.Field>

						{resetRequest.error ? (
							<p className="text-sm text-destructive" role="alert">
								{resetRequest.error.message}
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
										!canSubmit || isSubmitting || resetRequest.isPending
									}
								>
									{resetRequest.isPending ? (
										<LoaderCircleIcon
											className="animate-spin"
											aria-hidden="true"
										/>
									) : null}
									{resetRequest.isPending
										? "Sending link..."
										: "Send reset link"}
								</Button>
							)}
						</form.Subscribe>
					</fieldset>
				</form>
			)}

			<p className="mt-6 text-center text-sm text-muted-foreground">
				Remembered your password?{" "}
				<Link to="/login" className="font-medium text-primary hover:underline">
					Back to sign in
				</Link>
			</p>
		</div>
	);
}
