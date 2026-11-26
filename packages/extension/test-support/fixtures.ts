import { phpUnitProject } from '@vscode-phpunit/phpunit/testing';

export const phpUnitFixture = {
    root: phpUnitProject(''),
    testsFolder: phpUnitProject('tests'),
    phpUnitXmlDist: phpUnitProject('phpunit.xml.dist'),
    assertionsTest: phpUnitProject('tests/AssertionsTest.php'),
    calculatorTest: phpUnitProject('tests/CalculatorTest.php'),
    cursorInTestPassed: { line: 17, character: 14 },
    items: {
        testsNamespace: 'namespace:Tests',
        assertions: 'Assertions (Tests\\Assertions)',
        assertionsPassed: 'Assertions (Tests\\Assertions)::Passed',
        attribute: 'Attribute (Tests\\Attribute)',
        calculator: 'Calculator (Tests\\Calculator)',
    },
};
