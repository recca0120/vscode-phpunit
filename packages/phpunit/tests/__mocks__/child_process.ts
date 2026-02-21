// eslint-disable-next-line @typescript-eslint/naming-convention
const child_process = await vi.importActual<typeof import('child_process')>('child_process');
const spawn = vi.spyOn(child_process, 'spawn');

export { spawn };
export const { exec, execSync, execFile, execFileSync, fork, spawnSync } = child_process;
