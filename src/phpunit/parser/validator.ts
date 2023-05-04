import { Class, Method } from 'php-parser';
import { getName } from './utils';
import { AttributeParser } from './annotation-parser';

export class Validator {
    private static attributeParser = new AttributeParser();
    private lookup: { [p: string]: Function } = {
        class: this.validateClass,
        method: this.validateMethod,
    };

    private get attributeParser() {
        return Validator.attributeParser;
    }

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

        return (
            getName(method).startsWith('test') ||
            this.isAnnotationTest(method) ||
            this.isAttributeTest(method)
        );
    }

    private isAbstract(classOrMethod: Class | Method) {
        return classOrMethod.isAbstract;
    }

    private isAttributeTest(method: Method) {
        if (!method.attrGroups) {
            return false;
        }

        return this.attributeParser
            .parse(method)
            .some((attribute: any) => attribute.name === 'Test');
    }

    private isAnnotationTest(method: Method) {
        return !method.leadingComments
            ? false
            : new RegExp('@test').test(
                  method.leadingComments.map((comment) => comment.value).join('\n')
              );
    }

    private acceptModifier(method: Method) {
        return ['', 'public'].indexOf(method.visibility) !== -1;
    }
}

export const validator = new Validator();
