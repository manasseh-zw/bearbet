import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon, LoaderCircleIcon } from "lucide-react";
import { useId, useState } from "react";

import { AuthLayout } from "#/components/auth/auth-layout";
import { Logo } from "#/components/shared/brand";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { signInPlayer } from "#/lib/auth-client";
import { getPostLoginRedirect } from "#/lib/navigation";
import {
	type LoginFormInput,
	loginFormSchema,
} from "#/lib/schemas/auth.schema";

const defaultValues: LoginFormInput = {
	identifier: "",
	password: "",
};

function useLoginForm(onSubmit: (value: LoginFormInput) => Promise<void>) {
	return useForm({
		defaultValues,
		validators: {
			onChange: loginFormSchema,
			onSubmit: loginFormSchema,
		},
		onSubmit: async ({ value }) => onSubmit(value),
	});
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
	const navigate = useNavigate();
	const passwordId = useId();
	const [showPassword, setShowPassword] = useState(false);

	const login = useMutation({
		mutationFn: signInPlayer,
		onSuccess: async (result) => {
			await navigate({
				href: getPostLoginRedirect({
					redirectTo,
					role: result.user.role,
				}),
				replace: true,
			});
		},
	});

	const form = useLoginForm(async (value) => {
		await login.mutateAsync(value);
	});

	return (
		<AuthLayout imageAlt="BearBet mascot at a card table">
			<div className="grid gap-8">
				<div className="flex items-center justify-between gap-4">
					<Link to="/" aria-label="BearBet home" className="inline-flex">
						<Logo className="text-2xl" />
					</Link>
					<span className="text-xs text-muted-foreground">Player account</span>
				</div>

				<div className="grid gap-2">
					<h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
						Welcome back
					</h1>
					<p className="text-sm leading-6 text-muted-foreground">
						Sign in to continue playing.
					</p>
				</div>

				{login.error ? (
					<p
						className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
						role="alert"
					>
						{login.error.message}
					</p>
				) : null}

				<form
					className="grid gap-5"
					aria-busy={login.isPending}
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
					noValidate
				>
					<fieldset disabled={login.isPending} className="contents">
						<form.Field name="identifier">
							{(field) => {
								const error = getFieldError(field.state.meta.errors);
								const invalid = field.state.meta.isTouched && Boolean(error);

								return (
									<div className="grid gap-2">
										<Label htmlFor={field.name}>Email or username</Label>
										<Input
											id={field.name}
											name={field.name}
											autoComplete="username"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={invalid}
											aria-describedby={
												invalid ? `${field.name}-error` : undefined
											}
											className="h-11 rounded-xl"
										/>
										{invalid ? (
											<FieldError id={`${field.name}-error`}>
												{error}
											</FieldError>
										) : null}
									</div>
								);
							}}
						</form.Field>

						<form.Field name="password">
							{(field) => {
								const error = getFieldError(field.state.meta.errors);
								const invalid = field.state.meta.isTouched && Boolean(error);

								return (
									<div className="grid gap-2">
										<div className="flex items-center justify-between gap-4">
											<Label htmlFor={passwordId}>Password</Label>
											<Link
												to="/forgot-password"
												className="text-xs font-medium text-primary hover:underline"
											>
												Forgot password?
											</Link>
										</div>
										<div className="relative">
											<Input
												id={passwordId}
												name={field.name}
												type={showPassword ? "text" : "password"}
												autoComplete="current-password"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={invalid}
												aria-describedby={
													invalid ? `${passwordId}-error` : undefined
												}
												className="h-11 rounded-xl pr-10"
											/>
											<button
												type="button"
												className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
												onClick={() => setShowPassword((value) => !value)}
												aria-label={
													showPassword ? "Hide password" : "Show password"
												}
												aria-pressed={showPassword}
											>
												{showPassword ? (
													<EyeOffIcon aria-hidden="true" />
												) : (
													<EyeIcon aria-hidden="true" />
												)}
											</button>
										</div>
										{invalid ? (
											<FieldError id={`${passwordId}-error`}>
												{error}
											</FieldError>
										) : null}
									</div>
								);
							}}
						</form.Field>

						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Button
									type="submit"
									size="lg"
									className="mt-1 h-12 w-full"
									disabled={!canSubmit || isSubmitting || login.isPending}
								>
									{login.isPending ? (
										<LoaderCircleIcon
											className="animate-spin"
											aria-hidden="true"
										/>
									) : null}
									{login.isPending ? "Signing in..." : "Sign in"}
								</Button>
							)}
						</form.Subscribe>
					</fieldset>
				</form>

				<p className="text-center text-sm text-muted-foreground">
					New here?{" "}
					<Link
						to="/register"
						search={{ redirect: redirectTo }}
						className="font-medium text-primary hover:underline"
					>
						Create a free account
					</Link>
				</p>
			</div>
		</AuthLayout>
	);
}

function FieldError({ id, children }: { id: string; children: string }) {
	return (
		<p id={id} className="text-xs text-destructive" role="alert">
			{children}
		</p>
	);
}

function getFieldError(errors: unknown[]) {
	for (const error of errors) {
		if (typeof error === "string") return error;
		if (
			error &&
			typeof error === "object" &&
			"message" in error &&
			typeof error.message === "string"
		) {
			return error.message;
		}
	}

	return "";
}
