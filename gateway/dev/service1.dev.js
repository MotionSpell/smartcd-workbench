import {XMLHttpRequest} from 'xhr';
// import {now} from 'os';


// SERVICE ID / SPECIFIC INFORMATION ? 
const ORCHESTRATOR_URI =  "http://smartcd.api:3000/api";
const SOFTWARE_RELEASE_URI = "urn:1b54fdfa-55da-4896-9f53-028318ad51b5";
const COMPUTER_GUID = "COMP-0";

let SERVICE_CONFIG = null;
let polling = false;
let instanceMabrServerInstanceGuid = null;
let instanceMabrServerAddress = null;

const cacheBurst = () => Date.now();

function slaposFindMabrServerInstanceID(){
    
    instanceMabrServerInstanceGuid = null;
    instanceMabrServerAddress = null;

    const uri = `${ORCHESTRATOR_URI}/slapos.allDocs.v0.compute_node_instance_list?cacheburst=${cacheBurst()}`;
    const req = new XMLHttpRequest();

    req.open("POST", uri, false);
    req.setRequestHeader("Content-Type", "application/json");
    req.onload = () => {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 300){
                try {
                    print(GF_LOG_WARNING, `[js] slaposFindMabrServerInstanceID.onload - ${req.responseText}`);
                    const results = JSON.parse(req.responseText)["result_list"];
                    if (results){
                        for (let res of results){
                            if (res["state"] == "started"){ ///!\ assumes we just need the 1st one ...
                                instanceMabrServerInstanceGuid = res["instance_guid"];
                                print(GF_LOG_WARNING, `[js] service1 instance guid: ${instanceMabrServerInstanceGuid}`);
                                return slaposGetMabrServerAddress(instanceMabrServerInstanceGuid);
                            }
                        }
                    } else {
                        print(GF_LOG_WARNING, `[js] slaposFindMabrServerInstanceID.onload - Invalid response payload`);
                    }
                } catch (err) {
                        print(GF_LOG_WARNING, `[js] slaposFindMabrServerInstanceID.onload - Invalid response payload: ${err}`);
                }
            } // status
            instanceMabrServerAddress = null;
            instanceMabrServerInstanceGuid = null;
         }
        print(GF_LOG_WARNING, `[js] slaposFindMabrServerInstanceID.onload - ${req.readyState} - ${req.status} - ${req.statusText}`);
        polling = false;
    };
    req.onerror = (e) => { polling = false; print(GF_LOG_WARNING, `[js] slaposFindMabrServerInstanceID.onerror - ${req.readyState} - ${req.status} - ${req.statusText}`) };
    const msg = JSON.stringify({
        "software_release_uri": SOFTWARE_RELEASE_URI,
        "computer_guid": COMPUTER_GUID
    });
    // print(GF_LOG_WARNING, `[js] slaposFindMabrServerInstanceID - ${uri}`);
    polling = true;
    req.send(msg);
}


function slaposGetMabrServerAddress(instanceGuid){

    const uri = `${ORCHESTRATOR_URI}/slapos.get.v0.software_instance?cacheburst=${cacheBurst()}`;
    print(GF_LOG_WARNING, `[js] slaposGetMabrServerAddress - ${uri}`);

    const req = new XMLHttpRequest();
    req.open("POST", uri, false);
    req.setRequestHeader("Content-Type", "application/json");
    req.onload = (e) => {
        if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 300){
                try {
                    const connectionParams = JSON.parse(req.responseText)["connection_parameters"];
                    if (connectionParams){
                        instanceMabrServerAddress = connectionParams["route-server-ipv6"] || null;
                        print(GF_LOG_WARNING, `[js] service1 instance adress: ${instanceMabrServerAddress}`);
                        polling = false;
                        return;
                    }
                    print(GF_LOG_WARNING, `[js] slaposGetMabrServerAddress.onload - Invalid response payload`);
                } catch (err){
                    print(GF_LOG_WARNING, `[js] slaposGetMabrServerAddress.onload - Invalid response payload: ${err}`);
                }
            }
            instanceMabrServerAddress = null;
            instanceMabrServerInstanceGuid = null;
        }
        print(GF_LOG_WARNING, `[js] slaposGetMabrServerAddress.onload - ${req.readyState} - ${req.status} - ${req.statusText}`);
        polling = false;
    };
    req.onerror = (e) => { polling = false; print(GF_LOG_WARNING, `[js] slaposGetMabrServerAddress.onerror - ${req.readyState} - ${req.status} - ${req.statusText}`) };
    const msg = JSON.stringify({
        "instance_guid": instanceGuid
    });
    polling = true;
    req.send(msg);
}

function pollForMabrServerDetails(){
    print(GF_LOG_WARNING, `[js] pollForMabrServerDetails - polling: ${polling}`);
    print(GF_LOG_WARNING, `[js] instanceMabrServerInstanceGuid: ${instanceMabrServerInstanceGuid}`);
    print(GF_LOG_WARNING, `instanceMabrServerAddress: ${instanceMabrServerAddress}`);
    if(polling) return;
    // how do we check for end of mABR availability ?
    if (instanceMabrServerInstanceGuid) {
        slaposGetMabrServerAddress(instanceMabrServerInstanceGuid);
    } else {
        instanceMabrServerInstanceGuid = null;
        instanceMabrServerAddress = null;
        slaposFindMabrServerInstanceID();
    }
}

/*
function setInterval(callback, delay){
    setTimeout(()=>{
        callback();
        setInterval(callback, delay);
    }, delay);
}

let count = 0;

function intervalCallback(){
    count += 1;
    print(GF_LOG_INFO, `[js] intervalCallback ${count}`);
}
*/

export function init(service_config) 
{
    SERVICE_CONFIG = service_config;    
    return true;
}


export function service_activation(do_load, serviceID)
{
    print(GF_LOG_INFO, `[js] service_activation - do_load:${do_load}, serviceID:${serviceID}`);
    return null;
}

// FIXME: the function is not optional
export function quality_activation(do_activate, serviceID, periodID, adaptationSetID, representationID)
{
    print(GF_LOG_INFO, `[js] quality_activation - do_activate:${do_activate}, serviceID:${serviceID}, periodID:${periodID}, adaptationSetID:${adaptationSetID}, representationID:${representationID}`);
    return true;
}

export function get_mcast_address(service_url)
{
    pollForMabrServerDetails();
    print(GF_LOG_INFO, `[js] get_mcast_address: ${service_url} - ${instanceMabrServerInstanceGuid} - ${instanceMabrServerAddress}`);
    return instanceMabrServerAddress;
}

