import { Configuration } from '../src/Configuration';
import { RemotePathMapper } from '../src/Path';
import { TestCommand } from '../src/TestCommand/TestCommand';
import { phpUnitProject } from './fixtures';

export const givenCommand = (configuration: Record<string, unknown>, cwd?: string) => {
    const config = new Configuration({ php: 'php', ...configuration });
    const options = { cwd: cwd ?? phpUnitProject('') };
    const pathMapper = new RemotePathMapper(options, config.get('paths') as Record<string, string>);
    return new TestCommand(config, options, pathMapper);
};
