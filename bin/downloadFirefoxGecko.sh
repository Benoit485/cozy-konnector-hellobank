#!/bin/sh

#/usr/local/bin/cozy-browser/geckodriver
#/usr/local/bin/cozy-browser/firefox/firefox-bin

PATHDIR=/usr/local/bin/cozy-browser

mkdir -p  $PATHDIR \
&& wget https://github.com/mozilla/geckodriver/releases/download/v0.27.0/geckodriver-v0.27.0-linux64.tar.gz -O $PATHDIR/geckodriver-v0.27.0-linux64.tar.gz \
&& wget https://download-installer.cdn.mozilla.net/pub/firefox/releases/80.0.1/linux-x86_64/fr/firefox-80.0.1.tar.bz2 -O $PATHDIR/firefox-80.0.1-linux64.tar.bz2 \
&& tar -zxvf $PATHDIR/geckodriver-v0.27.0-linux64.tar.gz --directory=$PATHDIR/ \
&& tar -jxvf $PATHDIR/firefox-80.0.1-linux64.tar.bz2 --directory=$PATHDIR/ \
&& rm $PATHDIR/geckodriver-v0.27.0-linux64.tar.gz \
&& touch $PATHDIR/geckodriver-v0.27.0-linux64.version \
&& rm $PATHDIR/firefox-80.0.1-linux64.tar.bz2 \
&& touch $PATHDIR/firefox-80.0.1-linux64.version \
&& echo "OK"
