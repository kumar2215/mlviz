import { writeFileSync, renameSync } from 'node:fs';

// Checkpoints are saved between trials, outside every measurement window.
// Write beside the destination, then replace it, so a failed write never
// truncates the last complete checkpoint. Windows readers can briefly lock it.
export function writeCheckpoint(file, report, io = {}) {
  const write = io.write || writeFileSync;
  const rename = io.rename || renameSync;
  const pause = io.pause || (ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms));
  const temporary = file + '.' + process.pid + '.tmp';
  const contents = JSON.stringify(report, null, 2);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      write(temporary, contents);
      rename(temporary, file);
      return;
    } catch (error) {
      if (!['UNKNOWN', 'EBUSY', 'EACCES', 'EPERM'].includes(error.code) || attempt === 5) throw error;
      pause(100 * (attempt + 1));
    }
  }
}
