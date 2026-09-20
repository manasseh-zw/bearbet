import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import type { CurrencyOption } from "#/lib/country-data";

export type CurrencySelectProps = {
	value: string | null;
	onValueChange: (value: string) => void;
	options: readonly CurrencyOption[];
	name?: string;
	id?: string;
	disabled?: boolean;
	placeholder?: string;
	invalid?: boolean;
	"aria-describedby"?: string;
	onBlur?: () => void;
};

export function CurrencySelect({
	value,
	onValueChange,
	options,
	name,
	id,
	disabled,
	placeholder = "Choose a currency",
	invalid,
	"aria-describedby": ariaDescribedBy,
	onBlur,
}: CurrencySelectProps) {
	return (
		<Select
			value={value}
			onValueChange={(nextValue) => {
				if (nextValue) onValueChange(nextValue);
			}}
			disabled={disabled}
			name={name}
		>
			<SelectTrigger
				id={id}
				aria-invalid={invalid}
				aria-describedby={ariaDescribedBy}
				onBlur={onBlur}
				className="h-11 w-full rounded-xl"
			>
				<SelectValue placeholder={placeholder}>
					{(selectedValue: string | null) => {
						const currency = options.find(
							(option) => option.code === selectedValue,
						);

						return currency ? (
							<span className="flex min-w-0 items-center gap-2">
								<span className="text-sm font-semibold text-primary">
									{currency.code}
								</span>
								<span className="truncate">{currency.name}</span>
							</span>
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						);
					}}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{options.map((currency) => (
						<SelectItem key={currency.code} value={currency.code}>
							<span className="flex min-w-0 items-center gap-3">
								<span className="w-9 shrink-0 text-xs font-semibold tracking-[0.08em] text-primary uppercase">
									{currency.code}
								</span>
								<span className="truncate">{currency.name}</span>
								{currency.symbol ? (
									<span className="ml-auto text-muted-foreground">
										{currency.symbol}
									</span>
								) : null}
							</span>
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
