import { Class, Method } from 'php-parser';
import { getName } from './utils';
import { isTest } from './annotation-parser';

export class Validator {
    private lookup: { [p: string]: Function } = {
        class: this.validateClass,
        method: this.validateMethod,
    };

    public isTest(classOrMethod: Class | Method) {
        const fn = this.lookup[classOrMethod.kind];

        return fn ? fn.apply(this, [classOrMethod]) : false;
    }

    private validateClass(_class: Class) {
        return !this.isAbstract(_class);
    }

    private validateMethod(method: Method) {
        if (this.isAbstract(method) || !this.acceptModifier(method)) {
            return false;
        }

        return getName(method).startsWith('test') || isTest(method);
    }

    private isAbstract(classOrMethod: Class | Method) {
        return classOrMethod.isAbstract;
    }

    private acceptModifier(method: Method) {
        return ['', 'public'].indexOf(method.visibility) !== -1;
    }
}

export const validator = new Validator();
