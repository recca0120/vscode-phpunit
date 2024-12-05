import { TestResult, TestVersion } from '../PHPUnit';

export interface Printer {
    version: (result: TestVersion) => string;
    error: (text: string) => string;
    suiteStarted: (result: TestResult) => string;
    suiteFinished: (result: TestResult) => string;
    testStarted: (result: TestResult) => string;
    testFinished: (result: TestResult) => string;
}