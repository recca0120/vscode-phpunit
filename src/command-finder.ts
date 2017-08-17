import { execSync } from 'child_process';

export class CommandFinder {
    public find(command: string): string {
        let result = null;
        try {
            result = execSync(`which "${command}"`).toString();
        } catch (e) {
            result = execSync(`where "${command}"`).toString();
        }

        return result;
    }
}