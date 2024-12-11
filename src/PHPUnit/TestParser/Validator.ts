import { Class, Declaration, Method } from 'php-parser';
import { isTest } from './AnnotationParser';

export class Validator {
    private lookup: { [p: string]: Function } = {
        class: this.validateClass,
        method: this.validateMethod,
    };

    public isTest(declaration: Declaration) {
        const fn = this.lookup[declaration.kind];

        return fn ? fn.apply(this, [declaration]) : false;
    }

    private validateClass(clazz: Class) {
        return !this.isAbstract(clazz);
    }

    private validateMethod(method: Method) {
        if (this.isAbstract(method) || !this.acceptModifier(method)) {
            return false;
        }

        return (typeof method.name === 'string' ? method.name : method.name.name).startsWith('test') || isTest(method);
    }

    private isAbstract(classOrMethod: Class | Method) {
        return classOrMethod.isAbstract;
    }

    private acceptModifier(method: Method) {
        return ['', 'public'].indexOf(method.visibility) !== -1;
    }
}

export const validator = new Validator();
