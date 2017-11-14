import { Process } from '../../src/command/process';

describe('Process Tests', () => {
    it('it should exec echo 123', done => {
        const proc = new Process();

        proc.spawn(['echo', '123']);

        proc.on('stdout', (buffer: Buffer) => {
            expect(buffer.toString().trim()).toEqual('123');
            done();
        });
    });
});
