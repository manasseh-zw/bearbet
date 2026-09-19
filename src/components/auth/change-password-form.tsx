import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2Icon, LoaderCircleIcon } from "lucide-react";

import { getFieldError, PasswordInput } from "#/components/auth/password-input";
import { Button } from "#/components/ui/button";
import { changePassword } from "#/lib/auth-client";
import {
	type ChangePasswordFormInput,
	changePasswordFormSchema,
} from "#/lib/schemas/auth.schema";

const defaultValues: ChangePasswordFormInput = {
	currentPassword: "",
	password: "",
	confirmPassword: "",
};

export function ChangePasswordForm() {
	const passwordChange = useMutation({ mutationFn: changePassword });
	const form = useForm({
		defaultValues,
		validators: {
			onChange: changePasswordFormSchema,
			onSubmit: changePasswordFormSchema,
		},
		onSubmit: async ({ value }) => {
			await passwordChange.mutateAsync(value);
			form.setFieldValue("currentPassword", "");
			form.setFieldValue("password", "");
			form.setFieldValue("confirmPassword", "");
		},
	});

	return (
		<form
			className="grid gap-5"
			aria-busy={passwordChange.isPending}
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			noValidate
		>
			<fieldset disabled={passwordChange.isPending} className="grid gap-5">
				<form.Field name="currentPassword">
					{(field) => (
						<PasswordInput
							label="Current password"
							name={field.name}
							autoComplete="current-password"
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

				{passwordChange.error ? (
					<p className="text-sm text-destructive" role="alert">
						{passwordChange.error.message}
					</p>
				) : null}

				{passwordChange.isSuccess ? (
					<output
						className="flex items-center gap-2 text-sm text-primary"
						aria-live="polite"
					>
						<CheckCircle2Icon aria-hidden="true" />
						Password updated. Other active sessions were signed out.
					</output>
				) : null}

				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							className="w-full sm:w-fit"
							disabled={!canSubmit || isSubmitting || passwordChange.isPending}
						>
							{passwordChange.isPending ? (
								<LoaderCircleIcon className="animate-spin" aria-hidden="true" />
							) : null}
							{passwordChange.isPending
								? "Updating password..."
								: "Change password"}
						</Button>
					)}
				</form.Subscribe>
			</fieldset>
		</form>
	);
}
