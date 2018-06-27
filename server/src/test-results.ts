import { Argument } from './Argument';
import { Filesystem, Factory as FilesystemFactory } from './filesystem';

export class TestResults {
    constructor(
        private output: string,
        private args: Argument,
        private files: Filesystem = new FilesystemFactory().create()
    ) {}

    async getTests() {
        const junitDotXml: string = await this.files.get(this.args.get('--log-junit'));
        // console.log(junitDotXml)
    }

    toString() {
        return this.output;
    }
}
