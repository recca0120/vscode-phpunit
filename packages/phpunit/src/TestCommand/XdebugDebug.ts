import type { CommandOption } from './CommandOption';

export class XdebugDebug implements CommandOption {
    constructor(
        private readonly enabled: boolean,
        readonly port?: number,
    ) {}

    isEnabled() {
        return this.enabled;
    }

    phpArgs() {
        if (!this.enabled) {
            return [];
        }

        return [
            '-dxdebug.mode=debug',
            '-dxdebug.start_with_request=1',
            ...(this.port ? [`-dxdebug.client_port=${this.port}`] : []),
        ];
    }

    environment(): Record<string, string> {
        return this.enabled ? { XDEBUG_MODE: 'debug' } : {};
    }

    phpUnitArgs() {
        return [];
    }

    debugConfiguration() {
        return { type: 'php', request: 'launch', name: 'PHPUnit', port: this.port };
    }
}
