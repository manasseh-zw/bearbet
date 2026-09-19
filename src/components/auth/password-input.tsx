import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useId, useState } from "react";

import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";

type PasswordInputProps = {
	autoComplete: string;
	error?: string;
	label: string;
	name: string;
	onBlur: () => void;
	onChange: (value: string) => void;
	value: string;
};

export function PasswordInput({
	autoComplete,
	error,
	label,
	name,
	onBlur,
	onChange,
	value,
}: PasswordInputProps) {
	const inputId = useId();
	const [visible, setVisible] = useState(false);
	const errorId = `${inputId}-error`;

	return (
		<div className="grid gap-2">
			<Label htmlFor={inputId}>{label}</Label>
			<div className="relative">
				<Input
					id={inputId}
					name={name}
					type={visible ? "text" : "password"}
					autoComplete={autoComplete}
					value={value}
					onBlur={onBlur}
					onChange={(event) => onChange(event.target.value)}
					aria-invalid={Boolean(error)}
					aria-describedby={error ? errorId : undefined}
					className="h-10 pr-10"
				/>
				<button
					type="button"
					className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={() => setVisible((current) => !current)}
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
			{error ? (
				<p id={errorId} className="text-xs text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</div>
	);
}

export function getFieldError(errors: unknown[]) {
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
