// eslint-disable-next-line @typescript-eslint/naming-convention
const child_process = jest.requireActual('child_process');
const spawn = jest.spyOn(child_process, 'spawn');

module.exports = { ...child_process, spawn };
