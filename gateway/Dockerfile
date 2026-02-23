FROM localhost/gpac:latest

# replace mediaserver/init.js, adds mediaserver/dyn_mabr.js
# RUN rm /usr/local/share/gpac/scripts/jsf/mediaserver/init.js
COPY gateway/gpac.scripts.jsf.mediaserver /usr/local/share/gpac/scripts/jsf/mediaserver

# add nodejs for browser monitoring, orchestrator api mock, gateway process wrapper
RUN apt-get update && apt-get install -y curl
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
RUN apt-get install -y nodejs

WORKDIR /scd/gateway
COPY . .

RUN npm install

CMD [ "npm", "run", "start", "/scd/gateway/cfg/docker/gateway.yml" ]