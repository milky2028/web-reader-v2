// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

type LaunchParams = {
	files: FileSystemFileHandle[];
	targetURL: string;
};

declare global {
	interface Window {
		launchQueue: {
			setConsumer: (callback: (launchParams: LaunchParams) => void) => void;
		};
	}
}

export {};
