import { Element } from './Element';

describe('Element', () => {
    it('querySelectorAll should traverse arrays', () => {
        const data = {
            root: {
                // 'list' is an array of objects
                list: [
                    { item: { '@_name': 'A' } },
                    { item: { '@_name': 'B' } }
                ]
            }
        };

        const element = new Element(data);

        // Selector 'root list item' requires traversing 'list' array to find 'item'
        const results = element.querySelectorAll('root list item');

        expect(results.length).toEqual(2);
        expect(results[0].getAttribute('name')).toEqual('A');
        expect(results[1].getAttribute('name')).toEqual('B');
    });

    it('querySelectorAll should handle objects mixed with arrays', () => {
        const data = {
            coverage: {
                project: {
                    // 'package' is an array here (multi-namespace case)
                    package: [
                        { file: { '@_name': 'file1.php' } },
                        { file: { '@_name': 'file2.php' } }
                    ]
                }
            }
        };

        const element = new Element(data);
        const files = element.querySelectorAll('coverage project package file');

        expect(files.length).toEqual(2);
        expect(files[0].getAttribute('name')).toEqual('file1.php');
        expect(files[1].getAttribute('name')).toEqual('file2.php');
    });

    it('getAttribute should retrieve values', () => {
        const data = { '@_version': '1.0' };
        const element = new Element(data);
        expect(element.getAttribute('version')).toEqual('1.0');
    });
});
