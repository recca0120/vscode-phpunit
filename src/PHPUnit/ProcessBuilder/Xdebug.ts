import { mkdtemp } from 'node:fs/promises';
import * as net from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IConfiguration } from '../Configuration';
import { cloneInstance } from '../utils';

async function getFreePort(): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        const server = net.createServer();
        server.on('error', (err) => reject(err));
        server.listen(0, '127.0.0.1', () => {
            const freePort = (server.address()! as net.AddressInfo).port;
            server.close(() => resolve(freePort));
        });
    });
}

export enum Mode {
    debug = 'debug',
    coverage = 'coverage',
}

export class Xdebug {
    mode?: Mode;
    private port?: number;
    private temporaryDirectory?: string;
    private index: number = 0;

    constructor(private configuration: IConfiguration) {}

    get name() {
        return this.configuration.get('debuggerConfig') as string | undefined;
    }

    getCloverFile() {
        if (this.mode !== Mode.coverage) {
            return undefined;
        }

        return join(this.temporaryDirectory!, `phpunit-${this.index}.xml`);
    }

    setIndex(index: number) {
        this.index = index;

        return this;
    }

    setTemporaryDirectory(temporaryDirectory: string) {
        this.temporaryDirectory = temporaryDirectory;

        return this;
    }

    async setMode(mode?: Mode) {
        this.mode = mode;

        if (mode === Mode.debug) {
            this.port =
                (this.configuration.get('xdebugPort', 0) as number) || (await getFreePort());
        }

        if (mode === Mode.coverage) {
            this.setTemporaryDirectory(await mkdtemp(join(tmpdir(), 'phpunit')));
        }

        return this;
    }

    getDebugConfiguration() {
        return { type: 'php', request: 'launch', name: 'PHPUnit', port: this.port };
    }

    getEnvironment() {
        if (this.mode && [Mode.debug, Mode.coverage].includes(this.mode)) {
            return {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                XDEBUG_MODE: this.mode,
            };
        }

        return {};
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

    getPhpUnitArgs(): string[] {
        if (this.mode !== Mode.coverage) {
            return [];
        }

        return ['--coverage-clover', this.getCloverFile()!];
    }

    clone() {
        return cloneInstance(this);
    }
}
