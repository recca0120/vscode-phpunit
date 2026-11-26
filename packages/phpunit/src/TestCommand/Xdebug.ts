import * as net from 'node:net';
import type { IConfiguration, PathReplacer } from '../Configuration';
import { cloneInstance } from '../utils';
import type { CommandOption } from './CommandOption';
import { XdebugCoverage } from './XdebugCoverage';
import { XdebugDebug } from './XdebugDebug';

async function getFreePort(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        const server = net.createServer();
        server.on('error', (err) => reject(err));
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                server.close(() => reject(new Error('Failed to get server address')));
                return;
            }
            const freePort = address.port;
            server.close(() => resolve(freePort));
        });
    });
}

export enum Mode {
    debug = 'debug',
    coverage = 'coverage',
}

export class Xdebug {
    private debug = new XdebugDebug(false);
    private coverage = new XdebugCoverage(false);

    constructor(private configuration: IConfiguration) {}

    isDebugMode() {
        return this.debug.isEnabled();
    }

    isCoverageMode() {
        return this.coverage.isEnabled();
    }

    get name() {
        return this.configuration.get('debuggerConfig') as string | undefined;
    }

    getCloverFile() {
        return this.coverage.getCloverFile();
    }

    setCloverFile(cloverFile: string) {
        this.coverage = this.coverage.withCloverFile(cloverFile);

        return this;
    }

    async setMode(mode?: Mode, launchPort?: number) {
        const port =
            mode === Mode.debug
                ? (this.configuration.get('xdebugPort', 0) as number) ||
                  launchPort ||
                  (this.name ? undefined : await getFreePort())
                : this.debug.port;
        this.debug = new XdebugDebug(mode === Mode.debug, port);
        this.coverage = this.coverage.withEnabled(mode === Mode.coverage);

        return this;
    }

    options(): CommandOption[] {
        return [this.debug, this.coverage];
    }

    getDebugConfiguration() {
        return this.debug.debugConfiguration();
    }

    getEnvironment() {
        return { ...this.debug.environment(), ...this.coverage.environment() };
    }

    getPhpArgs() {
        return [...this.debug.phpArgs(), ...this.coverage.phpArgs()];
    }

    getPhpUnitArgs(pathReplacer: PathReplacer): string[] {
        return [...this.debug.phpUnitArgs(), ...this.coverage.phpUnitArgs(pathReplacer)];
    }

    clone() {
        return cloneInstance(this);
    }
}
