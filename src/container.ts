import { ConfigRepository } from './config';
import { ExtensionContext } from 'vscode';
import { Filesystem } from './filesystem';
import { ProcessFactory } from './process';
import { Store } from './store';
import { TextLineFactory } from './text-line';
import { Validator } from './validator';

const config = new ConfigRepository();
const files = new Filesystem();
const processFactory = new ProcessFactory();
const store = new Store();
const textLineFactory = new TextLineFactory(files);
const validator = new Validator(files);

interface Singleton {
    config: ConfigRepository;
    files: Filesystem;
    processFactory: ProcessFactory;
    store: Store;
    textLineFactory: TextLineFactory;
    validator: Validator;
    window?: any;
    workspace?: any;
    context?: ExtensionContext;
    extensionPath: string;
}

export class Container {
    protected singleton: Singleton = {
        config,
        files,
        processFactory,
        store,
        textLineFactory,
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

    get validator(): Validator {
        return this.getSingleton('validator');
    }

    get(key) {
        return this.getSingleton(key);
    }

    set(key, object) {
        return this.setSingleton(key, object);
    }

    protected getSingleton(key) {
        return this.singleton[key];
    }

    protected setSingleton(key, object) {
        this.singleton[key] = object;

        return this;
    }
}

export const container: Container = new Container();
