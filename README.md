# 剧迷找不同 · MVP Demo

按照技术方案 `2026-06-23-wechat-spot-the-difference-tech-design.md` 实现的最小可玩 Demo。

## 已实现核心闭环

- 关卡 JSON 配置 → 加载双图 → 倒计时找不同 → 命中 / 失误判定 → 提示 → 结算 + 星级。
- 模块：`SceneManager`、`CanvasManager`、`ImageLoader`、`TouchRouter`、`LevelEngine`、`DiffHitTester`、`ScoreEvaluator`、`BootScene`、`LevelScene`、`ResultScene`。

## 目录

```
miniGame/
├── game.js                  # 入口（微信小游戏 / 浏览器双兼容）
├── game.json                # 微信小游戏配置
├── project.config.json      # 微信开发者工具配置
├── demo.html                # 浏览器 demo 入口
├── build-demo.js            # 极简打包脚本（仅用于浏览器 demo）
├── src/
│   ├── core/{adapter,SceneManager}.js
│   ├── render/{CanvasManager,ImageLoader,TouchRouter}.js
│   ├── game/{LevelEngine,DiffHitTester,ScoreEvaluator}.js
│   └── scenes/{BootScene,LevelScene,ResultScene}.js
└── levels/
    ├── demo_level.json
    └── images/{demo_a.svg, demo_b.svg}
```

## 在浏览器跑 Demo（最快验证）

```bash
cd miniGame
node build-demo.js                        # 生成 demo-bundle.js
python3 -m http.server 8080               # 任意静态服务器
# 打开 http://localhost:8080/demo.html
```

操作：在两幅图中找出 6 处不同，点击差异处会出现绿色圆圈；
点击错误位置出现红色 X，失误 3 次或超时 90s 失败。

## 在微信开发者工具跑

1. 打开微信开发者工具 → 导入项目 → 选择 `miniGame/` 目录 → 类型选「小游戏」。
2. 真机调试或模拟器即可运行。
3. 注意：`adapter.js` 已做平台分支，微信环境会走 `wx.createCanvas / wx.createImage / wx.getFileSystemManager`。

## 关卡配置

`levels/demo_level.json`：

| 字段 | 含义 |
|------|------|
| `imageA / imageB` | 双图资源路径（可改为云存储 URL） |
| `imageSize` | 差异点坐标系基准 |
| `timeLimit` | 关卡时长（秒） |
| `maxMisses` | 最大失误次数 |
| `diffs[]` | 差异点：`{ id, x, y, r, desc }` |
| `starThresholds` | 1/2/3 星完成时间阈值 |

新增关卡 = 新增一个 JSON 文件并替换其中两张图，即可复用整套引擎。

## 下一步（按技术方案 §12）

- HomeScene / ThemeScene 主题选择。
- 提示冷却 / 称号 / 成就。
- CloudBase 登录 + `syncProgress` 云函数。
- 分享卡片合成 + 埋点。
