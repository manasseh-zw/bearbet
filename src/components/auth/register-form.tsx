import { useForm, useStore } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CalendarDaysIcon,
	ChevronDownIcon,
	EyeIcon,
	EyeOffIcon,
	LoaderCircleIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useId, useMemo, useState } from "react";
import { z } from "zod";

import { AuthLayout } from "#/components/auth/auth-layout";
import {
	type RegistrationDraft,
	type RegistrationDraftValues,
	registrationDraftKey,
	useRegistrationDraftStorage,
} from "#/components/auth/registration-draft-storage";
import { WheelPicker } from "#/components/motion/wheel-picker";
import { Logo } from "#/components/shared/brand";
import { useLocalStorage } from "#/components/shared/local-storage-provider";
import { Button } from "#/components/ui/button";
import { CountryPicker } from "#/components/ui/country-picker";
import { CurrencySelect } from "#/components/ui/currency-select";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#/components/ui/popover";
import { registerPlayer } from "#/lib/auth-client";
import { countryOptions, getCurrencyOption } from "#/lib/country-data";
import {
	MINIMUM_PLAYER_AGE,
	type RegistrationFormInput,
	registrationFormSchema,
	supportedCurrencies,
} from "#/lib/schemas/auth.schema";
import { cn } from "#/lib/utils";

const supportedCurrencyOptions = supportedCurrencies.flatMap((code) => {
	const currency = getCurrencyOption(code);
	return currency ? [currency] : [];
});

const birthMonthFormatter = new Intl.DateTimeFormat("en-US", {
	month: "long",
	timeZone: "UTC",
});
const birthDateFormatter = new Intl.DateTimeFormat("en-US", {
	month: "long",
	day: "numeric",
	year: "numeric",
	timeZone: "UTC",
});
const currentYear = new Date().getUTCFullYear();
const birthMonthOptions = Array.from({ length: 12 }, (_, index) => {
	const month = index + 1;
	return {
		label: birthMonthFormatter.format(new Date(Date.UTC(2024, index, 1))),
		value: String(month).padStart(2, "0"),
	};
});
const birthYearOptions = Array.from(
	{ length: 120 - MINIMUM_PLAYER_AGE + 1 },
	(_, index) => {
		const year = currentYear - 120 + index;
		return { label: String(year), value: String(year) };
	},
);

type DateParts = {
	year: string;
	month: string;
	day: string;
};

const fallbackBirthDate: DateParts = {
	year: String(currentYear - 25),
	month: "01",
	day: "01",
};

function parseBirthDate(value: string): DateParts | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const date = new Date(Date.UTC(year, month - 1, day));

	if (
		date.getUTCFullYear() !== year ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== day
	) {
		return null;
	}

	return {
		year: String(year),
		month: String(month).padStart(2, "0"),
		day: String(day).padStart(2, "0"),
	};
}

