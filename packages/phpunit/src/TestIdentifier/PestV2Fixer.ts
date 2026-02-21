import type { TestResult } from '../TestOutput';
import { capitalize } from '../utils';

const Str = {
    prefix: '__pest_evaluable_',

    evaluable(code: string) {
        return (
            Str.prefix +
            code
                .replace(/_/g, '__')
                .replace(/\s/g, '_')
                .replace(/[^a-zA-Z0-9_\u0080-\uFFFF]/g, '_')
        );
    },
};

function hasPrefix(id?: string) {
    return id?.includes(Str.prefix) ?? false;
}

export const PestV2Fixer = {
    fixId(location: string, name: string) {
        return hasPrefix(name) ? name : location;
    },

    isEqualsPestV2DataSetId(result: TestResult, testItemId: string) {
        if (!('id' in result) || !hasPrefix(result.id)) {
            return false;
        }

        let [classFQN, method] = testItemId.split('::');
        classFQN = capitalize(classFQN.replace(/\//g, '\\').replace(/\.php$/, ''));

        return [classFQN, PestV2Fixer.methodName(method)].join('::') === result.id;
    },

    methodName(methodName: string) {
        methodName = methodName.replace(/\{@\*}/g, '*/');
        const matched = methodName.match(/(?<method>.*)\swith\sdata\sset\s(?<dataset>.+)/);
        let dataset = '';
        if (matched?.groups) {
            methodName = matched.groups.method;
            dataset = matched.groups.dataset.replace(/\|'/g, "'");
        }

        return Str.evaluable(methodName) + dataset;
    },
};
