import * as net from 'net';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IConfiguration } from '../Configuration';
import { cloneInstance } from '../utils';

async function getFreePort(): Promise<number> {
    return new Promise<number>(resolve => {
        const server = net.createServer();
        server.listen(0, '127.0.0.1', () => {
            const freePort = (server.address()! as net.AddressInfo).port;
            server.close();
            resolve(freePort);
        });
    });
}

export enum Mode {
    'debug' = 'debug',
    'coverage' = 'coverage',
}

export class Xdebug {
    mode?: Mode;
    private port?: number;
    private temporaryDirectory?: string;
    private index: number = 0;

    constructor(private configuration: IConfiguration) {
    }

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

    async setMode(mode?: Mode | number) {
        if (typeof mode !== 'number') {
            this.mode = mode;

            return this;
        }

        // export enum TestRunProfileKind { Run = 1, Debug = 2, Coverage = 3 }
        if (mode === 2) {
            this.mode = Mode.debug;
            this.port = this.configuration.get('xdebugPort', 0) as number || await getFreePort();
        }

        if (mode === 3) {
            this.mode = Mode.coverage;
            this.setTemporaryDirectory(await mkdtemp(join(tmpdir(), 'phpunit')));
        }

        return this;
    }

    private async getPort() {
        return this.port;
    }

    async getDebugConfiguration() {
        return { type: 'php', request: 'launch', name: 'PHPUnit', port: await this.getPort() };
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