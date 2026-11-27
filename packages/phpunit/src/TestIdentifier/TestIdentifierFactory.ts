import { isPest } from './isPest';
import { PestTestIdentifier } from './PestTestIdentifier';
import { PHPUnitTestIdentifier } from './PHPUnitTestIdentifier';

const pestIdentifier = new PestTestIdentifier();
const phpunitIdentifier = new PHPUnitTestIdentifier();

export const TestIdentifierFactory = {
    isPest,

    create(text: string) {
        return TestIdentifierFactory.isPest(text) ? pestIdentifier : phpunitIdentifier;
    },
};
