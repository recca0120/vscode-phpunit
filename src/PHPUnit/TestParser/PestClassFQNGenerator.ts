import { basename, dirname, join, relative } from 'node:path';
import { capitalize } from '../utils';

export function generatePestClassFQN(root: string, file: string): string {
    let relativePath = relative(root, file);
    let baseName = basename(file, '.php');
    const dotPos = baseName.lastIndexOf('.');
    if (dotPos !== -1) {
        baseName = baseName.substring(0, dotPos);
    }
    relativePath = join(capitalize(dirname(relativePath)), baseName).replace(/\//g, '\\');
    relativePath = relativePath.replace(/%[a-fA-F0-9][a-fA-F0-9]/g, '');
    relativePath = relativePath.replace(/\\'|\\"/g, '');
    relativePath = relativePath.replace(/[^A-Za-z0-9\\]/g, '');

    return `P\\${relativePath}`;
}
