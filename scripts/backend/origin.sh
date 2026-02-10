DST=http://127.0.0.1:9999/Manifest.mpd

DIR=~/code/smart-CD/workbench
mkdir -p $DIR/tmp/avgen
rm -rf $DIR/tmp/avgen/*

gpac -lu -logs=ncl:all@error:http@info -log-file=$DIR/logs/avgen.log -i avgen:fps=25:sr=48000 ffenc:c=avc:x264-params=keyint=48:min-keyint=48:no-scenecut ffenc:c=aac reframer:rt=on -o $DST:segdur=1.92:profile=live:dmode=dynamic:tsb=3600:spd=10:maxp=0:maxc=0:rdirs=$DIR/tmp/avgen