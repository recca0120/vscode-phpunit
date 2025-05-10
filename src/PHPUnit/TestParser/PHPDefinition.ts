import { basename, dirname, join, relative } from 'node:path';
import { Declaration, Identifier, Name, Namespace, Node, PropertyLookup, Program, Class, Method, Call, ExpressionStatement, Literal, String as PHPStringNode, AST as PHPASTNode, Block } from 'php-parser'; // Import more specific types, renamed String to PHPStringNode, imported PHPASTNode, imported Block
import { PHPUnitXML } from '../PHPUnitXML';
import { Transformer, TransformerFactory } from '../Transformer';
import { TestDefinition, TestType, Annotations } from '../types'; // Ensure Annotations is imported
import { capitalize } from '../utils';
import { AnnotationParser, AttributeParser } from './AnnotationParser';

// Using Node from php-parser as the base type for AST nodes
type AST = Node;

export const annotationParser = new AnnotationParser();
export const attributeParser = new AttributeParser();

// Renamed abstract class to better reflect its purpose
abstract class BaseTestDefinitionBuilder {
    constructor(protected definition: PHPDefinition) {
    }

    abstract build(): TestDefinition;

    protected generate(testDefinition: Partial<TestDefinition>): TestDefinition {
        const baseDefinition: Partial<TestDefinition> = {
            type: this.definition.type,
            classFQN: this.definition.classFQN,
            children: [], // Children will be populated by the parser
            annotations: this.definition.annotations,
            file: this.definition.file,
            ...this.definition.position,
        };

        const finalDefinition: TestDefinition = {
             ...(baseDefinition as TestDefinition), // Cast to TestDefinition for spread
             ...(testDefinition as TestDefinition), // Spread partial definition
             // Ensure required properties are present, potentially with default values or checks
             id: testDefinition.id ?? '', // Provide default or ensure id is set in build()
             label: testDefinition.label ?? '', // Provide default or ensure label is set in build()
             depth: testDefinition.depth ?? 0, // Provide default or ensure depth is set in build()
        };


        const transformer = this.getTransformer(finalDefinition);
        finalDefinition.id = transformer.uniqueId(finalDefinition);
        finalDefinition.label = transformer.generateLabel(finalDefinition);

        return finalDefinition;
    }

    private getTransformer(testDefinition: Pick<TestDefinition, 'classFQN'>): Transformer {
        // Ensure classFQN is not undefined before creating transformer
        if (!testDefinition.classFQN) {
             // Handle this case appropriately, maybe throw an error or return a default transformer
             console.warn('classFQN is undefined for test definition:', testDefinition);
             // Returning a default transformer or throwing an error might be better depending on expected behavior
             // For now, casting to string as it was in the original code, but this is risky
             return TransformerFactory.factory(testDefinition.classFQN as string);
        }
        return TransformerFactory.factory(testDefinition.classFQN);
    }
}

class NamespaceDefinitionBuilder extends BaseTestDefinitionBuilder {
    build(): TestDefinition {
        const type = TestType.namespace;
        const depth = 0;
        const classFQN = this.definition.classFQN;
        const namespace = this.definition.name; // Namespace name is the definition name

        return this.generate({ type, depth, namespace, classFQN });
    }
}

class TestSuiteDefinitionBuilder extends BaseTestDefinitionBuilder {
    build(): TestDefinition {
        const type = TestType.class; // TestSuite corresponds to a class
        const depth = 1;
        const namespace = this.definition.parent?.name;
        const className = this.definition.name;

        return this.generate({ type, depth, namespace, className });
    }
}

class TestCaseDefinitionBuilder extends BaseTestDefinitionBuilder {
    build(): TestDefinition {
        const type = TestType.method; // TestCase corresponds to a method
        const depth = 2; // Default depth for a method within a class
        const namespace = this.definition.parent?.parent?.name; // Namespace is parent's parent's name
        const className = this.definition.parent?.name; // Class name is parent's name
        const methodName = this.definition.name;

        return this.generate({ type, depth, namespace, className, methodName });
    }
}

