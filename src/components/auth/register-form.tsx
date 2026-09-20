import { useForm, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	EyeIcon,
	EyeOffIcon,
	LoaderCircleIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState } from "react";
import { z } from "zod";

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
import { cn } from "#/lib/utils";

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

const registrationSteps = [
	{
		title: "Start with the basics",
		description: "Tell us who you are so we can set up your player profile.",
	},
	{
		title: "Set up your account",
		description: "Choose your sign-in details and keep your account secure.",
	},
	{
		title: "Finish your profile",
		description: "A few final details help us keep your play experience ready.",
	},
] as const;

type RegistrationStep = 0 | 1 | 2;

const registrationStepFields = [
	["firstName", "lastName"],
	["username", "email", "password", "confirmPassword"],
	["dateOfBirth", "countryCode", "currencyCode"],
] as const;

const registrationShape = registrationFormSchema.shape;

const registrationStepSchemas = [
	z.object({
		firstName: registrationShape.firstName,
		lastName: registrationShape.lastName,
	}),
	z
		.object({
			username: registrationShape.username,
			email: registrationShape.email,
			password: registrationShape.password,
			confirmPassword: registrationShape.confirmPassword,
		})
		.refine((input) => input.password === input.confirmPassword, {
			message: "Passwords do not match",
			path: ["confirmPassword"],
		}),
	z.object({
		dateOfBirth: registrationShape.dateOfBirth,
		countryCode: registrationShape.countryCode,
		currencyCode: registrationShape.currencyCode,
	}),
] as const;

const registrationDraftKey = "bearbet:register-draft:v1";

const registrationDraftSchema = z.object({
	firstName: z.string().max(80).optional(),
	lastName: z.string().max(80).optional(),
	username: z.string().max(30).optional(),
	email: z.string().max(320).optional(),
	dateOfBirth: z.string().optional(),
	countryCode: z
		.string()
		.regex(/^[A-Z]{2}$/, "Country code must contain two uppercase letters")
		.optional(),
	currencyCode: z.enum(supportedCurrencies).optional(),
	step: z
		.number()
		.int()
		.min(0)
		.max(registrationSteps.length - 1)
		.optional(),
});

type RegistrationDraftValues = Pick<
	RegistrationFormInput,
	| "firstName"
	| "lastName"
	| "username"
	| "email"
	| "dateOfBirth"
	| "countryCode"
	| "currencyCode"
>;

const draftValueFields = [
	"firstName",
	"lastName",
	"username",
	"email",
	"dateOfBirth",
	"countryCode",
	"currencyCode",
] as const;

