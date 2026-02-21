import { PestTestIdentifier } from './PestTestIdentifier';
import { PHPUnitTestIdentifier } from './PHPUnitTestIdentifier';

const pestPattern = /^pest|^P\\|^pest_qn:\/\/|^file:\/\//i;
const pestTransformer = new PestTestIdentifier();
const phpunitTransformer = new PHPUnitTestIdentifier();

export const TestIdentifierFactory = {
    isPest(text: string) {
        return pestPattern.test(text);
    },

    create(text: string) {
        return TestIdentifierFactory.isPest(text) ? pestTransformer : phpunitTransformer;
    },
};
