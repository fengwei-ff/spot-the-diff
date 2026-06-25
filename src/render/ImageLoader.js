class ImageLoader {
  constructor(env) {
    this.env = env;
    this.cache = new Map();
  }

  load(url) {
    if (this.cache.has(url)) return Promise.resolve(this.cache.get(url));
    return this._create(url, true);
  }

  loadFresh(url) {
    return this._create(url, false);
  }

  _create(url, useCache) {
    return new Promise((resolve, reject) => {
      const img = this.env.createImage();
      img.onload = () => {
        if (useCache) this.cache.set(url, img);
        resolve(img);
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  }

  loadAll(urls) {
    return Promise.all(urls.map((u) => this.load(u)));
  }
}

module.exports = ImageLoader;
