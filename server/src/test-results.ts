import { Argument } from './argument';
import { Filesystem, Factory as FilesystemFactory } from './filesystem';
import { JUnitParser } from './junit-parser';
import { Test } from './common';

export class TestResults {
    constructor(
        private output: string,
        private args: Argument,
        private parser: JUnitParser = new JUnitParser(),
        private files: Filesystem = new FilesystemFactory().create()
    ) {}

    async getTests(): Promise<Test[]> {
        return this.parser.parse(await this.files.get(this.args.get('--log-junit')));
    }

    toString() {
        return this.output;
    }
}
