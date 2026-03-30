## Instructions to use the gateway tools docker image with your custom smartcd orchestrator API implementation

1. build and tag `localhost/scd-gateway-tools:latest` development image according to [these instructions](https://github.com/MotionSpell/smartcd-workbench?tab=readme-ov-file#gateway-tools-image)

2. check that you can start a route server using a gpac container: `docker run --network host -it localhost/gpac:latest -i http://127.0.0.1:8888/livesim2/bbb_hevc_ac3_8s/manifest.mpd dashin:forward=file -o route://232.3.170.99:1234:ifce=127.0.0.1 -logs=route@info`

3. review the gateway monitor config: `intgeration/cfg`. The `integration/docker-compose.yml` bind mounts those files. 

4. `cd integration && docker compose up`

5. verify that the [gateway monitoring page](http://127.0.0.1:3000) is up & running, it shows only unicast stats

6. browse to the [custom orchestrator control page](http://127.0.0.1:5000) & start a route server

7. the gateway monitoring page now shows multicast abr / route related stats