class PestTestDefinitionBuilder extends BaseTestDefinitionBuilder {
    build(): TestDefinition {
        const type = this.definition.type; // Can be describe or method
        let depth = 1; // Default depth for top-level describe/it/test/arch
        let methodName = this.definition.name;
        let label = this.definition.name;

        // Handle Pest specific naming and depth based on parent calls
        const parentCalls = this.getParentsUntil(this.definition, (def) => def.kind !== 'call');
        const callNames = parentCalls.map(def => def.name).reverse();

        if (callNames.length > 0) {
             methodName = callNames.join(' → ');
             label = callNames.join(' → ');
             depth += callNames.length; // Increase depth based on nested calls
        }


        // Handle Pest 'it' and 'arch' specific logic
        if (this.definition.kind === 'call') {
             const args = this.definition.arguments;
             if (this.definition.name === 'it' && args.length > 0) {
                 const argName = args[0].name;
                 methodName = `it ${argName}`;
                 label = `it ${argName}`;
             } else if (this.definition.name === 'arch' && args.length > 0) {
                 const argName = args[0].name;
                 methodName = `arch ${argName}`;
                 label = `arch ${argName}`;
             } else if (this.definition.name === 'describe' && args.length > 0) {
                 const argName = args[0].name;
                 methodName = `\`${argName}\``;
                 label = `\`${argName}\``;
             }
        }


        // Determine classFQN, namespace, className based on the first non-call parent
        const firstNonCallParent = parentCalls.find(def => def.kind !== 'call') ?? this.definition.parent;
        const classFQN = firstNonCallParent?.classFQN;
        const namespace = firstNonCallParent?.name; // Assuming namespace is the name of the namespace/program definition
        const className = firstNonCallParent?.kind === 'class' ? firstNonCallParent.name : undefined; // Class name if parent is a class


        return this.generate({
            type,
            classFQN,
            namespace,
            className,
            methodName,
            label,
            depth,
        });
    }

    // Helper to get parent definitions until a condition is met
    private getParentsUntil(definition: PHPDefinition, condition: (def: PHPDefinition) => boolean): PHPDefinition[] {
        const parents: PHPDefinition[] = [];
        let currentParent = definition.parent;
        while (currentParent && !condition(currentParent)) {
            parents.push(currentParent);
            currentParent = currentParent.parent;
        }
        return parents;
    }

    private parseMethodNameAndLabel() {
        const args = this.definition.arguments;

        if (this.definition.name !== 'arch') {
            let methodName = args[0]?.name ?? ''; // Use optional chaining
            let label = methodName;

            if (this.definition.name === 'it') {
                methodName = 'it ' + methodName;
                label = 'it ' + label;
            }

            return { methodName, label };
        }

        if (args.length > 0) {
            const methodName = args[0]?.name ?? ''; // Use optional chaining
            return { methodName, label: methodName };
        }

        const names: string[] = [];
        let parent = this.definition.parent;
        while (parent && parent.kind === 'call') {
            names.push(parent.name);
            parent = parent.parent;
        }

        const methodName = names
            .map((name: string) => name === 'preset' ? `${name}  ` : ` ${name} `)
            .join('→');

        const label = names.join(' → ');

        return { methodName, label };
    }
}

export class PHPDefinition {
    constructor(private readonly ast: AST, private options: {
        phpUnitXML: PHPUnitXML,
        file: string,
        namespace?: PHPDefinition,
        parent?: PHPDefinition,
    }) {
    }

    get kind(): string {
        // Safely access kind property
        return (this.ast as any).kind ?? 'unknown';
    }

    get file(): string {
        return this.options.file;
    }

    get root(): string {
        return this.options.phpUnitXML.root();
    }

    get type(): TestType | undefined {
        switch (this.kind) {
            case 'namespace':
                return TestType.namespace;
            case 'program': // Program can represent the top-level file which acts like a class for tests
            case 'class':
                return TestType.class;
            case 'method':
                return TestType.method;
            case 'call':
                // Determine if a call is a 'describe' block or a test method call
                return this.name === 'describe' ? TestType.describe : TestType.method;
            default:
                return undefined;
        }
    }

