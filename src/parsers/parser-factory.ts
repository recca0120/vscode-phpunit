import { CachableFilesystem, FilesystemInterface } from '../filesystem';

import { JUnitParser } from './junit';
import { Parser } from './parser';
import { TeamCityParser } from './teamcity';
import { TextLineFactory } from '../text-line';

export class ParserFactory {
    constructor(
        protected files: FilesystemInterface = new CachableFilesystem(),
        protected textLineFactory: TextLineFactory = new TextLineFactory()
    ) {}

    public create(name: string): Parser {
        switch (name.toLowerCase()) {
            case 'teamcity':
                return new TeamCityParser(this.files, this.textLineFactory);
            default:
                return new JUnitParser(this.files, this.textLineFactory);
        }
    }
}
