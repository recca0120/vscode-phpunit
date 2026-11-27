// biome-ignore-all lint/suspicious/noTemplateCurlyInString: VS Code / command template placeholders

export const VAR_PWD = '${PWD}';

export const VAR_CWD = '${cwd}';

export const VAR_WORKSPACE_FOLDER = '${workspaceFolder}';

export const VAR_WORKSPACE_FOLDER_BASENAME = '${workspaceFolderBasename}';

export const VAR_USER_HOME = '${userHome}';

export const VAR_PATH_SEPARATOR = '${pathSeparator}';

export const VAR_PATH_SEPARATOR_SHORT = '${/}';

export const VAR_PHP = '${php}';

export const VAR_PHPARGS = '${phpargs}';

export const VAR_PHPUNIT = '${phpunit}';

export const VAR_PHPUNITARGS = '${phpunitargs}';

export const CMD_TEMPLATE = `${VAR_PHP} ${VAR_PHPARGS} ${VAR_PHPUNIT} ${VAR_PHPUNITARGS}`;

export const CMD_TEMPLATE_QUOTED = `"${VAR_PHP} ${VAR_PHPARGS} ${VAR_PHPUNIT} ${VAR_PHPUNITARGS}"`;

export const EOL = '\r\n';
