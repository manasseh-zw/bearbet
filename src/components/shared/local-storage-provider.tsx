import {
	createContext,
	type PropsWithChildren,
	type ReactNode,
	useContext,
	useMemo,
} from "react";

type LocalStorageContextValue = {
	getItem: (key: string) => string | null;
	removeItem: (key: string) => void;
	setItem: (key: string, value: string) => void;
};

const LocalStorageContext = createContext<LocalStorageContextValue | null>(
	null,
);

export function LocalStorageProvider({
	children,
}: PropsWithChildren): ReactNode {
	const storage = useMemo<Storage | null>(() => {
		if (typeof window === "undefined") return null;

		try {
			return window.localStorage;
		} catch {
			return null;
		}
	}, []);
	const value = useMemo<LocalStorageContextValue>(
		() => ({
			getItem: (key) => {
				try {
					return storage?.getItem(key) ?? null;
				} catch {
					return null;
				}
			},
			removeItem: (key) => {
				try {
					storage?.removeItem(key);
				} catch {
					// Storage can be unavailable in private browsing contexts.
				}
			},
			setItem: (key, nextValue) => {
				try {
					storage?.setItem(key, nextValue);
				} catch {
					// Storage can be unavailable or full.
				}
			},
		}),
		[storage],
	);

	return (
		<LocalStorageContext.Provider value={value}>
			{children}
		</LocalStorageContext.Provider>
	);
}

export function useLocalStorage(): LocalStorageContextValue {
	const context = useContext(LocalStorageContext);
	if (!context) {
		throw new Error("useLocalStorage must be used within LocalStorageProvider");
	}
	return context;
}
