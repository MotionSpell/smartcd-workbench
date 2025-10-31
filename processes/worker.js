import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

let proc;

function start() {
  const { name, command, verbose } = workerData;

  // Ensure log directory exists
  const logDir = path.resolve('logs');
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

  // Create log file stream
  const logFile = path.join(logDir, `${name}.log`);
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  logStream.write(`\n\n===== [${new Date().toISOString()}] Starting ${name} =====\n`);
  logStream.write(`Command: ${command}\n\n`);
  proc = spawn(command, { shell: true });

  proc.stdout.on('data', data => {
    const msg = data.toString();
    if (verbose){
      console.log(`[${name}] ${msg}`)
    }
    logStream.write(`[STDOUT] ${msg}`);
  });

  proc.stderr.on('data', data => {
    const msg = data.toString();
    if (verbose){
      console.warn(`[${name}] ${msg}`)
    }
    logStream.write(`[STDERR] ${msg}`);
  });

  proc.on('exit', code => {
    logStream.write(`\n===== ${name} exited with code ${code} =====\n`);
    logStream.end();
    parentPort.postMessage({ event: 'exit', name, code });
  });

}

parentPort.on('message', msg => {
  if (msg === 'stop' && proc) {
    proc.kill();
    parentPort.postMessage({ event: 'stopped' });
  }
});

start();
