const Client = require('upnp-device-client');
const ssdp = require('@achingbrain/ssdp');
const os = require('os');
const getPort = require('get-port');
const Netmask = require('netmask').Netmask;
const express = require('express');
const fs = require('fs');
const axios = require('axios');

const devicePath = `${__dirname}/device.json`;
const ipList = Object.values(os.networkInterfaces()).flat().filter(i => i.family == 'IPv4' && !i.internal);

const searchDevice = () => {
  return new Promise((resolve) => {
    console.log('开始搜索设备...');

    const bus = ssdp();

    bus.on('error', console.error);

    const usn = 'urn:schemas-upnp-org:device:MediaServer:1';

    bus.discover(usn);

    bus.on(`discover:${usn}`, service => {
      // console.log(service);

      if (service.UDN.indexOf('uuid:geakmusic') === 0) {
        bus.stop();

        console.log('搜索设备完成！');

        // 缓存设备地址
        fs.writeFileSync(`${__dirname}/device.json`, JSON.stringify(service));

        resolve(service);
      }
    });
  });
};

const startServer = async (port, playlistData) => {
  const app = express();
  let server;

  app.get('/playlist.json', (req, res) => {
    res.send(playlistData);
    setImmediate(() => {
      server.close();
      process.exit(0);
    })
  });

  return new Promise((resolve) => {
    server = app.listen(port, () => {
      resolve(port);
    })
  })
};

const pushPlaylist = async (playlistData, mediaInfo) => {
  let device;

  try {
    device = JSON.parse(fs.readFileSync(devicePath).toString());
  }
  catch (e) {
  }

  if (!device?.details?.URLBase) {
    device = await searchDevice();
  }

  let rendererUrl = `${device.details.URLBase}renderer.xml`;

  // 测试设备地址
  try {
    await axios.get(rendererUrl);
  }
  catch (e) {
    device = null;
  }

  if (!device?.details?.URLBase) {
    device = await searchDevice();
  }

  rendererUrl = `${device.details.URLBase}renderer.xml`;

  // 确定 ip 和端口
  const parsedUrl = new URL(rendererUrl);
  const block = new Netmask(parsedUrl.hostname, '255.255.255.0');

  const ip = ipList.find(item => block.contains(item.address)).address;
  const port = await getPort();

  const playlistUrl = `http://${ip}:${port}/playlist.json`;
  const client = new Client(rendererUrl);

  console.log('开始推送播放列表...');

  await startServer(port, playlistData);

  const params = {
    InstanceID: 0,
    CurrentURI: `geakmusic://${mediaInfo.url}|2|${playlistUrl}|`,
    CurrentURIMetaData: `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">
<item id="0" parentID="-1" restricted="false">
<upnp:class>object.item.geakMusic</upnp:class>
<dc:title>${mediaInfo.title}</dc:title>
<dc:creator>Hex</dc:creator>
<upnp:artist>${mediaInfo.artist}</upnp:artist>
<upnp:album>${mediaInfo.album}</upnp:album>
<upnp:albumArtURI></upnp:albumArtURI>
<res protocolInfo="http-get:*:*:">${mediaInfo.url}}</res>
</item></DIDL-Lite>`
  };

  client.callAction('AVTransport', 'Stop', { InstanceID: 0 }, function(err, result) {
    if (err) {
      console.log(err);
    }

    client.callAction('AVTransport', 'SetAVTransportURI', params, function(err, result) {
      if (err) {
        console.log(err);
      }

      client.callAction('AVTransport', 'Play', { InstanceID: 0, Speed: 1 }, function(err, result) {
        if (err) {
          console.log(err);
        }

        console.log('推送完成！');
      });
    });
  });
};

module.exports = {
  searchDevice,
  pushPlaylist
};
