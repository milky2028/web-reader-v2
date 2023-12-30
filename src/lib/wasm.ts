import initialize from 'extract-zip-rar';
import workerURL from '../../node_modules/extract-zip-rar/dist/extract.worker.js?url';
import wasmURL from '../../node_modules/extract-zip-rar/dist/extract.wasm?url';

declare global {
	// eslint-disable-next-line no-var
	var workerURL: string;
	// eslint-disable-next-line no-var
	var wasmURL: string;
}

globalThis.workerURL = workerURL;
globalThis.wasmURL = wasmURL;

export const wasm = await initialize();
