import { TestEventCollection } from './../src/TestEventCollection';
import { projectPath } from './helpers';
import { TestCollection } from '../src/TestCollection';

describe('TestEventCollection', () => {
    const path = projectPath('');
    const suites = new TestCollection();
    const events = new TestEventCollection();

    beforeAll(async () => {
        await suites.load(path);
    });

    it('instance', () => {
        expect(events).toBeInstanceOf(TestEventCollection);
    });

    it('put test suite or test info', async () => {
        const tests = Array.from(suites.all().values());
        events.put(tests);

        expect(events.all()[0]).toEqual(
            jasmine.objectContaining({
                state: 'running',
                type: 'suite',
                suite: tests[0],
            })
        );
    });
});
