import {
	QueryCache,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { QueryError } from "./utils/query.ts";

const rootElem = document.getElementById("root");
if (!rootElem) {
	throw new Error("Root element not found");
}

const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error) => {
			if (error instanceof QueryError) {
				console.error("cool", error.message);
			}
			console.error("reg", error);
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
