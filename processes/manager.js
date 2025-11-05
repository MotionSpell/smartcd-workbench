import { Worker } from 'worker_threads';
import path from 'path';

export default class ProcessManager {
  constructor() {
    this.processes = {};
  }

  commandNames(){
    return ['avgen', 'gateway', 'mabr-server']
  }

  buildCommands(cfg) {
    const avgenCmd = `gpac -logs=ncl -i avgen:fps=25:sr=48000 ffenc:c=avc:x264-params=keyint=48:min-keyint=48:no-scenecut ffenc:c=aac -o ${cfg.avgen.uri}:segdur=1.92:profile=live:dmode=dynamic:tsb=120:maxp=0:maxc=0:rdirs=${cfg.avgen.rdirs}`;
    const gatewayCmd = `gpac -logs=ncl:http@info:route@info mediaserver:port=${cfg.gateway.port}:scfg=${cfg.gateway.scfg}`;
    const mabrOrigin = cfg['mabr-server'].origin === 'avgen' ? cfg.avgen.uri : cfg['mabr-server'].origin;
    const mabrCmd = `gpac -logs=ncl:http@info:route@info -i ${mabrOrigin} dashin:forward=file -o ${cfg['mabr-server'].output}`;
    return { avgen: avgenCmd, gateway: gatewayCmd, 'mabr-server': mabrCmd };
  }

  start(name, command, verbose) {
    console.log(`Starting [${name}]: ${command})`);
    if (this.processes[name]?.status == 'running') return { status: 'already running' };
    const worker = new Worker(path.resolve('processes/worker.js'), {
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
    for (let name of this.commandNames()){
      res[name] = name in this.processes ? this.processes[name].status : 'stopped';
    }

    return res;
  }
  
}
