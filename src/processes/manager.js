import { Worker } from 'worker_threads';
import path from 'path';

export default class ProcessManager {
  constructor() {
    this.processes = {};
  }

  buildCommands(cfg) {
    const avgenCmd = `gpac -lu -logs=ncl:all@warning -i avgen:fps=25:sr=48000 ffenc:c=avc:x264-params=keyint=48:min-keyint=48:no-scenecut ffenc:c=aac reframer:rt=on -o ${cfg.avgen.uri}:segdur=1.92:profile=live:dmode=dynamic:stl:tsb=3600:maxp=0:maxc=0:rdirs=${cfg.avgen.rdirs}`;
    const gatewayCmd = `gpac -lu -logs=ncl:all@warning:script:console@info mediaserver:port=${cfg.gateway.port}:scfg=${cfg.gateway.scfg}:rdirs=${cfg.gateway.rdirs}`;
    const mabrOrigin = cfg['mabr-server'].origin === 'avgen' ? cfg.avgen.uri : cfg['mabr-server'].origin;
    const mabrCmd = `gpac -lu -logs=ncl:all@warning -i ${mabrOrigin} dashin:forward=file:split_as -o ${cfg['mabr-server'].output}`;
    return { avgen: avgenCmd, gateway: gatewayCmd, 'mabr-server': mabrCmd };
  }

  start(name, command, verbose) {
    console.log(`Starting [${name}]: ${command})`);
    if (this.processes[name]?.status == 'running') return { status: 'already running' };
    const worker = new Worker(path.resolve('./src/processes/worker.js'), {
      workerData: { name, command, verbose }
    });
    this.processes[name] = { worker, status: 'running' };

    worker.on('message', msg => {
      console.log(msg);
      if (msg.event === 'exit' || msg.event === 'stopped')
        this.processes[name].status = 'stopped';
    });
    worker.on('exit', () => {
      this.processes[name].status = 'stopped';
    });

    return { status: 'started' };
  }

  stop(name) {
    const proc = this.processes[name];
    if (!proc || proc.status !== 'running') return { status: 'not running' };
    proc.worker.postMessage('stop');
    proc.status = 'stopping';
    return { status: 'stopping' };
  }

  status() {
    const res = {};
    for (const [name, p] of Object.entries(this.processes)){
      res[name] = name in this.processes ? this.processes[name].status : 'stopped';
    }

    return res;
  }
  
}
