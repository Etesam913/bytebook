import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElem = document.getElementById("root");
if (!rootElem) {
	throw new Error("Root element not found");
}

const queryClient = new QueryClient();

ReactDOM.createRoot(rootElem).render(
	// <StrictMode>
	<QueryClientProvider client={queryClient}>
		<App />
	</QueryClientProvider>,
	//	</StrictMode>,
);
