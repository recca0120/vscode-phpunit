import { Declaration, Method, Identifier, String } from 'php-parser'; // Removed AttributeGroup, Attribute
import { Annotations } from '../types';

const attributeLookup = ['depends', 'dataProvider', 'testdox'];

export class AttributeParser {
    public parse(declaration: Declaration): Annotations {
        const attributes = this.extractAttributes(declaration);
        const annotations: Annotations = {};

        for (const property of attributeLookup) {
            const values = attributes
                .filter(attribute => attribute.name.toLowerCase() === property.toLowerCase()) // Case-insensitive comparison
                .map(attribute => attribute.args[0]) // Assuming the first argument is the value
                .filter(arg => typeof arg === 'string'); // Ensure the argument is a string

            if (values.length > 0) {
                (annotations as any)[property] = values; // Use any for dynamic property assignment
            }
        }

        return annotations;
    }

    public isTest(method: Method): boolean {
        if (!method.attrGroups) {
            return false;
        }
        const attributes = this.extractAttributes(method);
        return attributes.some(attribute => attribute.name === 'Test'); // Case-sensitive comparison for 'Test' attribute
    }

    private extractAttributes(declaration: Declaration | Method): { name: string; args: any[] }[] {
        const attributes: { name: string; args: any[] }[] = [];
        if (!('attrGroups' in declaration) || !declaration.attrGroups) {
            return attributes;
        }

        // Use any type for attribute groups and attributes due to potential incomplete type definitions
        for (const group of (declaration.attrGroups as any[])) {
            if (group.attrs) {
                for (const attr of (group.attrs as any[])) {
                    // Check if attr.name is an object with a 'name' property (likely Identifier)
                    if (attr.name && typeof attr.name === 'object' && 'name' in attr.name) {
                         attributes.push({
                            name: (attr.name as Identifier).name, // Cast to Identifier for name property
                            args: attr.args ? attr.args.map((arg: any) => {
                                // Extract value based on type (e.g., String, Number, etc.)
                                if (arg.value && typeof arg.value === 'object' && 'value' in arg.value) {
                                     // Assuming literal types have a 'value' property
                                    return (arg.value as String).value; // Cast to String for value property
                                }
                                // Return the raw value if not a recognized literal object
                                return arg.value;
                            }) : [],
                        });
                    }
                }
            }
        }

        return attributes;
    }
}

const annotationLookup = ['depends', 'dataProvider', 'testdox'];

export class AnnotationParser {
    public parse(declaration: Declaration): Annotations {
        return this.parseComments(declaration);
    }

    public isTest(method: Method): boolean {
        if (!method.leadingComments) {
            return false;
        }
        const comments = method.leadingComments.map(comment => comment.value).join('\n');
        return /@test/.test(comments);
    }

    private readonly annotationPattern: RegExp = new RegExp(
        annotationLookup.map(name => `@${name}\\s+(?<${name}>[^\\n]+)`).join('|'),
        'ig'
    );

    private parseComments(declaration: Declaration): Annotations {
        const comments = declaration.leadingComments ?? [];
        const annotations: Annotations = {};

        for (const comment of comments) {
            for (const match of comment.value.matchAll(this.annotationPattern)) {
                const groups = match.groups;
                if (groups) {
                    for (const property in groups) {
                        if (Object.prototype.hasOwnProperty.call(groups, property)) {
                            const value = groups[property];
                            if (value) {
                                // Use any for dynamic property assignment
                                (annotations as any)[property] = [...((annotations as any)[property] ?? []), value.trim()];
                            }
                        }
                    }
                }
            }
        }

        return annotations;
    }
}
