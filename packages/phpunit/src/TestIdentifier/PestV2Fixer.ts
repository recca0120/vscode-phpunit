import type { TestResult } from '../TestOutput';
import { capitalize, splitDataset } from '../utils';

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
        const split = splitDataset(methodName);
        let dataset = '';
        if (split.dataset) {
            methodName = split.base;
            dataset = split.label.replace(/\|'/g, "'");
        }

        return Str.evaluable(methodName) + dataset;
    },
};
