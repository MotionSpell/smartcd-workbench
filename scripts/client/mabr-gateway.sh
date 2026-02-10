DIR=/data/data/com.termux/files/home/smartcd-workbench
mkdir -p $DIR/tmp/mabr-gateway
rm -rf $DIR/tmp/mabr-gateway/*

gpac -log=all@error:http:route@info -log-file=$DIR/logs/mabr-gateway.log -tmp=$DIR/tmp/mabr-gateway mediaserver:port=8081:scfg=$DIR/scripts/client/gateway.scfg