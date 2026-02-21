import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CloverParser } from './CloverParser';

describe('CloverParser', () => {
    const givenParser = () => new CloverParser();
    const fixturePath = (name: string) => join(__dirname, '../..', 'tests', 'fixtures', name);

    it('parseClover from fixture file', async () => {
        const result = await givenParser().parseClover(fixturePath('test1.clover.xml'));
        expect(result).toHaveLength(3);
        expect(result[1].lines).toHaveLength(6);
        expect(result[1].lines[0].line).toBe(9);
        expect(result[1].lines[0].count).toBe(2);
    });

    it('returns empty array when file not found', async () => {
        const result = await givenParser().parseClover('/nonexistent/file.xml');
        expect(result).toEqual([]);
    });

    it('parses single package with multiple files', () => {
        const result = givenParser().parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <package name="App\\Models">
      <file name="/app/Models/User.php">
        <line num="10" type="stmt" count="1"/>
        <metrics statements="1" coveredstatements="1"/>
      </file>
      <file name="/app/Models/Post.php">
        <line num="5" type="stmt" count="0"/>
        <metrics statements="1" coveredstatements="0"/>
      </file>
    </package>
    <metrics files="2" statements="2" coveredstatements="1"/>
  </project>
</coverage>`);

        expect(result.map((f) => f.filePath)).toEqual([
            '/app/Models/User.php',
            '/app/Models/Post.php',
        ]);
    });

    it('parses covered and total from metrics', () => {
        const result = givenParser().parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <file name="/app/Foo.php">
      <metrics statements="5" coveredstatements="3"/>
    </file>
  </project>
</coverage>`);

        expect(result[0].covered).toBe(3);
        expect(result[0].total).toBe(5);
    });

    it('parses multiple packages', () => {
        const result = givenParser().parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <package name="App\\Models">
      <file name="/app/Models/User.php">
        <metrics statements="1" coveredstatements="1"/>
      </file>
    </package>
    <package name="App\\Services">
      <file name="/app/Services/PaymentService.php">
        <metrics statements="2" coveredstatements="1"/>
      </file>
    </package>
    <metrics files="2" statements="3" coveredstatements="2"/>
  </project>
</coverage>`);

        expect(result.map((f) => f.filePath)).toEqual([
            '/app/Models/User.php',
            '/app/Services/PaymentService.php',
        ]);
    });

    it('parses global files without package', () => {
        const result = givenParser().parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <file name="/app/helpers.php">
      <metrics statements="1" coveredstatements="0"/>
    </file>
    <metrics files="1" statements="1" coveredstatements="0"/>
  </project>
</coverage>`);

        expect(result.map((f) => f.filePath)).toEqual(['/app/helpers.php']);
    });

    it('parses mixed global files and packages', () => {
        const result = givenParser().parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <package name="App\\Models">
      <file name="/app/Models/User.php">
        <metrics statements="1" coveredstatements="1"/>
      </file>
    </package>
    <package name="App\\Services">
      <file name="/app/Services/PaymentService.php">
        <metrics statements="2" coveredstatements="1"/>
      </file>
    </package>
    <file name="/app/helpers.php">
      <metrics statements="0" coveredstatements="0"/>
    </file>
    <metrics files="3" statements="3" coveredstatements="2"/>
  </project>
</coverage>`);

        expect(result.map((f) => f.filePath)).toEqual([
            '/app/helpers.php',
            '/app/Models/User.php',
            '/app/Services/PaymentService.php',
        ]);
    });

    it('parses line coverage entries', () => {
        const result = givenParser().parseCloverXml(`<?xml version="1.0" encoding="UTF-8"?>
<coverage generated="1">
  <project timestamp="1">
    <file name="/app/Foo.php">
      <line num="10" type="stmt" count="2"/>
      <line num="15" type="stmt" count="0"/>
      <metrics statements="2" coveredstatements="1"/>
    </file>
  </project>
</coverage>`);

        expect(result[0].lines).toEqual([
            { line: 10, count: 2 },
            { line: 15, count: 0 },
        ]);
    });
});
