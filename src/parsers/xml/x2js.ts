import { IXmlParser } from './interface';

export class X2jsParser implements IXmlParser {
    parse(content: string): Promise<any> {
        const x2js = require('x2js');
        return new Promise(resolve => {
            resolve(
                new x2js({
                    enableToStringFunc: false,
                }).xml2js(content)
            );
        });
    }

    map(testCaseNode: any): any {
        return testCaseNode;
    }
}
