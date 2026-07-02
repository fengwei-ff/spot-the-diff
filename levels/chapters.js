// 剧本注册表：HomeScene 渲染所有"剧本"，点击进入对应 ChapterScene
const southArchive = require('./south_archive.js');

module.exports = [
  {
    id: 'south_archive',
    title: '难不挡案',
    subtitle: '悬疑探案 · 6关',
    palette: ['#3a2a3a', '#1a1020'],
    accent: '#c8b074',
    available: true,
    data: southArchive,
  },
  {
    id: 'protagonist',
    title: '两宝生活日记',
    subtitle: '生活日常 · 6关',
    palette: ['#2a3a4a', '#0e1620'],
    accent: '#7aa6cf',
    available: false,
  },
  {
    id: 'mortal_immortal',
    title: '程序员的日常',
    subtitle: '工作日常 · 6关',
    palette: ['#2a4a3a', '#0e1f18'],
    accent: '#7acf9a',
    available: false,
  },
];
