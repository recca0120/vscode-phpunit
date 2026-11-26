import type { SpawnOptions } from 'node:child_process';

export type PathArg = { readonly path: string };
export type IntactArg = { readonly intact: string };
export type Arg = string | PathArg | IntactArg;

export type Invocation = Readonly<{
    php: string;
    phpArgs: readonly string[];
    binary: string;
    args: readonly Arg[];
    options: SpawnOptions;
}>;

export const pathArg = (path: string): PathArg => ({ path });
export const intactArg = (intact: string): IntactArg => ({ intact });
