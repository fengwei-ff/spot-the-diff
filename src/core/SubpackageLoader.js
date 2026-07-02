const SUBPACKAGE_LEVEL_IMAGES = 'levelImages';

let levelImagesPromise = null;

async function ensureLevelImages(env) {
  if (!env.isWx) return;
  if (levelImagesPromise) return levelImagesPromise;
  levelImagesPromise = env.loadSubpackage(SUBPACKAGE_LEVEL_IMAGES).catch((err) => {
    levelImagesPromise = null;
    throw err;
  });
  return levelImagesPromise;
}

module.exports = { ensureLevelImages, SUBPACKAGE_LEVEL_IMAGES };
