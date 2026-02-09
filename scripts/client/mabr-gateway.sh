DIR=/data/data/com.termux/files/home/smartcd-workbench
rm -rf $DIR/tmp/*
gpac -log=all@error:http:route@info -log-file=$DIR/mabr-gateway.log -tmp=$TMP mediaserver=$DIR/gateway.scfg