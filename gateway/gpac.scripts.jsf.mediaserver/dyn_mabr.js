import {XMLHttpRequest} from 'xhr';

class DynMABR {
    
    static all = []
    
    static register(service_config){
        DynMABR.all.push(new DynMABR(service_config));
    }

    static getServiceById(id){
        return DynMABR.all.find(e => e.service_config.id == id);
    }

    static getServiceByUrl(url){
        return DynMABR.all.find(e => e.service_config.http == url);
    }

    constructor (service_config){
        this.service_config = service_config;
        this.polling = false;
        this.mcastServerLastCheckMs = 0;
        this.instanceMabrServerAddress = null;
        this.instanceMabrServerInstanceGuid = null;
    }

    log(level, msg){
        print(level, `[${this.service_config.id}] ${msg}`);
    }

    getMCastAddress(){
        if (this.polling?.readyState == 4 && ((sys.clock_ms() - this.mcastServerLastCheckMs) < 5000)){
            return this.instanceMabrServerAddress;
        }
        
        if (!this.polling){
            if (!this.instanceMabrServerInstanceGuid) {
                this.log(GF_LOG_DEBUG, `fetching instance GUID from slapos`);
                this.polling = this.slaposFindMabrServerInstanceID();
            } else {
                this.log(GF_LOG_DEBUG, `fetching mcast server address from slapos`);
                this.slaposGetMabrServerAddress();
                this.mcastServerLastCheckMs = sys.clock_ms();
            }
        }
        return this.instanceMabrServerAddress;
    }

    slaposFindMabrServerInstanceID(){
        const req = new XMLHttpRequest();

        req.onreadystatechange = () => {
            if (req.readyState === 4) {
                let instanceGuid = null;
                const ok = req.status >= 200 && req.status < 300;
                if (ok){
                    try {
                        const results = JSON.parse(req.responseText)["result_list"];
                        if (results){
                            for (let res of results){
                                if (res["state"] == "started"){
                                    instanceGuid = res["instance_guid"];
                                    this.log(GF_LOG_DEBUG, `fetched slapos instance GUID: ${instanceGuid}`);
                                    break;
                                }
                            }
                        }
                    } catch (err) {
                        this.log(GF_LOG_WARNING, `received invalid json payload from slapos: ${err}`);
                    }
                } else {
                    this.log(GF_LOG_INFO, `failed to fetch GUID from slapos: ${req.status}`);
                }
                this.instanceMabrServerInstanceGuid = instanceGuid;
                this.polling = null;
            }
        };
    
        req.onerror = (e) => {
            this.log(GF_LOG_WARNING, `failed to fetch GUID from slapos`);
            callback(false, e);
        };

        const uri = `${this.service_config.smartcd_api_endpoint}/slapos.allDocs.v0.compute_node_instance_list?cacheburst=${sys.clock_ms()}`;
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
            if (req.readyState === 4) {
                let address = null;
                const ok = req.status >= 200 && req.status < 300;
                if (ok){
                    try {
                        const connectionParams = JSON.parse(req.responseText)["connection_parameters"];
                        if (connectionParams){
                            address = connectionParams["route-server-ipv6"] || null;
                            s.log(GF_LOG_DEBUG, `fetched mcast server adress from slapos: ${address}`);
                        }
                    } catch (err){
                        s.log(GF_LOG_WARNING, `invalid response payload: ${err}`);
                    }
                } else {
                    s.log(GF_LOG_INFO, `failed to fetch mcast server address from slapos: ${req.status}`);
                    s.instanceMabrServerInstanceGuid = null;
                }
                s.instanceMabrServerAddress = address;
                s.polling = null;
            }
        };

        req.onerror = (e) => {
            s.log(GF_LOG_WARNING, `failed to fetch mcast server address from slapos: ${e}`) 
            callback(false, e);
        };

        const uri = `${s.service_config.smartcd_api_endpoint}/slapos.get.v0.software_instance?instance_guid=${s.instanceMabrServerInstanceGuid}&cacheburst=${sys.clock_ms()}`;
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
