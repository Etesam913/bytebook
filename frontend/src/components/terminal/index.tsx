import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";

export function TerminalComponent() {
	const terminalRef = useRef<HTMLDivElement | null>(null);
	const term = useRef<Terminal | null>(null);
	const fitAddon = useRef<FitAddon | null>(null);

	useEffect(() => {
		// Initialize the terminal
		term.current = new Terminal({
			cursorBlink: true,
			cols: 80,
			rows: 24,
			fontFamily: '"Fira Code", monospace',
			fontSize: 14,
			theme: {
				background: "#1e1e1e",
				foreground: "#ffffff",
			},
		});

		// Add the fit addon.
		fitAddon.current = new FitAddon();
		term.current.loadAddon(fitAddon.current);

		if (!terminalRef.current) {
			return;
		}
		// Open the terminal in the terminalRef div
		term.current.open(terminalRef.current);

		// Fit the terminal to the container size
		fitAddon.current.fit();

		// Handle data from xterm and send it to backend
		term.current.onData((data) => {
			console.log(data);
		});

		// Handle terminal resize
		function handleResize() {
			if (!fitAddon.current) return;
			fitAddon.current.fit();
		}

		window.addEventListener("resize", handleResize);

		// Cleanup on component unmount
		return () => {
			window.removeEventListener("resize", handleResize);
			if (fitAddon.current) fitAddon.current.dispose();
			if (term.current) term.current.dispose();
		};
	}, [terminalRef]);

	return <div className="w-full h-48 bg-zinc-200" ref={terminalRef} />;
}
