import moduleUrl from '../../node_modules/extract-zip-rar/dist/extract.js?url';
import wasmURL from '../../node_modules/extract-zip-rar/dist/extract.wasm?url';

declare global {
	// eslint-disable-next-line no-var
	var wasmURL: string;
}

globalThis.wasmURL = wasmURL;
const { default: initialize } = await import(moduleUrl);
export const wasm = await initialize();
