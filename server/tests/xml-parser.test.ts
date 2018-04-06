import { parse } from 'fast-xml-parser';
import { files } from '../src/filesystem';
import { resolve } from 'path';

describe('Process Test', () => {
    it('echo hello world', async () => {
        let content: string = await files.get(resolve(__dirname, 'fixtures/junit.xml'));
        console.log(
            parse(content, {
                attributeNamePrefix: '_',
                textNodeName: '__text',
                // attrNodeName: '$',
                ignoreAttributes: false,
                ignoreNameSpace: false,
                ignoreNonTextNodeAttr: false,
                ignoreTextNodeAttr: false,
                parseAttributeValue: true,
                trimValues: true,
                // attrPrefix: '_',
                // textNodeName: '__text',
                // ignoreNonTextNodeAttr: false,
                // ignoreTextNodeAttr: false,
                // ignoreNameSpace: false,
                // parseAttributeValue: true,
            }).testsuites.testsuite[0].testcase[1]
        );
    });
});
