// biome-ignore-all lint/suspicious/noTemplateCurlyInString: VS Code / command template placeholders

/** VS Code variable: current working directory */
export const VAR_PWD = '${PWD}';

/** VS Code variable: workspace folder path */
export const VAR_WORKSPACE_FOLDER = '${workspaceFolder}';

/** Command template placeholder for PHP binary */
export const VAR_PHP = '${php}';

/** Command template placeholder for PHP arguments */
export const VAR_PHPARGS = '${phpargs}';

/** Command template placeholder for PHPUnit binary */
export const VAR_PHPUNIT = '${phpunit}';

/** Command template placeholder for PHPUnit arguments */
export const VAR_PHPUNITARGS = '${phpunitargs}';

/** Default command template: unquoted */
export const CMD_TEMPLATE = `${VAR_PHP} ${VAR_PHPARGS} ${VAR_PHPUNIT} ${VAR_PHPUNITARGS}`;

/** Default command template: quoted (for remote commands) */
export const CMD_TEMPLATE_QUOTED = `"${VAR_PHP} ${VAR_PHPARGS} ${VAR_PHPUNIT} ${VAR_PHPUNITARGS}"`;
