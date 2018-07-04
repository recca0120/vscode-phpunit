import { Test } from './common';

export class TestResult {
    private tests: Test[] = [];
    private output: string = '';

    setTests(tests: Test[]): TestResult {
        this.tests = tests;

        return this;
    }

    getTests(): Test[] {
        return this.tests;
    }

    setOutput(output: string): TestResult {
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
