#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import express from 'express';
import ProcessManager from './processes/manager.js';
import process from 'process';

const args = process.argv.slice(2, process.argv.length);
const cfg_path = args.length > 0 ? args[0] : 'cfg/local/route.yml';
const cfg = YAML.parse(fs.readFileSync( cfg_path, 'utf8'));

const defaultGatewayConfig = () => {
  const scfg = []; 
  let i = 1;
  for (var s of cfg.mcast){
    scfg.push({
      "id": s.serviceId ? s.serviceId : `service${i}`,
      "local": s.local ? s.local : `/service${i}/Manifest.mpd`,
      "timeshift": s.timeshift ? s.timeshift : 3000,
      "http": s.http_origin ? s.http_origin : "https://live-linear.dvb.org/livesim2/tsbd_30/spd_4/utc_httpisoms/start_1735689600/1005_av1_hd_sdr_heaac/manifest_livesim.mpd",
      "repair": s.repair ? s.repair : true,
      "js": s.js ? s.js : "dyn_mabr", // assuming `dyn_mabr.js` has been copied to `/usr/local/share/gpac/scripts/jsf/mediaserver`
      "smartcd_api_endpoint": s.smartcd_api_endpoint ? s.smartcd_api_endpoint : "http://127.0.0.1:3000/api",
      "smartcd_service_software_release_urn": s.smartcd_service_software_release_urn ? s.smartcd_service_software_release_urn : "urn:1b54fdfa-55da-4896-9f53-028318ad51b5",
      "smartcd_service_computer_guid": s.smartcd_service_computer_guid ? s.smartcd_service_computer_guid :  `COMP-${i}`
    });
    i++;
  }
  return scfg;
}

const defaultGatewayConfigPath = () => {
  return path.format({
    dir: path.dirname(cfg_path),
    name: path.basename(cfg_path, path.extname(cfg_path)),
    ext: '.scfg'
  });
}

// helper to generate gateway config.scfg from config.yml
if (args.length > 1 && args[1] == "scfg"){
  const scfgPath = defaultGatewayConfigPath();
  const jsonData = JSON.stringify(defaultGatewayConfig(), null, 2);
  fs.writeFile(scfgPath, jsonData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }
    console.log('generated gateway config: ' +scfgPath );
  });
} else {

  const app = express();
  const pm = new ProcessManager();

  try {
    fs.rmSync('./logs/', { recursive: true });
  } catch (err) {}

  if (cfg.gateway) {    
    let port = cfg.gateway.port ? cfg.gateway.port : 8081;
    let scfg = cfg.gateway.scfg ? cfg.gateway.scfg : defaultGatewayConfigPath();
    let logs = cfg.gateway.logs ? cfg.gateway.logs : "all@warning:route:http@info";
    const cmd = cfg.gateway.cmd ? cfg.gateway.cmd : `gpac -lu -logs=ncl:${logs} mediaserver:port=${port}:scfg=${scfg}:cors=on`; // :cors=on is needed to query stats from the page
    pm.start('gateway', cmd);
  }

  const mcast_cfg = cfg.mcast;

  app.use(express.static('src/public'));

  app.post('/api/gateway/scfg', (req, res) => {
    res.json(defaultGatewayConfig());
  });

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

  app.get('/api/status', (req, res) => {
    const data = {
      processes: pm.status(),
      mcast_cfg: mcast_cfg,
      gateway_cfg: cfg.gateway
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

}

