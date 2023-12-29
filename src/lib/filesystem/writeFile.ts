import { getFileHandle } from './getFileHandle';

// type Thread = {
// 	worker: Worker;
// 	tasks: number;
// 	channel: BroadcastChannel;
// 	timeout: number;
// };

// create a new worker in order to write a file until we hit the limit. Give each worker a number of tasks, then give the task to the worker with the lowest number of tasks

// function offloadTask(workerUrl: URL) {
// 	const threads: Thread[] = [];

// 	return {
// 		worker: new Worker(new URL('../workers/fileWriter', import.meta.url), {
// 			type: 'module'
// 		}),
// 		tasks: 0,
// 		channel: new BroadcastChannel(`${name}-${threadNumber}`)
// 	};
// }

// const threads: Thread[] = [];

// const THREAD_POOL_LIMIT = navigator.hardwareConcurrency || 4;

type WriteResponseEvent = MessageEvent<{ returnVal: 'completed' | 'failed' | string; id: string }>;
let worker: Worker | undefined;

export async function writeFile(path: string, file: File) {
	const fileHandle = await getFileHandle(path, { create: true });
	if ('createWritable' in fileHandle) {
		const writer = await fileHandle.createWritable();
		return file.stream().pipeTo(writer);
	}

	const id = crypto.randomUUID();
	return new Promise<void>((resolve, reject) => {
		if (!worker) {
			worker = new Worker(new URL('../workers/fileWriter', import.meta.url), {
				type: 'module'
			});

			worker.addEventListener(
				'message',
				({ data: { returnVal, id: responseId } }: WriteResponseEvent) => {
					if (responseId === id) {
						if (returnVal === 'completed') {
							resolve();
						} else {
							reject(new Error(returnVal));
						}
					}
				}
			);
		}

		worker.postMessage({ path, file, id });
	});
}
