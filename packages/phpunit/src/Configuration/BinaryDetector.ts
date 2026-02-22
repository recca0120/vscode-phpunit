import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export class BinaryDetector {
    constructor(private cwd: string = process.cwd()) {}

    detect(): string {
        try {
            const content = readFileSync(join(this.cwd, 'composer.json'), 'utf-8');
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
}
