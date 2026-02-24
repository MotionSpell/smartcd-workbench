FROM arm64v8/ubuntu:latest as gpac-deps

RUN apt-get -yqq update && apt-get install -y --no-install-recommends build-essential pkg-config g++ git cmake yasm fakeroot dpkg-dev devscripts debhelper ccache
RUN apt-get install -y --no-install-recommends zlib1g-dev libfreetype6-dev libjpeg62-dev libpng-dev libmad0-dev libfaad-dev libogg-dev libvorbis-dev libtheora-dev liba52-0.7.4-dev libavcodec-dev libavformat-dev libavutil-dev libswscale-dev libavdevice-dev libnghttp2-dev libopenjp2-7-dev libcaca-dev libxv-dev x11proto-video-dev libgl1-mesa-dev libglu1-mesa-dev x11proto-gl-dev libxvidcore-dev libssl-dev libjack-jackd2-dev libasound2-dev libpulse-dev libsdl2-dev mesa-utils libcurl4-openssl-dev
RUN apt-get autoremove -y && apt-get clean -y
# - fix manually built dependencies from https://github.com/gpac/deps_unix
# - can't install `dvb-apps`, package errors on arm64v8

FROM gpac-deps

WORKDIR /gpac/gpac_public
RUN git clone https://github.com/gpac/gpac.git .
RUN make distclean 
RUN ./configure --static-bin 
RUN make
RUN rm -rf /gpac/binaries && mkdir -p /gpac/binaries && cp -vf bin/gcc/* /gpac/binaries/ || true

# install deb package
RUN rm -f *.deb && make distclean && make deb
RUN mv -v *.deb /gpac/binaries/
RUN dpkg -i /gpac/binaries/*.deb

CMD [ "gpac" ]