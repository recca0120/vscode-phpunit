import * as path from 'path';

export const projectPath = (uri: string) => path.join(__dirname, 'fixtures/project-stub', uri);
