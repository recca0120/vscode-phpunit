import * as net from 'node:net';
import type { IConfiguration } from '../Configuration';
import type { PathReplacer } from '../PathReplacer';
import { cloneInstance } from '../utils';

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
    private mode?: Mode;
    private port?: number;
    private cloverFile?: string;

    constructor(private configuration: IConfiguration) {}

    isDebugMode() {
        return this.mode === Mode.debug;
    }

    isCoverageMode() {
        return this.mode === Mode.coverage;
    }

    get name() {
        return this.configuration.get('debuggerConfig') as string | undefined;
    }

    getCloverFile() {
        if (this.mode !== Mode.coverage) {
            return undefined;
        }

        return this.cloverFile;
    }

    setCloverFile(cloverFile: string) {
        this.cloverFile = cloverFile;

        return this;
    }

    async setMode(mode?: Mode) {
        this.mode = mode;

        if (mode === Mode.debug) {
            this.port =
                (this.configuration.get('xdebugPort', 0) as number) || (await getFreePort());
        }

        return this;
    }

    getDebugConfiguration() {
        return { type: 'php', request: 'launch', name: 'PHPUnit', port: this.port };
    }

    getEnvironment() {
        if (!this.mode) {
            return {};
        }

        return {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            XDEBUG_MODE: this.mode,
        };
    }

    getPhpArgs() {
        if (this.mode === Mode.debug) {
            return [
                `-dxdebug.mode=${this.mode}`,
                '-dxdebug.start_with_request=1',
                `-dxdebug.client_port=${this.port}`,
            ];
        }

        if (this.mode === Mode.coverage) {
            return [`-dxdebug.mode=${this.mode}`];
        }

        return [];
    }

    getPhpUnitArgs(pathReplacer: PathReplacer): string[] {
        if (this.mode !== Mode.coverage || !this.cloverFile) {
            return [];
        }

        return ['--coverage-clover', pathReplacer.toRemote(this.cloverFile)];
    }

    clone() {
        return cloneInstance(this);
    }
}
