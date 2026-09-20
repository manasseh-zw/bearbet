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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { registerPlayer } from "#/lib/auth-client";
import {
	type RegistrationFormInput,
	registrationFormSchema,
	supportedCurrencies,
} from "#/lib/schemas/auth.schema";

const countries = [
	{ code: "ZW", name: "Zimbabwe", currencyCode: "USD" },
	{ code: "ZA", name: "South Africa", currencyCode: "ZAR" },
	{ code: "GB", name: "United Kingdom", currencyCode: "GBP" },
	{ code: "US", name: "United States", currencyCode: "USD" },
] as const;

const currencyNames: Record<(typeof supportedCurrencies)[number], string> = {
	USD: "US dollar",
	ZAR: "South African rand",
	GBP: "British pound",
};

const defaultValues: RegistrationFormInput = {
	username: "",
	email: "",
	password: "",
	confirmPassword: "",
	firstName: "",
	lastName: "",
	dateOfBirth: "",
	countryCode: "ZW",
	currencyCode: "USD",
};

function useRegistrationForm(
	onSubmit: (value: RegistrationFormInput) => Promise<void>,
) {
	return useForm({
		defaultValues,
		validators: {
			onChange: registrationFormSchema,
			onSubmit: registrationFormSchema,
		},
		onSubmit: async ({ value }) => onSubmit(value),
	});
}

