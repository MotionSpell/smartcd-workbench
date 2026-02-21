DIR=/data/data/com.termux/files/home/smartcd-workbench
mkdir -p $DIR/tmp/gateway
rm -rf $DIR/tmp/gateway/*

gpac -logs=all@error:http:route:console:script@info -log-file=$DIR/logs/gateway.log -tmp=$DIR/tmp/gateway mediaserver:port=8081:scfg=$DIR/scripts/client/gateway.scfg