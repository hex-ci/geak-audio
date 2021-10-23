const axios = require('axios');
const { pushPlaylist } = require('./device');

if (process.argv.length < 3) {
  console.log('用法: node xmly-radio.js 喜马拉雅电台ID');
  process.exit(1);
}

const id = process.argv[2];

const ximalayaUrl = `https://live.ximalaya.com/live-web/v1/radio?radioId=${id}`;

const main = async () => {
  console.log('正在下载喜马拉雅电台信息...');

  const result = await axios.get(ximalayaUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36' }
  });

  console.log('下载完成！');

  const output = {
    TracksMetaData: [{
      type: 2,
      uuid: '',
      metadata: '',
      url: `ffmpeg://${result.data.data.playUrl.aac64}`,
      title: result.data.data.name
    }]
  };

  pushPlaylist(output);
}

main();
