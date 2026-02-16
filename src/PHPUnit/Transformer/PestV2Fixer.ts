import type { TestResult } from '../ProblemMatcher';
import { capitalize } from '../utils';

class Str {
    static prefix = '__pest_evaluable_';

    static evaluable(code: string) {
        return (
            Str.prefix +
            code
                .replace(/_/g, '__')
                .replace(/\s/g, '_')
                .replace(/[^a-zA-Z0-9_\u0080-\uFFFF]/g, '_')
        );
    }
}

export class PestV2Fixer {
    static fixId(location: string, name: string) {
        return PestV2Fixer.hasPrefix(name) ? name : location;
    }

    static isEqualsPestV2DataSetId(result: TestResult, testItemId: string) {
        if (!('id' in result) || !PestV2Fixer.hasPrefix(result.id)) {
            return false;
        }

        let [classFQN, method] = testItemId.split('::');
        classFQN = capitalize(classFQN.replace(/\//g, '\\').replace(/\.php$/, ''));

        return [classFQN, PestV2Fixer.methodName(method)].join('::') === result.id;
    }

    private static hasPrefix(id?: string) {
        return id?.includes(Str.prefix) ?? false;
    }

    static methodName(methodName: string) {
        methodName = methodName.replace(/\{@\*}/g, '*/');
        const matched = methodName.match(/(?<method>.*)\swith\sdata\sset\s(?<dataset>.+)/);
        let dataset = '';
        if (matched?.groups) {
            methodName = matched.groups.method;
            dataset = matched.groups.dataset.replace(/\|'/g, "'");
        }

        return Str.evaluable(methodName) + dataset;
    }
}
