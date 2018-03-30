import { Command } from 'vscode-languageserver';

import { Process } from './../../src/process/process';

describe('Process Test', () => {
    it('echo hello world', async () => {
        const process: Process = new Process({
            command: 'echo',
            arguments: ['hello world'],
            title: '',
        });

        expect(
            await process.run((type: string, buffer: Buffer) => {
                expect(buffer.toString().trim()).toEqual('hello world');
            })
        ).toEqual('hello world');

        expect(process.getOutput()).toEqual('hello world');
    });
});
