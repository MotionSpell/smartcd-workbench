SRC=http://127.0.0.1:9999/Manifest.mpd
DST=mabr://239.255.255.250:1234/:ifce=en0

DIR=~/code/smart-CD/workbench
mkdir -p $DIR/tmp/mabr-server
rm -rf $DIR/tmp/mabr-server/*

gpac -lu -logs=ncl:all@error:route@debug -log-file=$DIR/logs/mabr-server.log -tmp=$DIR/tmp/mabr-server -i $SRC dashin:forward=file -o $DST