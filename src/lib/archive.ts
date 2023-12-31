import { Archive as libarchive } from 'libarchive.js';
import { CompressedFile as libarchiveCompressedFile } from 'libarchive.js/src/compressed-file';
import workerUrl from '../../node_modules/libarchive.js/dist/worker-bundle.js?url';

libarchive.init({ workerUrl });

export type FilesArrayObject = { file: File | libarchiveCompressedFile; path: string };
export const CompressedFile = libarchiveCompressedFile;
export const Archive = libarchive;
