import { CommandOptions } from '../src/command-options';

describe('Command Options Tests', () => {
    it('filter options', () => {
        const options = new CommandOptions(['--log-junit', 'test.xml', '--teamcity', '-d', 'a=b', '-d', 'c=d', 'ssh']);

        expect(options.has('--log-junit')).toBe(false);
        expect(options.has('--teamcity')).toBe(true);

        options.put('--log-junit', 'junit.xml');

        expect(options.toArray()).toEqual(['ssh', '-d', 'a=b', '-d', 'c=d', '--log-junit', 'junit.xml', '--teamcity']);
    });
});
