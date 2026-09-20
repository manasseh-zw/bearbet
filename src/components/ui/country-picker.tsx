import { Combobox } from "@base-ui/react/combobox";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { forwardRef } from "react";
import { CircleFlag, countries as flagCountries } from "react-circle-flags";

import type { CountryOption } from "#/lib/country-data";
import { cn } from "#/lib/utils";

export type CountryPickerProps = {
	value: string | null;
	onValueChange: (value: string) => void;
	options: readonly CountryOption[];
	name?: string;
	id?: string;
	disabled?: boolean;
	placeholder?: string;
	invalid?: boolean;
	"aria-describedby"?: string;
	onBlur?: () => void;
	className?: string;
};

export const CountryPicker = forwardRef<HTMLButtonElement, CountryPickerProps>(
	function CountryPicker(
		{
			value,
			onValueChange,
			options,
			name,
			id,
			disabled,
			placeholder = "Select a country",
			invalid,
			"aria-describedby": ariaDescribedBy,
			onBlur,
			className,
		},
		ref,
	) {
		const selectedCountry = options.find((country) => country.alpha2 === value);

		return (
			<Combobox.Root
				items={options}
				value={selectedCountry ?? null}
				name={name}
				disabled={disabled}
				itemToStringLabel={(country) => country.name}
				itemToStringValue={(country) => country.alpha2}
				isItemEqualToValue={(left, right) => left.alpha2 === right.alpha2}
				onValueChange={(country) => {
					if (country) onValueChange(country.alpha2);
				}}
			>
				<Combobox.Trigger
					ref={ref}
					id={id}
					className={cn(
						"flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-transparent bg-input/50 px-3 text-sm transition-[color,box-shadow] duration-200 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
						className,
					)}
					aria-invalid={invalid}
					aria-describedby={ariaDescribedBy}
					onBlur={onBlur}
				>
					<Combobox.Value placeholder={placeholder}>
						{(country: CountryOption | null) =>
							country ? (
								<span className="flex min-w-0 items-center gap-2">
									<CountryFlag country={country} />
									<span className="truncate">{country.name}</span>
								</span>
							) : (
								<span className="text-muted-foreground">{placeholder}</span>
							)
						}
					</Combobox.Value>
					<Combobox.Icon className="shrink-0 text-muted-foreground [&>svg:not([class*='size-'])]:size-4">
						<ChevronDownIcon aria-hidden="true" />
					</Combobox.Icon>
				</Combobox.Trigger>

				<Combobox.Portal>
					<Combobox.Positioner
						align="start"
						sideOffset={6}
						className="z-50 outline-none"
					>
						<Combobox.Popup
							className="w-(--anchor-width) max-w-[calc(100vw-2rem)] min-w-72 origin-(--transform-origin) overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none transition-[scale,opacity] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0"
							aria-label="Select country"
						>
							<div className="relative border-b border-border">
								<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground [&_svg:not([class*='size-'])]:size-4">
									<SearchIcon aria-hidden="true" />
								</span>
								<Combobox.Input
									placeholder="Search by country name"
									className="h-11 w-full bg-transparent px-10 text-sm outline-none placeholder:text-muted-foreground"
								/>
							</div>
							<Combobox.Empty>
								<p className="px-3 py-6 text-center text-sm text-muted-foreground">
									No country found. Try a different search.
								</p>
							</Combobox.Empty>
							<Combobox.List className="max-h-[min(18rem,var(--available-height))] overflow-y-auto overscroll-contain p-1 outline-none">
								{(country: CountryOption) => (
									<Combobox.Item
										key={country.alpha2}
										value={country}
										className="flex min-w-0 cursor-default items-center gap-3 rounded-xl px-2 py-2 text-sm outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
									>
										<CountryFlag country={country} />
										<span className="min-w-0 flex-1 truncate">
											{country.name}
										</span>
										<span className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
											{country.alpha2}
										</span>
										<Combobox.ItemIndicator className="flex size-4 shrink-0 items-center justify-center text-primary">
											<CheckIcon aria-hidden="true" />
										</Combobox.ItemIndicator>
									</Combobox.Item>
								)}
							</Combobox.List>
						</Combobox.Popup>
					</Combobox.Positioner>
				</Combobox.Portal>
			</Combobox.Root>
		);
	},
);

function CountryFlag({ country }: { country: CountryOption }) {
	const countryCode = country.alpha2.toLowerCase();

	return (
		<span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm leading-none">
			{flagCountries[countryCode] ? (
				<CircleFlag countryCode={countryCode} height={20} aria-hidden="true" />
			) : (
				<span aria-hidden="true">{country.emoji}</span>
			)}
		</span>
	);
}
