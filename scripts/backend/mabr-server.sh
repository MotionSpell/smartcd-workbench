SRC=http://127.0.0.1:9999/Manifest.mpd
DST=mabr://239.255.255.250:1234/Manifest.mpd:ifce=en0:carousel=1000
LOGF=~/code/smart-CD/logs/mabr-server.log
gpac -lu -logs=ncl:all@error:route@debug -i $SRC dashin:forward=file -o $DST