import { basename, dirname, join, relative } from 'node:path';
import { PEST_PREFIX } from '../types';
import { capitalize } from '../utils';

function sanitizeForClassName(value: string): string {
    return value
        .replace(/%[a-fA-F0-9][a-fA-F0-9]/g, '')
        .replace(/\\'|\\"/g, '')
        .replace(/[^A-Za-z0-9\\]/g, '');
}

export function generatePestClassFQN(root: string, file: string): string {
    let baseName = basename(file, '.php');
    const dotPos = baseName.lastIndexOf('.');
    if (dotPos !== -1) {
        baseName = baseName.substring(0, dotPos);
    }
    const relativePath = join(capitalize(dirname(relative(root, file))), baseName).replace(
        /\//g,
        '\\',
    );

    return `${PEST_PREFIX}${sanitizeForClassName(relativePath)}`;
}
