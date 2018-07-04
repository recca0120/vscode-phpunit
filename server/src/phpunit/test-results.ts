import { Test } from './common';
import { Filesystem, Factory } from '../filesystem';

export class TestResults {
    private testGroup: Map<string, Test[]> = new Map<string, Test[]>();
    private output: string = '';

    constructor(private files: Filesystem = new Factory().create()) {}

    setTests(tests: Test[]): TestResults {
        this.testGroup = tests.reduce((testGroup: Map<string, Test[]>, test: Test): Map<string, Test[]> => {
            const tests: Test[] = testGroup.get(test.file) || [];

            return testGroup.set(test.file, tests.concat([test]));
        }, this.testGroup);

        return this;
    }

    getTests(uri: string): Test[] {
        return this.testGroup.get(this.files.uri(uri)) || [];
    }

    getTestGroup(): Map<string, Test[]> {
        return this.testGroup;
    }

    setOutput(output: string): TestResults {
        this.output = output;

        return this;
    }

    getOutput(): string {
        return this.output;
    }

    toString() {
        return this.getOutput();
    }
}
