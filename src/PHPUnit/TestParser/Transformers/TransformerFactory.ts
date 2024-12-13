import { PestTransformer } from './PestTransformer';
import { PHPUnitTransformer } from './PHPUnitTransformer';

export abstract class TransformerFactory {
    static isPest(text: string) {
        return /^pest|^P\\|pest_qn:\/\//i.test(text);
    }

    static factory(text: string) {
        return this.isPest(text) ? new PestTransformer() : new PHPUnitTransformer();
    }
}


