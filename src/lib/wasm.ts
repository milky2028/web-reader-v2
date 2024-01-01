import type init from 'extract-zip-rar';

import devModuleUrl from '../../node_modules/extract-zip-rar/dist/extract.debug.js?url';
import devWasmUrl from '../../node_modules/extract-zip-rar/dist/extract.debug.wasm?url';

import prodModuleUrl from '../../node_modules/extract-zip-rar/dist/extract.js?url';
import prodWasmUrl from '../../node_modules/extract-zip-rar/dist/extract.wasm?url';

declare global {
	// eslint-disable-next-line no-var
	var wasmURL: string;
}

globalThis.wasmURL = __IS_DEV__ ? devWasmUrl : prodWasmUrl;
const { default: initialize } = await import(__IS_DEV__ ? devModuleUrl : prodModuleUrl);
const _initialize = initialize as typeof init;

export const wasm = await _initialize();