function daysInMonth(year: number, month: number) {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatBirthDate(value: string) {
	const parts = parseBirthDate(value);
	if (!parts) return null;

	return birthDateFormatter.format(
		new Date(
			Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
		),
	);
}

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
	},
	{
		title: "Set up your account",
	},
	{
		title: "Finish your profile",
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
	const [promoCode, setPromoCode] = useState("");
	const [step, setStep] = useState<RegistrationStep>(0);
	const [direction, setDirection] = useState<1 | -1>(1);
	const [stepError, setStepError] = useState<string | null>(null);
	const shouldReduceMotion = useReducedMotion();
	const storage = useLocalStorage();

	const registration = useMutation({
		mutationFn: registerPlayer,
		onSuccess: async () => {
			storage.removeItem(registrationDraftKey);
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
			currencyCode: state.values
				.currencyCode as RegistrationDraftValues["currencyCode"],
		}),
		areDraftValuesEqual,
	);

	const currentDraft = useMemo<RegistrationDraft>(
		() => ({ ...draftValues, promoCode, step }),
		[draftValues, promoCode, step],
	);
	const restoreDraft = useCallback(
		(draft: RegistrationDraft) => {
			const restoredValues: RegistrationDraftValues = {
				firstName: draft.firstName ?? defaultValues.firstName,
				lastName: draft.lastName ?? defaultValues.lastName,
				username: draft.username ?? defaultValues.username,
				email: draft.email ?? defaultValues.email,
				dateOfBirth: draft.dateOfBirth ?? defaultValues.dateOfBirth,
				countryCode: draft.countryCode ?? defaultValues.countryCode,
				currencyCode: (draft.currencyCode ??
					defaultValues.currencyCode) as RegistrationDraftValues["currencyCode"],
			};
			const restoreOptions = {
				dontUpdateMeta: true,
				dontRunListeners: true,
				dontValidate: true,
			};

			for (const field of draftValueFields) {
				form.setFieldValue(field, restoredValues[field], restoreOptions);
			}

			setPromoCode(draft.promoCode ?? "");
			// Passwords are intentionally never stored, so resume at the account
			// step if a draft had already reached the profile step.
			setStep(Math.min(draft.step ?? 0, 1) as RegistrationStep);
		},
		[form],
	);
	const hasDraft = useCallback(
		(draft: RegistrationDraft) =>
			(draft.step ?? 0) > 0 ||
			Boolean(draft.firstName) ||
			Boolean(draft.lastName) ||
			Boolean(draft.promoCode) ||
			Boolean(draft.username) ||
			Boolean(draft.email) ||
			Boolean(draft.dateOfBirth) ||
			draft.countryCode !== defaultValues.countryCode ||
			draft.currencyCode !== defaultValues.currencyCode,
		[],
	);

	useRegistrationDraftStorage({
		draft: currentDraft,
		hasDraft,
		onRestore: restoreDraft,
	});

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
				<div>
					<Link to="/" aria-label="BearBet home" className="inline-flex">
						<Logo className="text-2xl" />
					</Link>
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
						<div>
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
									<div className="grid gap-4 sm:grid-cols-2">
										{step === 0 ? (
											<>
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
												<div className="grid gap-2 sm:col-span-2">
													<div className="flex items-center justify-between gap-4">
														<Label htmlFor="promoCode">Promo code</Label>
														<span className="text-xs text-muted-foreground">
															Optional
														</span>
													</div>
													<Input
														id="promoCode"
														name="promoCode"
														type="text"
														autoComplete="off"
														maxLength={64}
														value={promoCode}
														onChange={(event) =>
															setPromoCode(event.target.value)
														}
														aria-describedby="promoCode-help"
														className="h-11 rounded-xl"
													/>
													<p
														id="promoCode-help"
														className="text-xs text-muted-foreground"
													>
														Promo code support is coming soon.
													</p>
												</div>
											</>
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
												<DateOfBirthField
													form={form}
													disabled={registration.isPending}
												/>
												<CountryField
													form={form}
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
	disabled,
}: {
	form: FormApi;
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
						<CountryPicker
							value={field.state.value}
							options={countryOptions}
							onValueChange={(value) => {
								field.handleChange(value);
								const country = countryOptions.find(
									(item) => item.alpha2 === value,
								);
								const countryCurrency = country?.currencies.find((code) =>
									supportedCurrencies.includes(
										code as (typeof supportedCurrencies)[number],
									),
								);
								if (countryCurrency)
									form.setFieldValue("currencyCode", countryCurrency);
							}}
							disabled={disabled}
							id={field.name}
							name={field.name}
							invalid={invalid}
							aria-describedby={invalid ? `${field.name}-error` : undefined}
							onBlur={field.handleBlur}
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
						<CurrencySelect
							value={field.state.value}
							options={supportedCurrencyOptions}
							onValueChange={(value) => {
								field.handleChange(value);
							}}
							disabled={disabled}
							id={field.name}
							name={field.name}
							invalid={invalid}
							aria-describedby={invalid ? `${field.name}-error` : undefined}
							onBlur={field.handleBlur}
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

function DateOfBirthField({
	form,
	disabled,
}: {
	form: FormApi;
	disabled: boolean;
}) {
	const [open, setOpen] = useState(false);

	return (
		<form.Field name="dateOfBirth">
			{(field) => {
				const error = getFieldError(field.state.meta.errors);
				const invalid = field.state.meta.isTouched && Boolean(error);
				const selected = parseBirthDate(field.state.value) ?? fallbackBirthDate;
				const dayOptions = Array.from(
					{
						length: daysInMonth(Number(selected.year), Number(selected.month)),
					},
					(_, index) => {
						const day = index + 1;
						return {
							label: String(day),
							value: String(day).padStart(2, "0"),
						};
					},
				);
				const displayDate = formatBirthDate(field.state.value);

				function updateDate(changes: Partial<DateParts>) {
					const year = changes.year ?? selected.year;
					const month = changes.month ?? selected.month;
					const day = Math.min(
						Number(changes.day ?? selected.day),
						daysInMonth(Number(year), Number(month)),
					);

					field.handleChange(
						`${year}-${month}-${String(day).padStart(2, "0")}`,
					);
				}

				return (
					<div className="grid gap-2">
						<Label htmlFor={`${field.name}-picker`}>Date of birth</Label>
						<Popover open={open} onOpenChange={setOpen}>
							<PopoverTrigger
								render={
									<Button
										id={`${field.name}-picker`}
										type="button"
										variant="outline"
										disabled={disabled}
										onBlur={field.handleBlur}
										aria-invalid={invalid}
										aria-describedby={
											invalid ? `${field.name}-error` : undefined
										}
										className="h-11 w-full justify-between rounded-xl px-3 font-normal"
									/>
								}
							>
								<CalendarDaysIcon data-icon="inline-start" aria-hidden="true" />
								<span
									className={cn(
										"truncate",
										!displayDate && "text-muted-foreground",
									)}
								>
									{displayDate ?? "Select your date of birth"}
								</span>
								<ChevronDownIcon data-icon="inline-end" aria-hidden="true" />
							</PopoverTrigger>
							<PopoverContent
								align="start"
								className="w-[min(24rem,calc(100vw-2rem))] rounded-2xl p-2"
							>
								<div className="grid grid-cols-[minmax(0,1.15fr)_minmax(2.75rem,0.42fr)_minmax(4rem,0.62fr)] gap-2">
									<WheelPicker
										options={birthMonthOptions}
										value={selected.month}
										onValueChange={(month) => updateDate({ month })}
										itemHeight={40}
										aria-label="Birth month"
										className="w-full"
									/>
									<WheelPicker
										options={dayOptions}
										value={selected.day}
										onValueChange={(day) => updateDate({ day })}
										itemHeight={40}
										aria-label="Birth day"
										className="w-full"
									/>
									<WheelPicker
										options={birthYearOptions}
										value={selected.year}
										onValueChange={(year) => updateDate({ year })}
										itemHeight={40}
										aria-label="Birth year"
										className="w-full"
									/>
								</div>
							</PopoverContent>
						</Popover>
						{invalid ? (
							<FieldError id={`${field.name}-error`}>{error}</FieldError>
						) : null}
					</div>
				);
			}}
		</form.Field>
	);
}

type TextFieldName = "firstName" | "lastName" | "username" | "email";

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
