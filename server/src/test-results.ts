import { Argument } from './argument';
import { Filesystem, Factory as FilesystemFactory } from './filesystem';
import { JUnitParser } from './junit-parser';
import { Test } from './common';
import { tap } from './helpers';

export class TestResults {
    constructor(
        private output: string,
        private args: Argument,
        private files: Filesystem = new FilesystemFactory().create(),
        private parser: JUnitParser = new JUnitParser()
    ) {}

    async getTests(): Promise<Test[]> {
        const file: string = this.args.get('--log-junit');
        const content: string = await this.files.get(file);

        return tap(this.parser.parse(content), () => {
            this.files.unlink(file);
        });
    }

    toString() {
        return this.output;
    }
}
