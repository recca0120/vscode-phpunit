import { tmpdir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';
import { Parser } from './Parser';

interface Options {
    rootPath: string;
    tmpdir: string;
}

export class PHPUnit {
    public constructor(
        private options: Options = {
            rootPath: __dirname,
            tmpdir: tmpdir()
        },
        private parser = new Parser
    ) {}

    public run(filePath: string, output: any = null): Promise<any> {
        return new Promise((resolve) => {
            const command = 'C:\\ProgramData\\ComposerSetup\\vendor\\bin\\phpunit.bat';
            const xml = join(this.options.tmpdir, 'vscode-phpunit-junit.xml');
            const args = [
                filePath,
                '--log-junit',
                xml
            ];
            const process = spawn(command, args, {cwd: this.options.rootPath});
            const cb = (buffer: Buffer) => {
                if (output !== null) {
                    output.append(buffer.toString()); 
                }
            }
            
            process.stderr.on('data', cb);
            process.stdout.on('data', cb);
            process.on('exit', async (code: string) => {
                const messages = await this.parser.parseXML(xml);


                resolve(messages);
            });
        });
    }
}