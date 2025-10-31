#!/usr/bin/env node
import fs from 'fs';
import YAML from 'yaml';
import express from 'express';
import ProcessManager from './processes/manager.js';
import process from 'process';

let advertiseMabrAvailability = false;


const args = process.argv.slice(2);
const cfg = YAML.parse(fs.readFileSync( args.length > 0 ? args[0] : 'workbench.yml', 'utf8'));

const app = express();
const pm = new ProcessManager();
const commands = pm.buildCommands(cfg);


if(cfg['avgen']){
  try {
    fs.rmSync(cfg.avgen.rdirs, { recursive: true, force: true });
    fs.mkdirSync(cfg.avgen.rdirs, { recursive: true });
  } catch (err) {}
}

try {
  fs.rmSync('./logs/', { recursive: true });
} catch (err) {}

if (cfg['avgen'] && cfg['avgen'].auto) pm.start('avgen', commands['avgen'], cfg['avgen'].verbose);
if (cfg['gateway'] && cfg['gateway'].auto) setTimeout(() => pm.start('gateway', commands['gateway'], cfg['gateway'].verbose), cfg['gateway'].delay || 5000);
if (cfg['mabr-server'] && cfg['mabr-server'].auto) setTimeout(() => pm.start('mabr-server', commands['mabr-server'], cfg['mabr-server'].verbose), cfg['mabr-server'].delay || 8000);

app.use(express.static('public'));

app.get('/api/start/:name', (req, res) => {
  const name = req.params.name;
  console.log('/start:' + req.params.name)
  if (!commands[name]) return res.status(404).json({ error: 'unknown process' });
  res.json(pm.start(name, commands[name]));
});

app.get('/api/stop/:name', (req, res) => {
  const name = req.params.name;
  res.json(pm.stop(name));
});

app.post('/api/toggle-mabr-availability', (req, res) => {
  advertiseMabrAvailability = !advertiseMabrAvailability;
  res.json({mabrAvailability: advertiseMabrAvailability});
});

app.get('/api/status', (req, res) => {
  const data = {
    processes: pm.status(),
    mabrAvailability: advertiseMabrAvailability
  };
  res.json(data);
});


const mabrIsAvailable = () => pm.status()["mabr-server"] == "running";

app.post('/api/slapos.allDocs.v0.compute_node_instance_list', (req, res) => {
  if (mabrIsAvailable()){
    const data = {
      "result_list": [
        {
          "state": "started",
          "compute_partition_id": "slappart2",
          "software_release_uri": "urn:1b54fdfa-55da-4896-9f53-028318ad51b5",
          "instance_guid": "SOFTINST-12",
          "title": "ROUTE Server"
        }
      ]
    };
    res.json(data);
  } else {
    res.json({ "result_list": [] });
  }
});

app.post('/api/slapos.get.v0.software_instance', (req, res) => {
  if (mabrIsAvailable()){
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
      "computer_guid": "COMP-0",
      "connection_parameters": {
        "route-server-ipv6": cfg['mabr-server'].output,
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
  } else {
    res.json({});
  }
});

app.listen(cfg.port, () => {
  console.log(`Workbench running on http://localhost:${cfg.port}`);
});
