import { Archive as libarchive } from 'libarchive.js';
import { CompressedFile as libarchiveCompressedFile } from 'libarchive.js/src/compressed-file';

libarchive.init({ workerUrl: '/worker-bundle.js' });

export type FilesArrayObject = { file: File | libarchiveCompressedFile; path: string };
export const CompressedFile = libarchiveCompressedFile;
export const Archive = libarchive;
