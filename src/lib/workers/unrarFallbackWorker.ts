/// <reference lib="WebWorker" />;

declare global {
	interface Window {
		readRARContent: () => null;
	}
}

importScripts('/libunrar.js');

const unrar = self.readRARContent as () => null;

self.addEventListener('message', (event) => {
	console.log(event);
	console.log('invoking message worker');

	unrar();
});
