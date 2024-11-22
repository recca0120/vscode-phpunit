import { SpawnOptions } from 'node:child_process';
import { IConfiguration } from '../Configuration';
import { Command } from './Command';
import { Path, PathReplacer } from './PathReplacer';

export class RemoteCommand extends Command {
    protected executable() {
        return [super.executable().map((input) => (/^-/.test(input) ? `'${input}'` : input)).join(' ')];
    }

    protected resolvePathReplacer(options: SpawnOptions, configuration: IConfiguration): PathReplacer {
        return new PathReplacer(options, configuration.get('paths') as Path);
    }
}