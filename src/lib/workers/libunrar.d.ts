declare global {
	type UnrarData = {
		name: string;
		content: Uint8Array;
	};

	type ProgressCallback = (
		currentFileName: string,
		currentFileSize: number,
		amountProcessed: number
	) => void;

	type UnrarFile = {
		type: 'file';
		fullFileName: string;
		fileSize: number;
		fileContent: Uint8Array;
	};

	type UnrarDirectory = { type: 'dir'; ls: UnrarFile | UnrarDirectory };

	interface Window {
		readRARContent: (
			data: UnrarData[],
			password?: string,
			progresCallback?: ProgressCallback
		) => UnrarDirectory;
	}
}

export {};