export function RegisterForm({ redirectTo }: { redirectTo?: string }) {
	const navigate = useNavigate();
	const passwordId = useId();
	const confirmPasswordId = useId();
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);

	const registration = useMutation({
		mutationFn: registerPlayer,
		onSuccess: async () => {
			await navigate({ href: redirectTo ?? "/", replace: true });
		},
	});

	const form = useRegistrationForm(async (value) => {
		const { confirmPassword: _, ...input } = value;
		await registration.mutateAsync(input);
	});

	return (
		<AuthLayout imageAlt="BearBet mascot welcoming new players">
			<div className="grid gap-8">
				<div className="flex items-center justify-between gap-4">
					<Link to="/" aria-label="BearBet home" className="inline-flex">
						<Logo className="text-2xl" />
					</Link>
					<span className="text-xs text-muted-foreground">Player account</span>
				</div>

				<div className="grid gap-2">
					<h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
						Create your account
					</h1>
					<p className="text-sm leading-6 text-muted-foreground">
						Join BearBet and receive $1,000 in virtual funds to play.
					</p>
				</div>

				{registration.error ? (
					<p
						className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
						role="alert"
					>
						{registration.error.message}
					</p>
				) : null}

				<form
					className="grid gap-4 sm:grid-cols-2"
					aria-busy={registration.isPending}
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
					noValidate
				>
					<fieldset disabled={registration.isPending} className="contents">
						<TextField
							form={form}
							name="firstName"
							label="First name"
							autoComplete="given-name"
						/>
						<TextField
							form={form}
							name="lastName"
							label="Last name"
							autoComplete="family-name"
						/>
						<TextField
							form={form}
							name="username"
							label="Username"
							autoComplete="username"
						/>
						<TextField
							form={form}
							name="email"
							label="Email address"
							type="email"
							autoComplete="email"
						/>
						<TextField
							form={form}
							name="dateOfBirth"
							label="Date of birth"
							type="date"
							autoComplete="bday"
						/>

						<form.Field name="countryCode">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Country</Label>
									<Select
										value={field.state.value}
										onValueChange={(value) => {
											if (value === null) return;
											field.handleChange(value);
											const country = countries.find(
												(item) => item.code === value,
											);
											if (country)
												form.setFieldValue(
													"currencyCode",
													country.currencyCode,
												);
										}}
										disabled={registration.isPending}
									>
										<SelectTrigger
											id={field.name}
											className="h-11 w-full rounded-xl"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{countries.map((country) => (
												<SelectItem key={country.code} value={country.code}>
													{country.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>

						<form.Field name="currencyCode">
							{(field) => (
								<div className="grid gap-2">
									<Label htmlFor={field.name}>Account currency</Label>
									<Select
										value={field.state.value}
										onValueChange={(value) => {
											if (value !== null) field.handleChange(value);
										}}
										disabled={registration.isPending}
									>
										<SelectTrigger
											id={field.name}
											className="h-11 w-full rounded-xl"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{supportedCurrencies.map((currency) => (
												<SelectItem key={currency} value={currency}>
													{currency} · {currencyNames[currency]}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							)}
						</form.Field>

						<PasswordField
							form={form}
							name="password"
							label="Password"
							inputId={passwordId}
							visible={showPassword}
							onToggle={() => setShowPassword((value) => !value)}
						/>
						<PasswordField
							form={form}
							name="confirmPassword"
							label="Confirm password"
							inputId={confirmPasswordId}
							visible={showConfirmPassword}
							onToggle={() => setShowConfirmPassword((value) => !value)}
						/>

						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Button
									type="submit"
									size="lg"
									className="mt-1 h-12 w-full sm:col-span-2"
									disabled={
										!canSubmit || isSubmitting || registration.isPending
									}
								>
									{registration.isPending ? (
										<LoaderCircleIcon
											className="animate-spin"
											aria-hidden="true"
										/>
									) : null}
									{registration.isPending
										? "Creating account..."
										: "Create account"}
								</Button>
							)}
						</form.Subscribe>
					</fieldset>
				</form>

				<p className="text-center text-sm text-muted-foreground">
					Already have an account?{" "}
					<Link
						to="/login"
						search={{ redirect: redirectTo }}
						className="font-medium text-primary hover:underline"
					>
						Sign in
					</Link>
				</p>
			</div>
		</AuthLayout>
	);
}

type FormApi = ReturnType<typeof useRegistrationForm>;

type TextFieldName =
	| "firstName"
	| "lastName"
	| "username"
	| "email"
	| "dateOfBirth";

function TextField({
	form,
	name,
	label,
	type = "text",
	autoComplete,
}: {
	form: FormApi;
	name: TextFieldName;
	label: string;
	type?: string;
	autoComplete: string;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const error = getFieldError(field.state.meta.errors);
				const invalid = field.state.meta.isTouched && Boolean(error);

				return (
					<div className="grid gap-2">
						<Label htmlFor={field.name}>{label}</Label>
						<Input
							id={field.name}
							name={field.name}
							type={type}
							autoComplete={autoComplete}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={(event) => field.handleChange(event.target.value)}
							aria-invalid={invalid}
							aria-describedby={invalid ? `${field.name}-error` : undefined}
							className="h-11 rounded-xl"
						/>
						{invalid ? (
							<FieldError id={`${field.name}-error`}>{error}</FieldError>
						) : null}
					</div>
				);
			}}
		</form.Field>
	);
}

type PasswordFieldName = "password" | "confirmPassword";

function PasswordField({
	form,
	name,
	label,
	inputId,
	visible,
	onToggle,
}: {
	form: FormApi;
	name: PasswordFieldName;
	label: string;
	inputId: string;
	visible: boolean;
	onToggle: () => void;
}) {
	return (
		<form.Field name={name}>
			{(field) => {
				const error = getFieldError(field.state.meta.errors);
				const invalid = field.state.meta.isTouched && Boolean(error);

				return (
					<div className="grid gap-2">
						<Label htmlFor={inputId}>{label}</Label>
						<div className="relative">
							<Input
								id={inputId}
								name={field.name}
								type={visible ? "text" : "password"}
								autoComplete="new-password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(event) => field.handleChange(event.target.value)}
								aria-invalid={invalid}
								aria-describedby={invalid ? `${inputId}-error` : undefined}
								className="h-11 rounded-xl pr-10"
							/>
							<button
								type="button"
								className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								onClick={onToggle}
								aria-label={visible ? "Hide password" : "Show password"}
								aria-pressed={visible}
							>
								{visible ? (
									<EyeOffIcon aria-hidden="true" />
								) : (
									<EyeIcon aria-hidden="true" />
								)}
							</button>
						</div>
						{invalid ? (
							<FieldError id={`${inputId}-error`}>{error}</FieldError>
						) : null}
					</div>
				);
			}}
		</form.Field>
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
