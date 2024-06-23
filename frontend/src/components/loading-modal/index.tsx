import { useAtomValue } from "jotai";
import { backendQueryAtom } from "../../atoms";

import { Loader } from "../../icons/loader";

export function LoadingModal() {
	const backendQuery = useAtomValue(backendQueryAtom);

	return (
		<>
			{backendQuery.isLoading && (
				<>
					<div className="fixed z-30 left-0 top-0 w-screen h-screen bg-[rgba(0,0,0,0.5)]" />

					<div className="absolute  translate-x-[-50%] translate-y-[-50%] flex flex-col items-center gap-3 bg-zinc-50 dark:bg-zinc-800 z-40 top-2/4 px-4 py-5 max-w-[80vw] w-80 rounded-lg shadow-2xl border-[1.25px] border-zinc-300 dark:border-zinc-700 left-2/4">
						<Loader height={24} width={24} />

						<h3>{backendQuery.message}</h3>
					</div>
				</>
			)}
		</>
	);
}
