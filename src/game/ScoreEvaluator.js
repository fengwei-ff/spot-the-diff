function evaluate({ elapsedTime, missCount, hintUsed, thresholds }) {
  if (elapsedTime <= thresholds[3] && missCount === 0 && hintUsed === 0) return 3;
  if (elapsedTime <= thresholds[2] && (missCount <= 1 || hintUsed <= 1)) return 2;
  if (elapsedTime <= thresholds[1]) return 1;
  return 0;
}

module.exports = { evaluate };
