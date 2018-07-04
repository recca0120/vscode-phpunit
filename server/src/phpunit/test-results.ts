import { Test } from './common';

export class TestResults {
    private tests: Test[];
    private uri: string = '';
    private output: string = '';

    setUri(uri: string): TestResults {
        this.uri = uri;

        return this;
    }

    getUri(): string {
        return this.uri;
    }

    setTests(tests: Test[]): TestResults {
        this.tests = tests;

        return this;
    }

    getTests(): Test[] {
        return this.tests;
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
