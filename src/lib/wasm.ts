import initialize from 'extract-zip-rar';
import wasmURL from '../../node_modules/extract-zip-rar/dist/extract.wasm?url';

declare global {
	// eslint-disable-next-line no-var
	var wasmURL: string;
}

globalThis.wasmURL = wasmURL;
export const wasm = await initialize();
