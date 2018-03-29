export * from './contract';
export * from './common';
export * from './posix';
export * from './windows';
export * from './adapter';

import {FilesystemContract} from './contract';
import {Adapter} from './adapter';

export class Filesystem extends Adapter {}

export const files: FilesystemContract = new Filesystem();
export default files;