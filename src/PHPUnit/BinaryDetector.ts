import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function detectBinary(cwd: string): Promise<string> {
    try {
        const content = await readFile(join(cwd, 'composer.json'), 'utf-8');
        const composer = JSON.parse(content);
        const deps = { ...composer.require, ...composer['require-dev'] };
        if ('pestphp/pest' in deps) {
            return 'vendor/bin/pest';
        }
    } catch {
        // composer.json not found or not parseable
    }

    return 'vendor/bin/phpunit';
}
