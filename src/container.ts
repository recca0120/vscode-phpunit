import { ConfigRepository } from './config';
import { ExtensionContext } from 'vscode';
import { Filesystem } from './filesystem';
import { ParserFactory } from './parser';
import { ProcessFactory } from './process';
import { Store } from './store';
import { TextLineFactory } from './text-line';
import { Validator } from './validator';

const config = new ConfigRepository();
const files = new Filesystem();
const processFactory = new ProcessFactory();
const store = new Store();
const textLineFactory = new TextLineFactory(files);
const parserFactory = new ParserFactory(files, textLineFactory);
const validator = new Validator(files);

interface Singleton {
    config: ConfigRepository;
    files: Filesystem;
    processFactory: ProcessFactory;
    store: Store;
    textLineFactory: TextLineFactory;
    parserFactory: ParserFactory;
    validator: Validator;
    window?: any;
    workspace?: any;
    context?: ExtensionContext;
    extensionPath: string;
}

export class Container {
    public name: string = 'PHPUnit';

    protected singleton: Singleton = {
        config,
        files,
        processFactory,
        store,
        textLineFactory,
        parserFactory,
        validator,
        workspace: {
            rootPath: __dirname,
        },
        extensionPath: __dirname,
    };

    get basePath(): string {
        return this.workspace.rootPath;
    }

    get extensionPath(): string {
        return this.getSingleton('extensionPath');
    }

    get window(): any {
        return this.getSingleton('window');
    }

    get workspace(): any {
        return this.getSingleton('workspace');
    }

    get config(): ConfigRepository {
        return this.getSingleton('config');
    }

    get context(): ExtensionContext {
        return this.getSingleton('context');
    }

    get files(): Filesystem {
        return this.getSingleton('files');
    }

    get processFactory(): ProcessFactory {
        return this.getSingleton('processFactory');
    }

    get store(): Store {
        return this.getSingleton('store');
    }

    get textLineFactory(): TextLineFactory {
        return this.getSingleton('textLineFactory');
    }

    get parserFactory(): ParserFactory {
        return this.getSingleton('parserFactory');
    }

    get validator(): Validator {
        return this.getSingleton('validator');
    }

    get(key): any {
        return this.getSingleton(key);
    }

    set(key, object): Container {
        return this.setSingleton(key, object);
    }

    protected getSingleton(key): any {
        return this.singleton[key];
    }

    protected setSingleton(key, object): Container {
        this.singleton[key] = object;

        return this;
    }
}

export const container: Container = new Container();
