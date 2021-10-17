const axios = require('axios');
const { pushPlaylist } = require('./utils');

if (process.argv.length < 3) {
  console.log('用法: node xmly.js 喜马拉雅专辑ID');
  process.exit(1);
}

const id = process.argv[2];

const ximalayaUrl = `https://www.ximalaya.com/revision/play/album?albumId=${id}`;

const main = async () => {
  console.log('正在下载喜马拉雅专辑...');

  const result = await axios.get(ximalayaUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36' }
  });

  console.log('下载完成！');

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

  pushPlaylist(JSON.stringify(output), {
    url: output.TracksMetaData[0].url,
    title: '',
    artist: '',
    album: ''
  });
}

main();
