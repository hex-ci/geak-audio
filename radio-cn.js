const axios = require('axios');
const inquirer = require('inquirer');
const dayjs = require('dayjs');
const { pushPlaylist } = require('./utils');

const makeMenu = async (channels) => {
  const choices = channels.map((item, index) => ({
    name: `${index + 1}. ${item.name}`,
    value: item.id
  }));

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: '请选择播放类型',
      choices: [
        { name: '直播', value: 'live' },
        { name: '昨日回放', value: 'playback' },
      ]
    },
    {
      type: 'list',
      name: 'channel',
      message: '请选择频道',
      pageSize: 20,
      choices
    }
  ]);

  return answers;
};

const getPlaybackPlaylist = async (channelId) => {
  console.log('\n正在下载云听电台...');

  const yesterday = dayjs().subtract(1, 'days').format('YYYY-MM-DD');
  const radioCnChannelUrl = `http://tacc.radio.cn/pcpages/liveSchedules?callback=jQuery112200675005212007802_1634453336791&date=${yesterday}&channel_id=${channelId}`;

  let result = await axios.get(radioCnChannelUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36' }
  });

  result = JSON.parse(result.data.replace(/^jQuery112200675005212007802_1634453336791\(([\s\S]*)\)$/, '$1'));

  console.log('下载完成！正在生成播放列表...');

  const output = { TracksMetaData: [] };

  result.data.program.forEach((item) => {
    if (!item.stream) {
      return;
    }

    output.TracksMetaData.push({
      type: 2,
      uuid: '',
      metadata: '',
      url: item.stream[0].url,
      title: item.programName
    });
  });

  return output;
};

const getLivePlaylist = (channelId, pageData) => {
  const channelDetail = pageData.channel.find(item => item.id == channelId);

  return {
    TracksMetaData: [{
      type: 2,
      uuid: '',
      metadata: '',
      url: `ffmpeg://${channelDetail.streams[0].url}`,
      title: channelDetail.name
    }]
  };
};

const main = async () => {
  console.log('正在下载云听电台频道列表...\n');

  const radioCnPageUrl = `http://tacc.radio.cn/pcpages/radiopages?callback=jQuery112200675005212007802_1634453336791`;

  let pageResult = await axios.get(radioCnPageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36' }
  });

  pageResult = JSON.parse(pageResult.data.replace(/^jQuery112200675005212007802_1634453336791\(([\s\S]*)\)$/, '$1'));

  const answers = await makeMenu(pageResult.data.channel);
  const channelId = answers.channel;

  console.log();

  let output;

  if (answers.type === 'live') {
    output = await getLivePlaylist(channelId, pageResult.data);
  }
  else {
    output = await getPlaybackPlaylist(channelId);
  }

  pushPlaylist(JSON.stringify(output), {
    url: output.TracksMetaData[0].url,
    title: '',
    artist: '',
    album: ''
  });
}

main();
