const STORAGE_KEY = 'spot_diff_audio_settings';

const SFX_FILES = {
  tap: 'assets/audio/tap.mp3',
  hit: 'assets/audio/hit.mp3',
  miss: 'assets/audio/miss.mp3',
  hint: 'assets/audio/hint.mp3',
  clear: 'assets/audio/clear.mp3',
  fail: 'assets/audio/fail.mp3',
};

const BGM_FILE = 'assets/audio/bgm.mp3';

class AudioManager {
  constructor(env) {
    this.env = env;
    this.bgmEnabled = true;
    this.sfxEnabled = true;
    this.fxEnabled = true;
    this.bgm = null;
    this.sfxPool = {};
    this.bgmVolume = 0.28;
    this.bgmDuckedVolume = 0.1;
    this.sfxVolume = 0.55;
    this.inLevel = false;
    this.bgmStarted = false;
    this._settingsLoaded = false;
  }

  static getInstance(env) {
    if (!AudioManager._instance) {
      AudioManager._instance = new AudioManager(env);
    }
    return AudioManager._instance;
  }

  async loadSettings() {
    if (this._settingsLoaded) return;
    try {
      const raw = await this.env.getStorage(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.bgmEnabled === 'boolean') this.bgmEnabled = data.bgmEnabled;
        if (typeof data.sfxEnabled === 'boolean') this.sfxEnabled = data.sfxEnabled;
        if (typeof data.fxEnabled === 'boolean') this.fxEnabled = data.fxEnabled;
      }
    } catch (e) {
      // 读取失败时使用默认开关
    }
    this._settingsLoaded = true;
  }

  async saveSettings() {
    try {
      await this.env.setStorage(STORAGE_KEY, JSON.stringify({
        bgmEnabled: this.bgmEnabled,
        sfxEnabled: this.sfxEnabled,
        fxEnabled: this.fxEnabled,
      }));
    } catch (e) {
      // 存储失败不影响游戏
    }
  }

  _createPlayer(src, { loop = false, volume = 1 } = {}) {
    if (!this.env.createAudio) return null;
    const player = this.env.createAudio();
    player.src = src;
    player.loop = loop;
    player.volume = volume;
    return player;
  }

  _getSfxPlayer(name) {
    if (!this.sfxPool[name]) {
      const src = SFX_FILES[name];
      if (!src) return null;
      this.sfxPool[name] = this._createPlayer(src, { volume: this.sfxVolume });
    }
    return this.sfxPool[name];
  }

  playSfx(name) {
    if (!this.sfxEnabled) return;
    const player = this._getSfxPlayer(name);
    if (!player) return;
    try {
      if (player.stop) player.stop();
      player.seek(0);
      const ret = player.play();
      if (ret && typeof ret.catch === 'function') ret.catch(() => {});
    } catch (e) {
      // 静默失败，避免打断游戏
    }
  }

  startBgm() {
    if (!this.bgmEnabled || this.bgmStarted) return;
    if (!this.bgm) {
      this.bgm = this._createPlayer(BGM_FILE, {
        loop: true,
        volume: this.inLevel ? this.bgmDuckedVolume : this.bgmVolume,
      });
    }
    if (!this.bgm) return;
    try {
      const ret = this.bgm.play();
      if (ret && typeof ret.catch === 'function') ret.catch(() => {});
      this.bgmStarted = true;
    } catch (e) {
      // 静默失败
    }
  }

  stopBgm() {
    if (!this.bgm) return;
    try {
      this.bgm.stop();
      this.bgmStarted = false;
    } catch (e) {
      // ignore
    }
  }

  setInLevel(inLevel) {
    this.inLevel = inLevel;
    if (!this.bgm) return;
    this.bgm.volume = inLevel ? this.bgmDuckedVolume : this.bgmVolume;
  }

  enterHome() {
    this.setInLevel(false);
    this.startBgm();
  }

  enterLevel() {
    this.setInLevel(true);
    if (!this.bgmStarted) this.startBgm();
  }

  leaveLevel() {
    this.setInLevel(false);
  }

  async setBgmEnabled(enabled) {
    this.bgmEnabled = enabled;
    if (enabled) {
      this.startBgm();
    } else {
      this.stopBgm();
    }
    await this.saveSettings();
  }

  async setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    await this.saveSettings();
  }

  async setFxEnabled(enabled) {
    this.fxEnabled = enabled;
    await this.saveSettings();
  }
}

module.exports = AudioManager;
