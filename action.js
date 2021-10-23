const device = require('./device');

if (process.argv.length < 3) {
  console.log('用法: node action.js 操作');
  process.exit(1);
}

const action = process.argv[2];

const main = async () => {
  switch (action) {
    default:
    case 'status':
      console.log(await device.getStatus());
      break;

    case 'play':
      device.play();
      break;

    case 'stop':
      device.stop();
      break;

    case 'pause':
      device.pause();
      break;

    case 'next':
      device.next();
      break;

    case 'previous':
      device.previous();
      break;

    case 'info':
      console.log(await device.getInfo());
      break;

    case 'mode':
      device.setPlayMode(process.argv[3]);
      break;

    case 'volume':
      device.setVolume(process.argv[3] ?? 20);
      break;
  }
}

main();
