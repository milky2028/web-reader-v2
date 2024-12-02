// import type init from '../../node_modules/extract-zip-rar/dist/index';

// import devModuleUrl from '../../node_modules/extract-zip-rar/dist/extract.debug.js?url';
// import devWasmUrl from '../../node_modules/extract-zip-rar/dist/extract.debug.wasm?url';

// import prodModuleUrl from '../../node_modules/extract-zip-rar/dist/extract.js?url';
// import prodWasmUrl from '../../node_modules/extract-zip-rar/dist/extract.wasm?url';

import type init from '../../node_modules/extract-zip-rar/dist/index-native';

import devModuleUrl from '../../node_modules/extract-zip-rar/dist/native.debug.js?url';
import devWorkerUrl from '../../node_modules/extract-zip-rar/dist/native.debug.worker.mjs?url';
import devWasmUrl from '../../node_modules/extract-zip-rar/dist/native.debug.wasm?url';

import prodModuleUrl from '../../node_modules/extract-zip-rar/dist/native.js?url';
import prodWorkerUrl from '../../node_modules/extract-zip-rar/dist/native.worker.mjs?url';
import prodWasmUrl from '../../node_modules/extract-zip-rar/dist/native.wasm?url';

declare global {
	// eslint-disable-next-line no-var
	var wasmURL: string;
	// eslint-disable-next-line no-var
	var workerURL: string;
}

globalThis.wasmURL = __IS_DEV__ ? devWasmUrl : prodWasmUrl;
globalThis.workerURL = __IS_DEV__ ? devWorkerUrl : prodWorkerUrl;

export const wasm = import(__IS_DEV__ ? devModuleUrl : prodModuleUrl).then(
	({ default: initialize }) => {
		const _initialize = initialize as typeof init;
		return _initialize();
	}
);
