import { Link } from "wouter";
import { getDefaultButtonVariants } from "../../animations";
import { MotionIconButton } from "../../components/buttons";
import { CircleArrowLeft } from "../../icons/circle-arrow-left";

export function SettingsPage() {
	return (
		<div className="px-2 pb-2">
			<header className="flex gap-1 items-center">
				<Link to="/">
					<MotionIconButton
						{...getDefaultButtonVariants()}
						title="Go Back"
						onClick={() => window.history.back()}
					>
						<CircleArrowLeft title="Go Back" />
					</MotionIconButton>
				</Link>
				Settings
			</header>
		</div>
	);
}