function areDraftValuesEqual(
	previous: RegistrationDraftValues,
	next: RegistrationDraftValues,
) {
	return draftValueFields.every((field) => previous[field] === next[field]);
}

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
	const [step, setStep] = useState<RegistrationStep>(0);
	const [direction, setDirection] = useState<1 | -1>(1);
	const [draftReady, setDraftReady] = useState(false);
	const [stepError, setStepError] = useState<string | null>(null);
	const shouldReduceMotion = useReducedMotion();

	const registration = useMutation({
		mutationFn: registerPlayer,
		onSuccess: async () => {
			try {
				window.localStorage.removeItem(registrationDraftKey);
			} catch {
				// Storage can be unavailable in private browsing contexts.
			}
			await navigate({ href: redirectTo ?? "/", replace: true });
		},
	});

	const form = useRegistrationForm(async (value) => {
		const { confirmPassword: _, ...input } = value;
		await registration.mutateAsync(input);
	});
	const draftValues = useStore(
		form.store,
		(state): RegistrationDraftValues => ({
			firstName: state.values.firstName,
			lastName: state.values.lastName,
			username: state.values.username,
			email: state.values.email,
			dateOfBirth: state.values.dateOfBirth,
			countryCode: state.values.countryCode,
			currencyCode: state.values.currencyCode,
		}),
		areDraftValuesEqual,
	);

	useEffect(() => {
		try {
			const rawDraft = window.localStorage.getItem(registrationDraftKey);
			if (rawDraft) {
				const parsedDraft = registrationDraftSchema.safeParse(
					JSON.parse(rawDraft),
				);

				if (parsedDraft.success) {
					const draft = parsedDraft.data;
					if (draft.firstName !== undefined)
						form.setFieldValue("firstName", draft.firstName, {
							dontUpdateMeta: true,
							dontRunListeners: true,
							dontValidate: true,
						});
					if (draft.lastName !== undefined)
						form.setFieldValue("lastName", draft.lastName, {
							dontUpdateMeta: true,
							dontRunListeners: true,
							dontValidate: true,
						});
					if (draft.username !== undefined)
						form.setFieldValue("username", draft.username, {
							dontUpdateMeta: true,
							dontRunListeners: true,
							dontValidate: true,
						});
					if (draft.email !== undefined)
						form.setFieldValue("email", draft.email, {
							dontUpdateMeta: true,
							dontRunListeners: true,
							dontValidate: true,
						});
					if (draft.dateOfBirth !== undefined)
						form.setFieldValue("dateOfBirth", draft.dateOfBirth, {
							dontUpdateMeta: true,
							dontRunListeners: true,
							dontValidate: true,
						});
					if (draft.countryCode !== undefined)
						form.setFieldValue("countryCode", draft.countryCode, {
							dontUpdateMeta: true,
							dontRunListeners: true,
							dontValidate: true,
						});
					if (draft.currencyCode !== undefined)
						form.setFieldValue("currencyCode", draft.currencyCode, {
							dontUpdateMeta: true,
							dontRunListeners: true,
							dontValidate: true,
						});

					// Passwords are intentionally never stored, so resume at the account
					// step if a draft had already reached the profile step.
					const savedStep = draft.step ?? 0;
					setStep(Math.min(savedStep, 1) as RegistrationStep);
				}
			}
		} catch {
			// Storage can be unavailable or contain an invalid older draft.
		} finally {
			setDraftReady(true);
		}
	}, [form]);

	useEffect(() => {
		if (!draftReady) return;

		const hasDraft =
			step > 0 ||
			draftValues.firstName !== "" ||
			draftValues.lastName !== "" ||
			draftValues.username !== "" ||
			draftValues.email !== "" ||
			draftValues.dateOfBirth !== "" ||
			draftValues.countryCode !== defaultValues.countryCode ||
			draftValues.currencyCode !== defaultValues.currencyCode;

		try {
			if (!hasDraft) {
				window.localStorage.removeItem(registrationDraftKey);
				return;
			}

			window.localStorage.setItem(
				registrationDraftKey,
				JSON.stringify({ ...draftValues, step }),
			);
		} catch {
			// Storage can be unavailable in private browsing contexts.
		}
	}, [draftReady, draftValues, step]);

	async function validateCurrentStep() {
		const fields = registrationStepFields[step];
		for (const field of fields) {
			form.setFieldMeta(field, (previous) => ({
				...(previous ?? {}),
				isTouched: true,
			}));
		}
		await Promise.all(
			fields.map((field) => form.validateField(field, "change")),
		);

		if (!registrationStepSchemas[step].safeParse(form.state.values).success) {
			setStepError(
				step === registrationSteps.length - 1
					? "Review the highlighted fields before creating your account."
					: "Review the highlighted fields before continuing.",
			);
			return false;
		}

		setStepError(null);
		return true;
	}

	async function continueToNextStep() {
		if (!(await validateCurrentStep())) return;

		setStepError(null);
		setDirection(1);
		setStep((currentStep) =>
			currentStep < registrationSteps.length - 1
				? ((currentStep + 1) as RegistrationStep)
				: currentStep,
		);
	}

	async function submitRegistration() {
		if (!(await validateCurrentStep())) return;
		await form.handleSubmit();
	}

	function returnToPreviousStep() {
		setStepError(null);
		setStep((currentStep) =>
			currentStep > 0 ? ((currentStep - 1) as RegistrationStep) : currentStep,
		);
		setDirection(-1);
	}

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

				<div
					role="progressbar"
					aria-label="Registration progress"
					aria-valuemin={1}
					aria-valuemax={registrationSteps.length}
					aria-valuenow={step + 1}
					className="grid gap-3"
				>
					<div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
						<span>
							Step {step + 1} of {registrationSteps.length}
						</span>
						<span className="text-right">{registrationSteps[step].title}</span>
					</div>
					<div className="grid grid-cols-3 gap-2" aria-hidden="true">
						{registrationSteps.map((registrationStep, index) => (
							<span
								key={registrationStep.title}
								className={cn(
									"h-1.5 rounded-full transition-colors duration-200",
									index <= step ? "bg-primary" : "bg-muted",
								)}
							/>
						))}
					</div>
				</div>

				<form
					className="grid gap-6"
					aria-busy={registration.isPending}
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void submitRegistration();
					}}
					noValidate
				>
					<fieldset disabled={registration.isPending} className="contents">
						<div className="min-h-[20rem]">
							<AnimatePresence initial={false} mode="wait">
								<motion.div
									key={step}
									initial={{
										opacity: 0,
										x: shouldReduceMotion ? 0 : direction > 0 ? 24 : -24,
									}}
									animate={{ opacity: 1, x: 0 }}
									exit={{
										opacity: 0,
										x: shouldReduceMotion ? 0 : direction > 0 ? -24 : 24,
									}}
									transition={{
										duration: shouldReduceMotion ? 0.12 : 0.22,
										ease: [0.16, 1, 0.3, 1],
									}}
									className="grid gap-5"
								>
									<div className="grid gap-1">
										<h2 className="text-lg font-medium">
											{registrationSteps[step].title}
										</h2>
										<p className="text-sm leading-6 text-muted-foreground">
											{registrationSteps[step].description}
										</p>
									</div>

									<div className="grid gap-4 sm:grid-cols-2">
										{step === 0 ? (
											<div className="grid gap-4 sm:col-span-2">
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
											</div>
										) : null}

										{step === 1 ? (
											<>
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
													onToggle={() =>
														setShowConfirmPassword((value) => !value)
													}
												/>
											</>
										) : null}

										{step === 2 ? (
											<>
												<TextField
													form={form}
													name="dateOfBirth"
													label="Date of birth"
													type="date"
													autoComplete="bday"
												/>
												<CountryField
													form={form}
													options={countries}
													disabled={registration.isPending}
												/>
												<CurrencyField
													form={form}
													disabled={registration.isPending}
												/>
											</>
										) : null}
									</div>
									{stepError ? (
										<p className="text-xs text-destructive" role="alert">
											{stepError}
										</p>
									) : null}
								</motion.div>
							</AnimatePresence>
						</div>

						<div className="flex gap-3">
							{step > 0 ? (
								<Button
									type="button"
									variant="outline"
									size="icon-lg"
									className="size-12"
									onClick={returnToPreviousStep}
									aria-label="Back to previous step"
								>
									<ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
								</Button>
							) : null}
							{step === registrationSteps.length - 1 ? (
								<form.Subscribe selector={(state) => state.isSubmitting}>
									{(isSubmitting) => (
										<Button
											type="submit"
											size="lg"
											className="h-12 flex-1"
											disabled={isSubmitting || registration.isPending}
										>
											{registration.isPending ? (
												<LoaderCircleIcon
													data-icon="inline-start"
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
							) : (
								<Button
									type="button"
									size="lg"
									className="h-12 flex-1"
									onClick={() => void continueToNextStep()}
								>
									Continue
									<ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
								</Button>
							)}
						</div>
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

function CountryField({
	form,
	options,
	disabled,
}: {
	form: FormApi;
	options: typeof countries;
	disabled: boolean;
}) {
	return (
		<form.Field name="countryCode">
			{(field) => {
				const error = getFieldError(field.state.meta.errors);
				const invalid = field.state.meta.isTouched && Boolean(error);

				return (
					<div className="grid gap-2">
						<Label htmlFor={field.name}>Country</Label>
						<Select
							value={field.state.value}
							onValueChange={(value) => {
								if (value === null) return;
								field.handleChange(value);
								const country = options.find((item) => item.code === value);
								if (country)
									form.setFieldValue("currencyCode", country.currencyCode);
							}}
							disabled={disabled}
						>
							<SelectTrigger
								id={field.name}
								aria-invalid={invalid}
								aria-describedby={invalid ? `${field.name}-error` : undefined}
								className="h-11 w-full rounded-xl"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{options.map((country) => (
									<SelectItem key={country.code} value={country.code}>
										{country.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{invalid ? (
							<FieldError id={`${field.name}-error`}>{error}</FieldError>
						) : null}
					</div>
				);
			}}
		</form.Field>
	);
}

function CurrencyField({
	form,
	disabled,
}: {
	form: FormApi;
	disabled: boolean;
}) {
	return (
		<form.Field name="currencyCode">
			{(field) => {
				const error = getFieldError(field.state.meta.errors);
				const invalid = field.state.meta.isTouched && Boolean(error);

				return (
					<div className="grid gap-2 sm:col-span-2">
						<Label htmlFor={field.name}>Account currency</Label>
						<Select
							value={field.state.value}
							onValueChange={(value) => {
								if (value !== null) field.handleChange(value);
							}}
							disabled={disabled}
						>
							<SelectTrigger
								id={field.name}
								aria-invalid={invalid}
								aria-describedby={invalid ? `${field.name}-error` : undefined}
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
						{invalid ? (
							<FieldError id={`${field.name}-error`}>{error}</FieldError>
						) : null}
					</div>
				);
			}}
		</form.Field>
	);
}

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
