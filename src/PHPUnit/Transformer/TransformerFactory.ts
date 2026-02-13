import { PestTransformer } from './PestTransformer';
import { PHPUnitTransformer } from './PHPUnitTransformer';

export abstract class TransformerFactory {
    static isPest(text: string) {
        return new RegExp([
            '^pest',
            '^P\\\\',
            '^pest_qn:\/\/',
            '^file:\/\/',
        ].join('|'), 'i').test(text);
    }

    static factory(text: string) {
        return this.isPest(text) ? new PestTransformer() : new PHPUnitTransformer();
    }
}


