import { Element } from './Element';

describe('Element Test', () => {
    it('querySelectorAll should traverse arrays', () => {
        const data = {
            coverage: {
                project: {
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

    it('querySelectorAll should handle objects mixed with arrays', () => {
        const data = {
            coverage: {
                project: [
                    { file: { '@_name': 'file.php' } },
                    {
                        package: [
                            { file: { '@_name': 'file1.php' } },
                        ]
                    },
                    {
                        package: [
                            { file: { '@_name': 'file2.php' } }
                        ]
                    }
                ]
            }
        };

        const element = new Element(data);

        const files1 = element.querySelectorAll('coverage project package file');
        expect(files1.length).toEqual(2);
        expect(files1[0].getAttribute('name')).toEqual('file1.php');
        expect(files1[1].getAttribute('name')).toEqual('file2.php');

        const files2 = element.querySelectorAll('coverage project file');
        expect(files2.length).toEqual(1);
        expect(files2[0].getAttribute('name')).toEqual('file.php');
    });

    it('getAttribute should retrieve values', () => {
        const data = { '@_version': '1.0' };
        const element = new Element(data);
        expect(element.getAttribute('version')).toEqual('1.0');
    });
});
