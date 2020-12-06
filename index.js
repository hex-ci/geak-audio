const Client = require('upnp-device-client');
const ssdp = require('@achingbrain/ssdp');
const axios = require('axios');
const fs = require('fs');

if (process.argv.length < 3) {
  console.log('用法: node index.js 喜马拉雅专辑ID');
  process.exit(1);
}

const id = process.argv[2];

const ximalayaUrl = `https://www.ximalaya.com/revision/play/album?albumId=${id}`;
const playlistUrl = 'http://geak.n1/playlist.json';
const devicePath = `${__dirname}/device.json`;
const playlistPath = `${__dirname}/playlist.json`;

let firstInfo;

const searchDevice = () => {
  console.log('开始搜索设备...');

  const bus = ssdp();

  bus.on('error', console.error);

  const usn = 'urn:schemas-upnp-org:service:ConnectionManager:1';

  bus.discover(usn);

  bus.on(`discover:${usn}`, service => {
    // console.log(service);

    if (service.UDN.indexOf('uuid:geakmusic') === 0) {
      bus.stop();

      console.log('搜索设备完成！');

      const rendererUrl = `${service.details.URLBase}renderer.xml`;

      // 缓存设备地址
      fs.writeFileSync(`${__dirname}/device.json`, JSON.stringify(service));

      pushPlaylist(rendererUrl);
    }
  });
}

const pushPlaylist = (rendererUrl) => {
  const client = new Client(rendererUrl);

  console.log('开始推送播放列表...');

  const params = {
    InstanceID: 0,
    CurrentURI: `geakmusic://${firstInfo.src}|2|${playlistUrl}|`,
    CurrentURIMetaData: `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/"><item id="0" parentID="-1" restricted="false"><upnp:class>object.item.geakMusic</upnp:class><dc:title>${firstInfo.trackId}</dc:title><dc:creator>Hex</dc:creator><upnp:artist>${firstInfo.anchorId}</upnp:artist><upnp:album>${firstInfo.albumId}</upnp:album><upnp:albumArtURI>http:${firstInfo.trackCoverPath}</upnp:albumArtURI><res protocolInfo="http-get:*:audio/mpeg:">${firstInfo.src}</res></item></DIDL-Lite>`
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
}

const main = async () => {
  console.log('正在下载喜马拉雅专辑...');

  const result = await axios.get(ximalayaUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36' }});

  console.log('下载完成！正在生成播放列表...');

  const output = { TracksMetaData: [] };

  result.data.data.tracksAudioPlay.forEach((item) => {
    if (!item.src) {
      return;
    }

    output.TracksMetaData.push({
      'type': 1,
      'uuid': '',
      'metadata': '',
      'url': item.src,
      'title': item.trackName
    });
  });

  firstInfo = result.data.data.tracksAudioPlay[0];

  fs.writeFileSync(playlistPath, JSON.stringify(output));

  console.log('生成完成！');

  try {
    const device = JSON.parse(fs.readFileSync(devicePath).toString());

    if (!device?.details?.URLBase) {
      searchDevice();
    }
    else {
      // 测试设备地址
      try {
        const rendererUrl = `${device.details.URLBase}renderer.xml`;

        await axios.get(rendererUrl);

        pushPlaylist(rendererUrl);
      }
      catch (e) {
        searchDevice();
      }
    }
  }
  catch (e) {
    searchDevice();
  }
}

main();