    get classFQN(): string | undefined {
        if (this.kind === 'program') {
            // Generate FQN for the file acting as a class (Pest style)
            let relativePath = relative(this.root, this.file);
            let baseName = basename(this.file, '.php');
            const dotPos = baseName.lastIndexOf('.');
            if (dotPos !== -1) {
                baseName = baseName.substring(0, dotPos);
            }
            // Normalize path and replace separators, handle potential encoding issues
            relativePath = join(capitalize(dirname(relativePath)), baseName).replace(/[\\/]+/g, '\\');
            relativePath = relativePath.replace(/%[a-fA-F0-9]{2}/g, ''); // Remove URL encoding artifacts
            relativePath = relativePath.replace(/['"]/g, ''); // Remove quotes
            relativePath = relativePath.replace(/[^A-Za-z0-9\\]/g, ''); // Remove invalid characters

            return 'P\\' + relativePath; // Prefix with 'P\' for Pest files
        }

        if (this.kind === 'namespace' && typeof (this.ast as Namespace).name === 'string') {
            return (this.ast as Namespace).name; // Namespace name is the FQN
        }

        if (this.kind === 'class' && this.parent && typeof (this.ast as Class).name === 'string') {
            // Class FQN is parent namespace + class name
            const parentNamespace = this.parent.classFQN; // Recursively get parent namespace FQN
            const className = (this.ast as Class).name; // Get class name
            return [parentNamespace, className].filter(name => !!name).join('\\');
        }

        // For other kinds, the FQN is inherited from the parent
        return this.parent?.classFQN;
    }

    get parent(): PHPDefinition | undefined {
        return this.options.parent;
    }

    get children(): PHPDefinition[] | undefined {
        if (this.kind === 'namespace') {
            return this.getClasses();
        }

        if (this.kind === 'class') {
            return this.getMethods();
        }

        // For other kinds, children are determined by specific parsing logic (e.g., getFunctions)
        return undefined;
    }

    get arguments(): PHPDefinition[] {
        // Ensure ast.arguments is an array before mapping
        if (this.kind === 'call' && Array.isArray((this.ast as Call).arguments)) {
            return (this.ast as Call).arguments.map((ast: any) => { // Use any for argument AST type
                return new PHPDefinition(ast, { ...this.options, parent: this });
            });
        }
        return [];
    }

    get name(): string {
        // Handle different AST node types for name extraction
        // Check kind first before accessing specific properties
        if (this.ast.kind === 'namedargument' && (this.ast as any).value && typeof (this.ast as any).value === 'object' && 'kind' in (this.ast as any).value && (this.ast as any).value.kind === 'string') {
            return ((this.ast as any).value as PHPStringNode).value; // Use PHPStringNode type and access value
        }

        if (this.ast.kind === 'identifier' && typeof (this.ast as Identifier).name === 'string') {
             return (this.ast as Identifier).name; // Extract name from Identifier
        }

        if (this.ast.kind === 'name' && typeof (this.ast as Name).name === 'string') {
             return (this.ast as Name).name; // Extract name from Name
        }

        if (this.ast.kind === 'class' && typeof (this.ast as Class).name === 'string') {
             return (this.ast as Class).name; // Extract name from Class
        }

        if (this.ast.kind === 'method' && typeof (this.ast as Method).name === 'string') {
             return (this.ast as Method).name; // Extract name from Method
        }

        if (this.ast.kind === 'call' && (this.ast as Call).what && typeof (this.ast as Call).what === 'object' && 'kind' in (this.ast as Call).what) {
             if ((this.ast as Call).what.kind === 'propertylookup' && ((this.ast as Call).what as PropertyLookup).offset && (((this.ast as Call).what as PropertyLookup).offset as Identifier).name) {
                  return (((this.ast as Call).what as PropertyLookup).offset as Identifier).name; // Extract name from property lookup offset
             }
              if ((this.ast as Call).what.kind === 'name' && ((this.ast as Call).what as Name).name) {
                  return ((this.ast as Call).what as Name).name; // Extract name from Name within a Call
              }
        }

        if (this.ast.kind === 'string' && typeof (this.ast as PHPStringNode).value === 'string') {
            return (this.ast as PHPStringNode).value; // Extract value from string literal
        }

        return ''; // Default empty string if name cannot be determined
    }

    get annotations(): Annotations {
        // Ensure ast is treated as Declaration for annotation/attribute parsing
        return {
            ...annotationParser.parse(this.ast as Declaration),
            ...attributeParser.parse(this.ast as Declaration),
        };
    }

    get position(): { start: { line: number, character: number }, end: { line: number, character: number } } | undefined {
        if (this.ast.loc) {
            return {
                start: { line: this.ast.loc.start.line, character: this.ast.loc.start.column },
                end: { line: this.ast.loc.end.line, character: this.ast.loc.end.column },
            };
        }
        return undefined;
    }

    getClasses(): PHPDefinition[] {
        const classes: PHPDefinition[] = [];
        const options = { ...this.options, parent: this };

        // Handle classes within namespaces or at the program level
        const children = this.ast.kind === 'program' ? (this.ast as Program).children : (this.ast.kind === 'namespace' ? (this.ast as Namespace).children : (this.ast as Class).body);


        if (Array.isArray(children)) {
            for (const node of children) {
                if (node.kind === 'class') {
                    classes.push(new PHPDefinition(node as AST, options));
                } else if (node.kind === 'namespace') {
                    // Recursively get classes from nested namespaces
                    classes.push(...new PHPDefinition(node as AST, options).getClasses());
                }
            }
        }

        return classes;
    }

    getFunctions(): PHPDefinition[] {
        const functions: PHPDefinition[] = [];
        const options = { ...this.options, parent: this };

        // Handle functions/calls within different contexts (program, block, call arguments)
        const children = this.ast.kind === 'program' ? (this.ast as Program).children : (this.ast.kind === 'block' ? (this.ast as Block).children : (this.ast as Call).arguments);


        if (Array.isArray(children)) {
            for (const node of children) {
                // Handle expression statements containing calls
                if (node.kind === 'expressionstatement' && (node as ExpressionStatement).expression?.kind === 'call') {
                    functions.push(new PHPDefinition((node as ExpressionStatement).expression as AST, options));
                }
                // Handle calls directly
                else if (node.kind === 'call') {
                     functions.push(new PHPDefinition(node as AST, options));
                }
                // Handle closures/arrow functions with bodies
                else if (['closure', 'arrowfunc'].includes(node.kind) && (node as any).body) { // Use any for body access
                     functions.push(...new PHPDefinition((node as any).body as AST, options).getFunctions());
                }
                // Handle named arguments with bodies (like Pest describe)
                else if (node.kind === 'namedargument' && (node as any).value?.body) { // Use any for value/body access
                     functions.push(...new PHPDefinition((node as any).value.body as AST, options).getFunctions());
                }
            }
        }

        return functions;
    }

    getMethods(): PHPDefinition[] {
        const methods: PHPDefinition[] = [];
        const options = { ...this.options, parent: this };

        // Handle methods within a class body
        if (this.kind === 'class' && Array.isArray((this.ast as Class).body)) {
            for (const node of (this.ast as Class).body) {
                if (node.kind === 'method') {
                    methods.push(new PHPDefinition(node as AST, options));
                }
            }
        }

        return methods;
    }


    isTest(): boolean {
        // Safely access isAbstract property
        if ((this.ast as any).isAbstract) {
            return false;
        }

        if (this.kind === 'class') {
            // A class is a test suite if its name ends with 'Test' and it contains at least one test method
            return this.name.endsWith('Test') && (this.children ?? []).some((definition): boolean => definition.isTest());
        }

        if (this.kind === 'method' && this.acceptModifier()) {
            // A method is a test if its name starts with 'test' or has @test annotation/attribute
            return this.name.startsWith('test') ||
                annotationParser.isTest(this.ast as Method) || // Cast to Method
                attributeParser.isTest(this.ast as Method); // Cast to Method
        }

        if (this.kind === 'call') {
            // Specific function calls can be tests (Pest style)
            return ['it', 'test', 'describe', 'arch'].includes(this.name);
        }

        return false;
    }

    toTestDefinition(): TestDefinition {
        switch (this.type) {
            case TestType.class:
                return new TestSuiteDefinitionBuilder(this).build();
            case TestType.method:
                // Differentiate between standard methods and Pest calls
                if (this.kind === 'method') {
                     return new TestCaseDefinitionBuilder(this).build();
                } else if (this.kind === 'call') {
                     return new PestTestDefinitionBuilder(this).build();
                }
                break; // Should not reach here
            case TestType.namespace:
                 return new NamespaceDefinitionBuilder(this).build();
            default:
                // Handle unknown types or throw error
                throw new Error(`Unknown TestType for AST kind: ${this.kind}`);
        }
         // Fallback, though the switch should cover all expected types
         throw new Error(`Could not convert PHPDefinition to TestDefinition for AST kind: ${this.kind}`);
    }

    createNamespaceTestDefinition(): TestDefinition {
        return new NamespaceDefinitionBuilder(this).build();
    }

    private acceptModifier(): boolean {
        // Check if method visibility is public or not explicitly set
        return (this.ast as any).visibility === undefined || (this.ast as any).visibility === 'public';
    }
}
