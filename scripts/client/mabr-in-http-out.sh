DIR=/data/data/com.termux/files/home/smartcd-workbench
mkdir -p $DIR/tmp/mabr-in-http-out
rm -rf $DIR/tmp/mabr-in-http-out/*

SRC=mabr://239.255.255.250:1234/:ifce=127.0.0.1:repair=full:repair_urls=http://127.0.0.1:9999/Manifest.mpd
# dashin:forward=file:split_as:keep_burl=inject:relative_url=./
gpac -logs=all@error:http:route@info -log-file=$DIR/logs/mabr-in-http-out.log -i $SRC dashin:forward=file:split_as:keep_burl=keep -o http://127.0.0.1:8888/Manifest.mpd:rdirs=$DIR/tmp/mabr-in-http-out