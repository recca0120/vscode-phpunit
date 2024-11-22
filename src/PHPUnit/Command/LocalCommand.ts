import { SpawnOptions } from 'node:child_process';
import { Command } from './Command';
import { PathReplacer } from './PathReplacer';

export class LocalCommand extends Command {
    protected resolvePathReplacer(options: SpawnOptions): PathReplacer {
        return new PathReplacer(options);
    }
}