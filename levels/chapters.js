// 剧本注册表：HomeScene 渲染所有"剧本"，点击进入对应 ChapterScene
const southArchive = require('./south_archive.js');

module.exports = [
  {
    id: 'south_archive',
    title: '段家三侦探',
    subtitle: '悬疑探案 · 7关',
    palette: ['#fff8f5', '#ffede5'],
    accent: '#ff8c42',
    available: true,
    data: southArchive,
  },
  {
    id: 'protagonist',
    title: '两宝生活日记',
    subtitle: '生活日常 · 6关',
    palette: ['#f5f9ff', '#e8f2ff'],
    accent: '#5b9bd5',
    available: false,
  },
  {
    id: 'mortal_immortal',
    title: '程序员的日常',
    subtitle: '工作日常 · 6关',
    palette: ['#f3fcf8', '#e5f8ef'],
    accent: '#4ecdc4',
    available: false,
  },
];
