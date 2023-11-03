/// <reference lib="WebWorker" />;

importScripts('/libunrar.js');

type UnrarInput = MessageEvent<{ compressedFile: File; id: string }>;

self.addEventListener('message', async ({ data: { compressedFile, id } }: UnrarInput) => {
	const buffer = await compressedFile.arrayBuffer();
	const bytes = new Uint8Array(buffer);

	const response = self.readRARContent([{ name: compressedFile.name, content: bytes }]);
	self.postMessage({ returnVal: response, id });
});
