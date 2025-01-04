import { PestTransformer } from './PestTransformer';
import { PHPUnitTransformer } from './PHPUnitTransformer';
import { AppState } from '../../../AppState';

interface TransformerInput {
    classFQN?: string;
    locationHint?: string;
    testResultName?: string;
}

export abstract class TransformerFactory {
    static getTextFromInput(input: TransformerInput | string): string {
        if (typeof input === 'string') {
            return input;
        }

        return input.classFQN || input.locationHint || '';
    }

    static isPest(input: TransformerInput | string) {
        const text = this.getTextFromInput(input);

        if (/^pest|^P\\|pest_qn:\/\//i.test(text)) {
            return true;
        }

        if (/php_qn:\/\//i.test(text)) {
            return false;
        }

        if (text.startsWith('file://')) {
            return this.checkByParserId(input);
        }

        return false;
    }

    static checkByParserId(input: TransformerInput | string): boolean {
        if (typeof input === 'string' || typeof input.locationHint === 'undefined') {
            return false;
        }

        const parserId = input.locationHint
            .split('://')[1]
            .replace(/^tests\//i, 'Tests\\')
            .replace(/\//g, '\\')
            .replace(/\.php$/, '');

        return AppState.getParserTestType(parserId) ?? false;
    }

    static factory(input: TransformerInput | string) {
        return this.isPest(input) ? new PestTransformer() : new PHPUnitTransformer();
    }
}


