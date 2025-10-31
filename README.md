![./workbench.png](workbench.png)

## Overview

By default the tool uses GPAC avgen to start a local http origin, and can be configured to use a custom http origin instead.
It starts one GPAC process as an mABR gateway, and another GPAC process as an mABR server.

The tool exposes an API to control the processes, and mocks the orchestrator API.
The mABR gateway polls the API to check for mABR availability.

A web page allows to manualy start/stop the processes, preview the service using dashjs, and displays the `x-from-mabr` header from the latest request.


## Usage

```
npm install
node index.js workbench.yml
```

see `./workbench.yml` for quick configuration
see `process/manager.js` for gpac command options 

GPAC documentation:
- [gpac mabr output](https://wiki.gpac.io/Filters/routeout)
- [gpac gateway](https://wiki.gpac.io/Filters/mediaserver)

