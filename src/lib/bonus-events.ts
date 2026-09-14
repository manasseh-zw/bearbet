export type BonusCompletionEvent = {
	awardId: string;
	convertedAmountMinor: number;
	currencyCode: string;
};

type BonusCompletionListener = (event: BonusCompletionEvent) => void;

const listeners = new Set<BonusCompletionListener>();

export function emitBonusCompletion(event: BonusCompletionEvent) {
	for (const listener of listeners) listener(event);
}

export function subscribeToBonusCompletions(listener: BonusCompletionListener) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
