import type init from '../../node_modules/extract-zip-rar/dist/index';

import devModuleUrl from '../../node_modules/extract-zip-rar/dist/extract.debug.js?url';
import devWasmUrl from '../../node_modules/extract-zip-rar/dist/extract.debug.wasm?url';

import prodModuleUrl from '../../node_modules/extract-zip-rar/dist/extract.js?url';
import prodWasmUrl from '../../node_modules/extract-zip-rar/dist/extract.wasm?url';

declare global {
	// eslint-disable-next-line no-var
	var wasmURL: string;
}

globalThis.wasmURL = __IS_DEV__ ? devWasmUrl : prodWasmUrl;

export const wasm = import(__IS_DEV__ ? devModuleUrl : prodModuleUrl).then(
	({ default: initialize }) => {
		const _initialize = initialize as typeof init;
		return _initialize();
	}
);
