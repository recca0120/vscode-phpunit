const fs = require('fs');
const path = require('path');

const phpService = process.argv[2] || 'php83';
const project = process.argv[3] || 'phpunit-stub';
const composeFile = process.argv[4];

const fixturesDir = path.dirname(composeFile);
const projectDir = path.resolve(fixturesDir, project);
const settingsDir = path.join(projectDir, '.vscode');
fs.mkdirSync(settingsDir, { recursive: true });

const settings = {
    "phpunit.command": `docker compose -f ${composeFile} run --rm --no-deps -T ${phpService} "\${php}" \${phpargs} "\${phpunit}" \${phpunitargs}`,
    "phpunit.paths": {
        [projectDir]: `/app/${project}`
    }
};

fs.writeFileSync(
    path.join(settingsDir, 'settings.json'),
    JSON.stringify(settings, null, 4) + '\n'
);

console.log(`Configured ${project} for ${phpService}`);
