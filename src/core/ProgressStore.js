const USER_ID_KEY = 'spot_diff_user_id';
const PROGRESS_KEY = 'spot_diff_progress';

function createUserId() {
  const rand = Math.random().toString(36).slice(2, 10);
  return `u_${Date.now().toString(36)}_${rand}`;
}

class ProgressStore {
  constructor() {
    this.userId = null;
    this.progress = {};
    this._ready = false;
  }

  static getInstance() {
    if (!ProgressStore._instance) {
      ProgressStore._instance = new ProgressStore();
    }
    return ProgressStore._instance;
  }

  async init(env) {
    if (this._ready) {
      return { userId: this.userId, progress: this.progress };
    }
    try {
      this.userId = await this._getOrCreateUserId(env);
      this.progress = await this._loadProgress(env);
    } catch (e) {
      console.warn('[ProgressStore] init failed:', e);
      if (!this.userId) this.userId = createUserId();
      if (!this.progress) this.progress = {};
    }
    this._ready = true;
    return { userId: this.userId, progress: this.progress };
  }

  async _getOrCreateUserId(env) {
    try {
      const existing = await env.getStorage(USER_ID_KEY);
      if (existing && typeof existing === 'string') return existing;
    } catch (e) {
      // 首次启动无用户标识
    }
    const userId = createUserId();
    try {
      await env.setStorage(USER_ID_KEY, userId);
    } catch (e) {
      console.warn('[ProgressStore] save userId failed:', e);
    }
    return userId;
  }

  async _loadProgress(env) {
    try {
      const raw = await env.getStorage(PROGRESS_KEY);
      if (!raw) return {};
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return data && typeof data === 'object' ? data : {};
    } catch (e) {
      return {};
    }
  }

  getProgress() {
    return this.progress;
  }

  getUserId() {
    return this.userId;
  }

  async save(env) {
    try {
      await env.setStorage(PROGRESS_KEY, JSON.stringify(this.progress));
    } catch (e) {
      console.warn('[ProgressStore] save progress failed:', e);
    }
  }

  async updateLevel(env, levelId, { stars, time }) {
    if (!levelId || stars <= 0) return;
    const cur = this.progress[levelId] || { stars: 0, bestTime: Infinity };
    this.progress[levelId] = {
      stars: Math.max(cur.stars, stars),
      bestTime: Math.min(cur.bestTime, time ?? Infinity),
    };
    await this.save(env);
  }
}

module.exports = ProgressStore;
