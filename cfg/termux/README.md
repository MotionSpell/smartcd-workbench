## using GPAC as an mabr gateway on Android in a termux environment

This guide explains how to setup and run the gateway in a termux environment.

Use [scrcpy](https://github.com/Genymobile/scrcpy) to work with [termux](https://termux.dev/en/) on a smartphone connected over usb:
```
scrcpy --video-codec=h265 --max-size=1920 --max-fps=60 --no-audio --keyboard=uhid
```

Instructions assume working from termux' default `$HOME` directory `/data/data/com.termux/files/home`.


### 1. install / build gpac

To use the latest version or a specific branch of *gpac*, build it from source:
```
mkdir $HOME/gpac && cd $HOME/gpac
pkg install git build-essential binutils
git clone https://github.com/gpac/gpac.git .
./configure && make -j 8
```

Create an alias for the gpac executable:
```
echo "alias gpac=~/gpac/bin/gcc/gpac" >> .bashrc
source ~/.bashrc
```

Create a minimal gpac global configuration file: `$HOME/.gpac/GPAC.cfg`, making sure the **core.tmp** option points to a **writable directory** (eg. within termux' $HOME):
```
[core]
cache=$HOME/tmp/gpac_cache
```


### 2. install the gateway with unicast/multicast dynamic switching based on the slapos api responses

Use the modified `mediaserver/init.js` and the `dyn_mabr.js` extension provided in this repository:
```
mkdir -p $HOME/scd/gateway

git clone https://github.com/MotionSpell/smartcd-workbench.git $HOME/scd/gateway

cp $HOME/scd/gateway/gateway/gpac.scripts.jsf.mediaserver/* $HOME/gpac/share/scripts/jsf/mediaserver
```


### 3. update the gateway configuration

update the `$HOME/scd/gateway/cfg/termux/gateway.scfg` configuration file as follow: 

**http** must match the unicast origin used by the mabr server:
```
    "http": "https://live-linear.dvb.org/livesim2/tsbd_30/spd_4/utc_httpisoms/start_1735689600/1003_avc_hd_sdr_mpegh/manifest_livesim.mpd",
```


**smartcd_api_endpoint** must match the location of the orchestrator API, eg. `192.168.1.180:5000`:
```
    "smartcd_api_endpoint": "http://192.168.1.180:5000/api",
```


### 3. start the gateway

After starting the gateway, the services configured in `gateway.scfg` are available for local playback, (and to other devices on the same network for testing):
```
gpac -logs=all@warning:route@info mediaserver:cors=on:port=8081:scfg=/data/data/com.termux/files/home/scd/gateway/cfg/termux/gateway.scfg
```

*note:* the `:cors=on` option is needed really only if you're going use the gateway monitoring page in the browser, see `cfg/termux/gateway.yml`
