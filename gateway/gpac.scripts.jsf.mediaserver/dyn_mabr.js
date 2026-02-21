import {XMLHttpRequest} from 'xhr';
import { Sys as sys } from 'gpaccore'

const cacheBurst = () => sys.clock_ms();

class DynMABR {
    
    static all = []
    
    static register(service_config){
        DynMABR.all.push(new DynMABR(service_config));
    }

    static getServiceById(id){
        return DynMABR.all.find(e => e.service_config.id == id);
    }

    static getServiceByUrl(url){
        print(GF_LOG_WARNING, `[gateway] ${DynMABR.all} services - getServiceByUrl ${url}`);
        return DynMABR.all.find(e => {
            print(GF_LOG_WARNING, `[gateway] == ${url}`);
            print(GF_LOG_WARNING, `[gateway] != ${e.service_config.http}`);
            return e.service_config.http == url;
        });
    }

    constructor (service_config){
        this.service_config = service_config;
        this.polling = false;
        this.mcastServerLastCheckMs = 0;
        this.instanceMabrServerAddress = null;
        this.instanceMabrServerInstanceGuid = null;
    }

    log(level, msg){
        print(level, `[gateway/${this.service_config.id}] ${msg}`);
    }

    getMCastAddress(){
        if (this.polling?.readyState == 4 && ((sys.clock_ms() - this.mcastServerLastCheckMs) < 5000)){
            this.log(GF_LOG_WARNING, `get_mcast_address() throttling`);
            return this.instanceMabrServerAddress;
        }
        
        if (!this.polling){
            if (!this.instanceMabrServerInstanceGuid) {
                this.log(GF_LOG_WARNING, `get_mcast_address() 1/2 - fetch instance GUID`);
                this.polling = this.slaposFindMabrServerInstanceID();
            } else {
                this.log(GF_LOG_WARNING, `get_mcast_address() 2/2 - fetch server address - ${sys.clock_ms() - this.mcastServerLastCheckMs}ms`);
                this.slaposGetMabrServerAddress();
                this.mcastServerLastCheckMs = sys.clock_ms();
            }
        }
        return this.instanceMabrServerAddress;
    }

    slaposFindMabrServerInstanceID(){
        const req = new XMLHttpRequest();
        // const s = this;

        req.onreadystatechange = () => {
           this.log(GF_LOG_WARNING, `1/2 - slaposFindMabrServerInstanceID - onreadystatechange: ${req.readyState}`);
            if (req.readyState === 4) {
                let instanceGuid = null;
                const ok = req.status >= 200 && req.status < 300;
                if (ok){
                    this.log(GF_LOG_WARNING, `fetched compute_node_instance_list`);
                    try {
                        const results = JSON.parse(req.responseText)["result_list"];
                        if (results){
                            for (let res of results){
                                this.log(GF_LOG_WARNING, `instance_guid: ${res["instance_guid"]}`);
                                if (res["state"] == "started"){
                                    instanceGuid = res["instance_guid"];
                                    this.log(GF_LOG_WARNING, `fetched slapos instance GUID: ${instanceGuid}`);
                                    break;
                                }
                            }
                        }
                    } catch (err) {
                        this.log(GF_LOG_WARNING, `invalid response payload: ${err}`);
                    }
                } else {
                    this.log(GF_LOG_WARNING, `failed to fetch instance GUID from slapos: ${req.status}`);
                }
                this.instanceMabrServerInstanceGuid = instanceGuid;
                this.polling = null;
            }
        };
    
        req.onerror = (e) => {
            this.log(GF_LOG_WARNING, `slaposFindMabrServerInstanceID.onerror - ${req.readyState} - ${req.status} - ${req.statusText}`);
            callback(false, e);
        };

        const uri = `${this.service_config.smartcd_api_endpoint}/slapos.allDocs.v0.compute_node_instance_list?cacheburst=${cacheBurst()}`;
        req.open("POST", uri);
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify({
            "software_release_uri": this.service_config.smartcd_service_software_release_urn,
            "computer_guid": this.service_config.smartcd_service_computer_guid
        }));
        this.polling = req;
    }

    slaposGetMabrServerAddress(){
        const s = this;
        const req = new XMLHttpRequest();

        req.onreadystatechange = () => {
            s.log(GF_LOG_WARNING, `2/2 - slaposGetMabrServerAddress - onreadystatechange: ${req.readyState}`);
            if (req.readyState === 4) {
                let address = null;
                const ok = req.status >= 200 && req.status < 300;
                s.log(GF_LOG_WARNING, `fetched mcast server address`);
                if (ok){
                    try {
                        const connectionParams = JSON.parse(req.responseText)["connection_parameters"];
                        if (connectionParams){
                            address = connectionParams["route-server-ipv6"] || null;
                            s.log(GF_LOG_WARNING, `fetched mcast server adress from slapos: ${address}`);
                        }
                    } catch (err){
                        s.log(GF_LOG_WARNING, `invalid response payload: ${err}`);
                    }
                } else {
                    s.log(GF_LOG_WARNING, `failed to fetch mcast server address from slapos: ${req.status}`);
                    s.instanceMabrServerInstanceGuid = null;
                }
                s.instanceMabrServerAddress = address;
                s.polling = null;
            }
        };

        req.onerror = (e) => {
            s.log(GF_LOG_WARNING, `failed to fetch mcast server - onerror - ${req.readyState} - ${req.status} - ${req.statusText}`) 
            callback(false, e);
        };

        const uri = `${s.service_config.smartcd_api_endpoint}/slapos.get.v0.software_instance?instance_guid=${s.instanceMabrServerInstanceGuid}&cacheburst=${cacheBurst()}`;
        req.open("POST", uri);
        req.setRequestHeader("Content-Type", "application/json");
        req.send(JSON.stringify({
            "instance_guid": s.instanceMabrServerInstanceGuid
        }));
        s.polling = req;
    }

}

export function init(service_config) 
{
    DynMABR.register(service_config);
    return true;
}

export function service_activation(do_load, serviceID)
{
    DynMABR.getServiceById(serviceID)?.log(GF_LOG_INFO, `service_activation - do_load:${do_load}`);
    return null;
}

export function quality_activation(do_activate, serviceID, periodID, adaptationSetID, representationID)
{
    DynMABR.getServiceById(serviceID)?.log(GF_LOG_INFO, `quality_activation - do_activate:${do_activate}, periodID:${periodID}, adaptationSetID:${adaptationSetID}, representationID:${representationID}`);
    return true;
}

export function get_mcast_address(service_url)
{
    return DynMABR.getServiceByUrl(service_url)?.getMCastAddress();
}
