export type ToastEvent = {
	title: string;
	description?: string;
};

type ToastEventListener = (event: ToastEvent) => void;

const listeners = new Set<ToastEventListener>();

export function emitToast(event: ToastEvent) {
	for (const listener of listeners) listener(event);
}

export function subscribeToToasts(listener: ToastEventListener) {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}
