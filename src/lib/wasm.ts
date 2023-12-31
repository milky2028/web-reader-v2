import type init from 'extract-zip-rar';
import moduleUrl from '../../node_modules/extract-zip-rar/dist/extract.js?url';
import wasmURL from '../../node_modules/extract-zip-rar/dist/extract.wasm?url';

declare global {
	// eslint-disable-next-line no-var
	var wasmURL: string;
}

globalThis.wasmURL = wasmURL;
const { default: initialize } = await import(moduleUrl);
const _initialize = initialize as typeof init;

export const wasm = await _initialize();
