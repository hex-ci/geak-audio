const Client = require('upnp-device-client');
const ssdp = require('@achingbrain/ssdp');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
const getPort = require('get-port');
const inquirer = require('inquirer');
const dayjs = require('dayjs');
const Netmask = require('netmask').Netmask;

const playlistName = 'radio-cn-playlist.json';

const radioCnPageUrl = `http://tacc.radio.cn/pcpages/radiopages`;
const devicePath = `${__dirname}/device.json`;

const ipList = Object.values(os.networkInterfaces()).flat().filter(i => i.family == 'IPv4' && !i.internal);

let firstInfo;
let playlistData;

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
}

const pushPlaylist = async (rendererUrl) => {
  // 确定 ip 和端口
  const parsedUrl = new URL(rendererUrl);
  const block = new Netmask(parsedUrl.hostname, '255.255.255.0');

  const ip = ipList.find(item => block.contains(item.address)).address;
  const port = await getPort();

  const playlistUrl = `http://${ip}:${port}/${playlistName}`;
  const client = new Client(rendererUrl);

  console.log('开始推送播放列表...');

  await startServer(port);

  const params = {
    InstanceID: 0,
    CurrentURI: `geakmusic://${firstInfo.stream[0].url}|2|${playlistUrl}|`,
    CurrentURIMetaData: `<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">
<item id="0" parentID="-1" restricted="false">
<upnp:class>object.item.geakMusic</upnp:class>
<dc:title>${firstInfo.channelId}</dc:title>
<dc:creator>Hex</dc:creator>
<upnp:artist>${firstInfo.programId}</upnp:artist>
<upnp:album></upnp:album>
<upnp:albumArtURI></upnp:albumArtURI>
<res protocolInfo="http-get:*:*:">${firstInfo.stream[0].url}</res>
</item>
</DIDL-Lite>`
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

const startServer = async (port) => {
  const express = require('express');
  const app = express();
  let server;

  app.get(`/${playlistName}`, (req, res) => {
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
}

const makeMenu = async () => {
  console.log('正在获取云听电台频道列表...\n');

  const result = await axios.get(radioCnPageUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36' }});

  const channels = result.data.data.channel.map(item => ({
    name: item.name,
    value: item.id
  }));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'channel',
      message: '请选择频道',
      pageSize: 20,
      loop: false,
      choices: channels
    }
  ]);

  return answers.channel;
};

const main = async () => {
  const channelId = await makeMenu();

  console.log('正在下载云听电台...');

  const yesterday = dayjs().subtract(1, 'days').format('YYYY-MM-DD');
  const radioCnChannelUrl = `http://tacc.radio.cn/pcpages/liveSchedules?date=${yesterday}&channel_id=${channelId}`;

  const result = await axios.get(radioCnChannelUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36' }});

  console.log('下载完成！正在生成播放列表...');

  const output = { TracksMetaData: [] };

  result.data.data.program.forEach((item) => {
    if (!item.stream) {
      return;
    }

    output.TracksMetaData.push({
      'type': 1,
      'uuid': '',
      'metadata': '',
      'url': item.stream[0].url,
      'title': item.programName
    });
  });

  firstInfo = result.data.data.program[0];

  playlistData = JSON.stringify(output);

  console.log('生成完成！');

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

  pushPlaylist(rendererUrl);
}

main();
