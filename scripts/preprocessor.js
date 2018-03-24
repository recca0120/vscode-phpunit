const tsc = require('typescript');
const tsConfig = require('../server/tsconfig.json');

module.exports = {
    process(src, path) {
        if (path.endsWith('.ts')) {
            return tsc.transpile(
                src,
                tsConfig.compilerOptions,
                path, []
            );
        }
        return src;
    },
};