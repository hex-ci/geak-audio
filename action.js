const Client = require('upnp-device-client');
const ssdp = require('@achingbrain/ssdp');
const axios = require('axios');
const fs = require('fs');

if (process.argv.length < 3) {
  console.log('用法: node action.js 操作');
  process.exit(1);
}

const action = process.argv[2];

const devicePath = `${__dirname}/device.json`;

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

const getStatus = (rendererUrl) => {
  const client = new Client(rendererUrl);

  client.callAction('AVTransport', 'GetPowerStatus', { InstanceID: 0 }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(result);
  });

  client.callAction('AVTransport', 'GetDeviceInfo', { InstanceID: 0 }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(JSON.parse(result.DeviceInfo));
  });
}

const play = (rendererUrl) => {
  const client = new Client(rendererUrl);

  client.callAction('AVTransport', 'Play', { InstanceID: 0, Speed: 1 }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(result);
  });
}

const stop = (rendererUrl) => {
  const client = new Client(rendererUrl);

  client.callAction('AVTransport', 'Stop', { InstanceID: 0 }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(result);
  });
}

const pause = (rendererUrl) => {
  const client = new Client(rendererUrl);

  client.callAction('AVTransport', 'Pause', { InstanceID: 0 }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(result);
  });
}

const next = (rendererUrl) => {
  const client = new Client(rendererUrl);

  client.callAction('AVTransport', 'Next', { InstanceID: 0 }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(result);
  });
}

const previous = (rendererUrl) => {
  const client = new Client(rendererUrl);

  client.callAction('AVTransport', 'Previous', { InstanceID: 0 }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(result);
  });
}

const info = (rendererUrl) => {
  const client = new Client(rendererUrl);

  // FavouriteFindout, GetMediaInfo, GetTransportInfo, GetPositionInfo, GetPlaylistInfo
  client.callAction('AVTransport', 'GetTransportInfo', { InstanceID: 0 }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(result);
  });

  client.callAction('AVTransport', 'GetPositionInfo', { InstanceID: 0 }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(result);
  });
}

const setPlayMode = (rendererUrl) => {
  const client = new Client(rendererUrl);

  // SEQUENCE_PLAY, RANDOM_PLAY, SINGLE_CYCLE
  client.callAction('AVTransport', 'SetPlayMode', { InstanceID: 0, NewPlayMode: 'RANDOM_PLAY' }, function(err, result) {
    if (err) {
      console.log(err);
    };

    console.log(result);
  });
}

const main = async () => {
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

  switch (action) {
    default:
    case 'status':
      getStatus(rendererUrl);
      break;

    case 'play':
      play(rendererUrl);
      break;

    case 'stop':
      stop(rendererUrl);
      break;

    case 'pause':
      pause(rendererUrl);
      break;

    case 'next':
      next(rendererUrl);
      break;

    case 'previous':
      previous(rendererUrl);
      break;

    case 'info':
      info(rendererUrl);
      break;

    case 'mode':
      setPlayMode(rendererUrl);
      break;
  }
}

main();
