import { allocateFile } from '$lib/allocateFile';
import type {
	ExtractBookParamsPayload,
	ExtractBookReturnInitalizationPayload
} from '$lib/extractBook';
import { writeFile } from '$lib/filesystem/writeFile';
import { range } from '$lib/range';

self.addEventListener(
	'message',
	async ({ data: { file, bookName } }: MessageEvent<ExtractBookParamsPayload>) => {
		const [{ readArchiveEntries }, wasmFile] = await Promise.all([
			import('$lib/readArchiveEntries'),
			allocateFile(file),
			writeFile(`/books/${bookName}/archive`, file)
		]);

		const pages = [...readArchiveEntries({ file: wasmFile })]
			.map((entry) => entry?.fileName)
			.filter((fileName): fileName is string => fileName !== undefined)
			.sort();

		const entry_iterator = readArchiveEntries({ file: wasmFile, extractData: true });

		// handle cases where cover is not the first file in the archive
		const maybeCover = entry_iterator.next().value;
		const initialPages = range({ start: 1, end: Math.min(12, pages.length) }).map(async () => {
			const page = entry_iterator.next().value;
			if (page?.file) {
				await writeFile(`/books/${bookName}/${page.fileName}`, page.file);
				return page.fileName;
			}

			return '';
		});
		await Promise.all(initialPages);

		if (maybeCover?.file) {
			await writeFile(`/books/${bookName}/${maybeCover.fileName}`, maybeCover.file);
			const payload: ExtractBookReturnInitalizationPayload = {
				messageType: 'initialization',
				pageNames: pages,
				coverFile: maybeCover.file
			};
			self.postMessage(payload);
		}

		wasmFile.free();
		postMessage({});
	}
);
