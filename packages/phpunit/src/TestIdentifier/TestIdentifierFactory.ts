import { PestTestIdentifier } from './PestTestIdentifier';
import { PHPUnitTestIdentifier } from './PHPUnitTestIdentifier';

// Pest v4 eval'd code: php_qn://...eval()'d code...::\P\Tests\...::__pest_evaluable__...
const pestEvalPattern = /::(?:\\)?P\\/;
const pestPattern = /^pest|^P\\|^pest_qn:\/\/|^file:\/\//i;
const pestIdentifier = new PestTestIdentifier();
const phpunitIdentifier = new PHPUnitTestIdentifier();

export const TestIdentifierFactory = {
    isPest(text: string) {
        return pestPattern.test(text);
    },

    create(text: string) {
        const isPest =
            TestIdentifierFactory.isPest(text) ||
            (text.startsWith('php_qn://') && pestEvalPattern.test(text));
        return isPest ? pestIdentifier : phpunitIdentifier;
    },
};
