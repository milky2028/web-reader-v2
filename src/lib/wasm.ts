import type init from 'extract-zip-rar';
import { dev } from '$app/environment';

import devModuleUrl from '../../node_modules/extract-zip-rar/dist/extract.debug.js?url';
import devWasmUrl from '../../node_modules/extract-zip-rar/dist/extract.debug.wasm?url';

declare global {
	// eslint-disable-next-line no-var
	var wasmURL: string;
}

globalThis.wasmURL = dev ? devWasmUrl : `/extract.wasm?url`;
const { default: initialize } = await import(dev ? devModuleUrl : '/extract.js?url');
const _initialize = initialize as typeof init;

export const wasm = await _initialize();
