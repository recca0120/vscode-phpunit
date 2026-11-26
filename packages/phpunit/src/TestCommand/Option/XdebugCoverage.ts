import type { PathMapper } from '../../Path/PathMapper';
import type { CommandOption } from './CommandOption';

export class XdebugCoverage implements CommandOption {
    constructor(
        private readonly enabled: boolean,
        private readonly cloverFile?: string,
    ) {}

    isEnabled() {
        return this.enabled;
    }

    phpArgs() {
        return this.enabled ? ['-dxdebug.mode=coverage'] : [];
    }

    environment(): Record<string, string> {
        return this.enabled ? { XDEBUG_MODE: 'coverage' } : {};
    }

    phpUnitArgs(paths: PathMapper) {
        if (!this.enabled || !this.cloverFile) {
            return [];
        }

        return ['--coverage-clover', paths.toRemote(this.cloverFile)];
    }

    getCloverFile() {
        return this.enabled ? this.cloverFile : undefined;
    }

    withEnabled(enabled: boolean) {
        return new XdebugCoverage(enabled, this.cloverFile);
    }

    withCloverFile(cloverFile: string) {
        return new XdebugCoverage(this.enabled, cloverFile);
    }
}
