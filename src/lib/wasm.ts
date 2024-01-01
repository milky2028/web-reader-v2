import { dev } from '$app/environment';
import type init from 'extract-zip-rar';

const path = dev ? '.debug' : '';

const { default: moduleURL } = await import(
	`../../node_modules/extract-zip-rar/dist/extract${path}.js?url`
);
const { default: wasmURL } = await import(
	`../../node_modules/extract-zip-rar/dist/extract${path}.wasm?url`
);

declare global {
	// eslint-disable-next-line no-var
	var wasmURL: string;
}

globalThis.wasmURL = wasmURL;
const { default: initialize } = await import(moduleURL);
const _initialize = initialize as typeof init;

export const wasm = await _initialize();
