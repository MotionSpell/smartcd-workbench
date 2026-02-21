#!/usr/bin/env node
import fs from 'fs';
import YAML from 'yaml';
import express from 'express';
import ProcessManager from './processes/manager.js';
import process from 'process';

const args = process.argv.slice(2);
const cfg = YAML.parse(fs.readFileSync( args.length > 0 ? args[0] : 'cfg/local/route.yml', 'utf8'));

const app = express();
const pm = new ProcessManager();
// const commands = pm.buildCommands(cfg);

// if(cfg['avgen']){
//   try {
//     fs.rmSync(cfg.avgen.rdirs, { recursive: true, force: true });
//     fs.mkdirSync(cfg.avgen.rdirs, { recursive: true });
//   } catch (err) {}
// }

try {
  fs.rmSync('./logs/', { recursive: true });
} catch (err) {}

// if (cfg['avgen'] && cfg['avgen'].auto) pm.start('avgen', commands['avgen'], cfg['avgen'].verbose);
// if (cfg['gateway'] && cfg['gateway'].auto) setTimeout(() => pm.start('gateway', commands['gateway'], cfg['gateway'].verbose), cfg['gateway'].delay || 5000);
// if (cfg['mabr-server'] && cfg['mabr-server'].auto) setTimeout(() => pm.start('mabr-server', commands['mabr-server'], cfg['mabr-server'].verbose), cfg['mabr-server'].delay || 8000);

if (cfg.gateway) {
  // :cors=on is needed to query stats from the page  
  const cmd = `gpac -lu -logs=ncl:all@warning:script:console@info mediaserver:port=${cfg.gateway.port}:scfg=${cfg.gateway.scfg}:cors=on:rdirs=${cfg.gateway.rdirs}`;
  pm.start('gateway', cmd);
}

const mcast_cfg = cfg['mcast'];

app.use(express.static('src/public'));

app.post('/api/mcast/start/:serviceId', (req, res) => {
  const serviceId = req.params.serviceId;
  if (pm.status()[serviceId] == "running") return res.status(200).json({ status: "already running" });
  const service_mcast_cfg = mcast_cfg.find(e => e.service_id == serviceId);
  const mcast_output = service_mcast_cfg.mcast_output;
  const http_origin = service_mcast_cfg.http_origin;
  if (!service_mcast_cfg){
    return res.status(400).json({"error": `invalid serviceId: ${serviceId}`});
  }
  if ((!mcast_output) || (!http_origin)){
    return res.status(400).json({"error": `invalid service configuration`});
  }
  const logs = !!service_mcast_cfg.logs ? service_mcast_cfg.logs : "all@warning:script:console@debug";
  const cmd =  `gpac -lu -logs=ncl:${logs} -i ${http_origin} dashin:forward=file:split_as -o ${mcast_output}`;
  res.json(pm.start(serviceId, cmd));
});

app.post('/api/mcast/stop/:serviceId', (req, res) => {
  const serviceId = req.params.serviceId;
  res.json(pm.stop(serviceId));
});

app.post('/api/mcast/status/:serviceId', (req, res) => {
  const serviceId = req.params.serviceId;
  const serviceStatus = pm.status()[serviceId]
});

// app.get('/api/start/:name', (req, res) => {
//   const name = req.params.name;
//   console.log('/start:' + req.params.name)
//   if (!commands[name]) return res.status(404).json({ error: 'unknown process' });
//   res.json(pm.start(name, commands[name]));
// });
// 
// app.get('/api/stop/:name', (req, res) => {
//   const name = req.params.name;
//   res.json(pm.stop(name));
// });

app.get('/api/status', (req, res) => {
  const data = {
    processes: pm.status(),
    mcast_cfg: mcast_cfg
  };
  res.json(data);
});

app.post('/api/slapos.allDocs.v0.compute_node_instance_list', express.json(), (req, res) => {
  const results = [];
  for (const serviceId of Object.keys(pm.status())){
    const service_mcast_cfg = mcast_cfg.find(e => e.service_id == serviceId);
    if (service_mcast_cfg){
      results.push({
        "state": "started",
        "compute_partition_id": "slappart2",
        "software_release_uri": "urn:1b54fdfa-55da-4896-9f53-028318ad51b5",
        "instance_guid": service_mcast_cfg["slapos_computer_guid"],
        "title": "ROUTE Server"
      });
    }
  }
  res.json({ "result_list": results });
});

app.post('/api/slapos.get.v0.software_instance', express.json(), (req, res) => {
  // const params = JSON.parse(req.body); // @FIXME: must use JSON for compatibiltiy
  if (!req.query?.instance_guid) return res.status(400).send("missing query parameter `?instance_guid=`"); // instead of query param
  let slapos_computer_guid = req.query.instance_guid; 
  let service_mcast_cfg = mcast_cfg.find(e => e.slapos_computer_guid == slapos_computer_guid);
  if (!service_mcast_cfg){
    console.warn("no mabr server running & matching instance_guid - slapos.get.v0.software_instance")
    return res.json({});
  }
  if (!service_mcast_cfg["mcast_output"]){
    console.warn("invalid state! mcast_output not configured - slapos.get.v0.software_instance")
    return res.json({});
  }
  const data = {
    "software_release_uri": "string",
    "full_ip_list": [
      [
        "10.0.0.0"
      ]
    ],
    "instance_guid": "SOFTINST-12",
    "root_instance_title": "ROUTE Server",
    "title": "ROUTE Server",
    "compute_partition_id": "slappart2",
    "access_status_message": "OK",
    "state": "started",
    "sla_parameters": {},
    "computer_guid": slapos_computer_guid,
    "connection_parameters": {
      "route-server-ipv6": service_mcast_cfg["mcast_output"],
      "route-server-url": "https://route.scd/"
    },
    "software_type": "default",
    "processing_timestamp": 0,
    "shared": false,
    "parameters": {},
    "ip_list": [
      [
        "10.0.0.0"
      ]
    ]
  };
  res.json(data);
});

app.listen(cfg.port, () => {
  console.log(`API available at http://127.0.0.1:${cfg.port}`);
});
