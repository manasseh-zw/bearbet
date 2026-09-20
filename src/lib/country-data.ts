import {
	countries as countryData,
	currencies as currencyData,
} from "country-data-list";

export type CountryOption = {
	alpha2: string;
	alpha3: string;
	countryCallingCodes?: string[];
	currencies: string[];
	emoji?: string;
	ioc?: string;
	languages: string[];
	name: string;
	status?: string;
};
export type CurrencyOption = {
	code: string;
	decimals: number;
	name: string;
	number: string;
	symbol?: string;
};

export const countryOptions: CountryOption[] = countryData.all
	.filter(
		(country) => country.alpha2 && country.name && country.status !== "deleted",
	)
	.sort((left, right) => left.name.localeCompare(right.name));

export const currencyOptions: CurrencyOption[] = currencyData.all
	.filter((currency) => currency.code && currency.name)
	.map((currency) => ({
		...currency,
		symbol: (currency as typeof currency & { symbol?: string }).symbol,
	}))
	.sort((left, right) => left.name.localeCompare(right.name));

export function getCurrencyOption(code: string) {
	return currencyOptions.find((currency) => currency.code === code);
}
