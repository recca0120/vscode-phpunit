import { Command } from 'vscode-languageserver';
import { Process } from './../src/process';

describe('Process Test', () => {
    it('echo hello world', async () => {
        const process: Process = new Process();

        expect(
            await process.spawn({
                command: 'echo',
                arguments: ['hello world'],
                title: '',
            })
        ).toEqual('hello world');
    });
});
