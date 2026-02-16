import { PestTransformer } from './PestTransformer';
import { PHPUnitTransformer } from './PHPUnitTransformer';

const pestPattern = /^pest|^P\\|^pest_qn:\/\/|^file:\/\//i;
const pestTransformer = new PestTransformer();
const phpunitTransformer = new PHPUnitTransformer();

export const TransformerFactory = {
    isPest(text: string) {
        return pestPattern.test(text);
    },

    create(text: string) {
        return TransformerFactory.isPest(text) ? pestTransformer : phpunitTransformer;
    },
};
