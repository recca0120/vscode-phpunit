import { TeamcityEvent, TestResult, TestStarted, TestSuiteStarted } from '../ProblemMatcher';
import { TestDefinition, TestType } from '../types';
import { capitalize, snakeCase, titleCase } from '../utils';
import { Transformer } from './Transformer';

export class PHPUnitFixer {
    static fixDetails(results = new Map<string, TestResult>(), testResult: TestResult & {
        name: string,
        locationHint?: string,
        file?: string,
        details?: Array<{ file: string, line: number }>,
    }) {
        if (testResult.details && testResult.file) {
            return testResult;
        }

        const result = Array.from(results.values()).reverse().find((result) => {
            return [TeamcityEvent.testSuiteStarted, TeamcityEvent.testStarted].includes(result.event);
        }) as (TestSuiteStarted | TestStarted | undefined);

        if (!result) {
            return testResult;
        }

        const file = result.file!;
        if (!testResult.file) {
            testResult.file = file;
        }

        if (!testResult.details) {
            testResult.details = [{ file: file, line: 1 }];
        }

        if (!testResult.locationHint) {
            const locationHint = result.locationHint?.split('::').slice(0, 1).join('::');
            testResult.locationHint = [locationHint, testResult.name]
                .filter(value => !!value)
                .join('::');
        }

        return testResult;
    }
}

export class PHPUnitTransformer extends Transformer {
    uniqueId(testDefinition: Pick<TestDefinition, 'type' | 'classFQN' | 'methodName' | 'annotations'>): string {
        let { type, classFQN } = testDefinition;
        classFQN = classFQN!.replace(/Test$/i, '');
        const partsFQN = classFQN.replace(/Test$/i, '').split('\\');
        const className = titleCase(partsFQN.pop() ?? '');
        classFQN = partsFQN.length === 0 ? className : `${className} (${classFQN})`;

        if (type === TestType.namespace) {
            return `namespace:${classFQN}`;
        }

        if (type === TestType.class) {
            return classFQN;
        }

        return [classFQN, this.getMethodName({ methodName: testDefinition.methodName })].join('::');
    };

    fromLocationHit(locationHint: string, _name: string) {
        const partsLocation = locationHint.replace(/^php_qn:\/\//, '').replace(/::\\/g, '::').split('::');
        const file = partsLocation.shift();
        const [classFQN, methodName] = partsLocation;

        const type = !methodName ? TestType.class : TestType.method;
        const id = this.removeDataset(this.uniqueId({ type: type, classFQN, methodName }));

        return { id, file };
    }

    protected normalizeMethodName(methodName: string) {
        return capitalize(snakeCase(
            methodName.replace(/^test/i, '').replace(/_/g, ' ').trim(),
        )).replace(/_/g, ' ');
    }
}