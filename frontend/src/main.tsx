import {
	MutationCache,
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { toast } from "sonner";
import { DEFAULT_SONNER_OPTIONS } from "./utils/general.ts";
import { QueryError } from "./utils/query.ts";

const rootElem = document.getElementById("root");
if (!rootElem) {
	throw new Error("Root element not found");
}

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => {
			if (error instanceof QueryError) {
				toast.error(error.message, DEFAULT_SONNER_OPTIONS);
			}
		},
	}),
	mutationCache: new MutationCache({
		onError: (error) => {
			if (error instanceof QueryError) {
				toast.error(error.message, DEFAULT_SONNER_OPTIONS);
			}
		},
	}),
});

ReactDOM.createRoot(rootElem).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</StrictMode>,
);
