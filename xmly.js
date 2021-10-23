const axios = require('axios');
const { pushPlaylist } = require('./device');

if (process.argv.length < 3) {
  console.log('用法: node xmly.js 喜马拉雅专辑ID');
  process.exit(1);
}

const id = process.argv[2];

const getAudioUrl = async (id) => {
  const ximalayaUrl = `https://www.ximalaya.com/revision/play/v1/audio?id=${id}&ptype=1`;

  const result = await axios.get(ximalayaUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36' }
  });

  return result.data.data.src.replace(/^https:\/\//, 'http://');
};

const main = async () => {
  console.log('正在下载喜马拉雅专辑（前 30 条音频）...');

  const ximalayaUrl = `https://www.ximalaya.com/revision/play/album?albumId=${id}&pageNum=1&pageSize=30`;

  const result = await axios.get(ximalayaUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36' }
  });

  const tracks = [];

  for (const item of result.data.data.tracksAudioPlay) {
    let url;

    if (item.canPlay) {
      url = item.src;
    }
    else {
      url = await getAudioUrl(item.trackId);
    }

    tracks.push({
      type: 2,
      uuid: '',
      metadata: '',
      url,
      title: item.trackName
    });
  }

  console.log('下载完成！');

  if (!tracks.length) {
    console.log('暂不支持此专辑数据，请换一个专辑。');
    return;
  }

  pushPlaylist({ TracksMetaData: tracks });
}

main();
