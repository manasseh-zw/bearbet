import { useEffect } from "react";
import { Toaster, toast } from "#/components/ui/toast";
import { subscribeToToasts } from "#/lib/toast-events";

export function ToastProvider() {
	useEffect(() => subscribeToToasts((event) => toast.add(event)), []);

	return <Toaster />;
}
