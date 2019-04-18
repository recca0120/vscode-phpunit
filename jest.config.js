module.exports = {
	"roots": [
		"<rootDir>/client",
		"<rootDir>/server"
	],
	"transform": {
		"^.+\\.tsx?$": "ts-jest"
	},
	"testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$",
	"moduleNameMapper": {
		// "vscode": "<rootDir>/client/tests/vscode.ts"
	}
}