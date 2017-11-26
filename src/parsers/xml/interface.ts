export interface IXmlParser {
    parse(content: string): Promise<any>;
    map(testCaseNode: any): any;
}
