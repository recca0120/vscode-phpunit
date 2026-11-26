import type { SpawnOptions } from 'node:child_process';
import type { PathMapper } from './PathMapper';
import { type PathMapping, PrefixPathMapper } from './PrefixPathMapper';
import { VariableResolver } from './VariableResolver';

export type Path = { [p: string]: string };

export class PathReplacer implements PathMapper {
    private readonly variables: VariableResolver;
    private readonly mapper: PrefixPathMapper;

    constructor(
        private options: SpawnOptions = {},
        paths?: Path,
        workspaceFolder?: string,
    ) {
        const cwd = this.fixWindowsDriveLetter(
            (this.options?.cwd as string) ?? (process.env.cwd as string),
        );
        this.variables = new VariableResolver(
            cwd,
            workspaceFolder ? this.fixWindowsDriveLetter(workspaceFolder) : cwd,
        );

        const mappings: PathMapping[] = [];
        for (const [key, value] of Object.entries(paths ?? {})) {
            const remote = this.variables.resolve(value);
            if (!this.variables.has(key)) {
                mappings.push({ local: key, remote });
                continue;
            }

            const local = this.variables.get(key);
            if (local) {
                mappings.push({ local, remote });
            }
        }
        this.mapper = new PrefixPathMapper(mappings, cwd);
    }

    resolveVariables(path: string) {
        return this.variables.resolve(path);
    }

    toLocal(path: string) {
        return this.mapper.toLocal(path);
    }

    toRemote(path: string) {
        return this.mapper.toRemote(this.variables.resolve(path));
    }

    private fixWindowsDriveLetter(path: string) {
        return /^\\/.test(path) ? `c:${path}` : path;
    }
}
