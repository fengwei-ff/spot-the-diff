/**
 * 生成占位音效与轻快休闲 BGM（输出 MP3，控制主包体积）
 * 运行: node scripts/generate-audio.js
 * 依赖: ffmpeg
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUT_DIR = path.join(__dirname, '../assets/audio');
const TMP_DIR = path.join(__dirname, '.tmp');
const SFX_SAMPLE_RATE = 22050;
const BGM_SAMPLE_RATE = 11025;

function writeWav(filePath, samples, sampleRate) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.writeFileSync(filePath, buffer);
}

function writeMp3(name, samples, sampleRate, bitrate) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const tmpWav = path.join(TMP_DIR, `${name}.wav`);
  const mp3Path = path.join(OUT_DIR, `${name}.mp3`);
  writeWav(tmpWav, samples, sampleRate);
  execSync(
    `ffmpeg -y -loglevel error -i "${tmpWav}" -codec:a libmp3lame -b:a ${bitrate} -ar ${sampleRate} -ac 1 "${mp3Path}"`,
  );
  fs.unlinkSync(tmpWav);
  const kb = Math.round(fs.statSync(mp3Path).size / 1024);
  console.log(`wrote ${mp3Path} (${kb}K)`);
}

function env(t, attack, release, total) {
  if (t < attack) return t / attack;
  if (t > total - release) return Math.max(0, (total - t) / release);
  return 1;
}

function sine(freq, t) {
  return Math.sin(2 * Math.PI * freq * t);
}

function noise() {
  return Math.random() * 2 - 1;
}

function render(duration, sampleRate, fn) {
  const len = Math.floor(sampleRate * duration);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = fn(i / sampleRate, i / len);
  }
  return out;
}

const assets = {
  tap: () => render(0.06, SFX_SAMPLE_RATE, (t) => sine(920, t) * env(t, 0.002, 0.03, 0.06) * 0.35
    + noise() * env(t, 0.001, 0.02, 0.06) * 0.08),

  hit: () => render(0.22, SFX_SAMPLE_RATE, (t) => {
    const f = 520 + t * 900;
    return sine(f, t) * env(t, 0.005, 0.08, 0.22) * 0.4
      + sine(f * 2, t) * env(t, 0.005, 0.1, 0.22) * 0.12;
  }),

  miss: () => render(0.28, SFX_SAMPLE_RATE, (t) => sine(180 - t * 120, t) * env(t, 0.01, 0.12, 0.28) * 0.45
    + noise() * env(t, 0.005, 0.15, 0.28) * 0.1),

  hint: () => render(0.18, SFX_SAMPLE_RATE, (t) => sine(660, t) * env(t, 0.01, 0.1, 0.18) * 0.32
    + sine(990, t) * env(t, 0.02, 0.12, 0.18) * 0.18),

  clear: () => render(0.55, SFX_SAMPLE_RATE, (t) => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    let s = 0;
    notes.forEach((f, i) => {
      const start = i * 0.09;
      if (t >= start) {
        const lt = t - start;
        s += sine(f, lt) * env(lt, 0.01, 0.2, 0.35) * 0.22;
      }
    });
    return s;
  }),

  fail: () => render(0.45, SFX_SAMPLE_RATE, (t) => sine(320 - t * 260, t) * env(t, 0.01, 0.2, 0.45) * 0.42),

  bgm: () => {
    const BPM = 120;
    const BEAT = 60 / BPM;
    const BAR = BEAT * 4;
    const BARS = 4;
    const duration = BAR * BARS;

    const chordRoots = [261.63, 392.0, 220.0, 174.61];
    const chordThirds = [329.63, 493.88, 261.63, 220.0];
    const chordFifths = [392.0, 587.33, 329.63, 261.63];

    const melody = [
      [523.25, 0, 0.45], [659.25, 0.5, 0.45], [783.99, 1, 0.9],
      [659.25, 2, 0.45], [587.33, 2.5, 0.45], [523.25, 3, 0.9],
      [587.33, 4, 0.45], [659.25, 4.5, 0.45], [783.99, 5, 0.9],
      [880.0, 6, 0.45], [783.99, 6.5, 0.45], [659.25, 7, 1.1],
      [523.25, 8, 0.45], [659.25, 8.5, 0.45], [587.33, 9, 0.9],
      [523.25, 10, 0.45], [493.88, 10.5, 0.45], [523.25, 11, 1.3],
    ].map(([freq, beat, dur]) => ({ freq, start: beat * BEAT, dur: dur * BEAT }));

    const pluck = (freq, lt, total) => {
      const e = env(lt, 0.004, Math.min(0.12, total * 0.45), total);
      return (sine(freq, lt) * 0.55 + sine(freq * 2, lt) * 0.12 + sine(freq * 3, lt) * 0.04) * e;
    };

    return render(duration, BGM_SAMPLE_RATE, (t) => {
      const barIndex = Math.floor(t / BAR) % 4;
      const beatInBar = (t % BAR) / BEAT;
      const root = chordRoots[barIndex];
      const third = chordThirds[barIndex];
      const fifth = chordFifths[barIndex];

      const padEnv = 0.65 + 0.35 * Math.sin(2 * Math.PI * t / BAR);
      const pad = (sine(root, t) * 0.05 + sine(third, t) * 0.04 + sine(fifth, t) * 0.03) * padEnv;

      const bassBeat = beatInBar < 0.12 ? env(beatInBar, 0.005, 0.08, 0.12) : 0;
      const bass = sine(root / 2, t) * bassBeat * 0.14;

      const offbeat = beatInBar % 1;
      const clapEnv = offbeat > 0.45 && offbeat < 0.55 ? env(offbeat - 0.45, 0.002, 0.04, 0.1) : 0;
      const clap = noise() * clapEnv * 0.035;

      let lead = 0;
      for (const note of melody) {
        if (t >= note.start && t < note.start + note.dur) {
          lead += pluck(note.freq, t - note.start, note.dur);
        }
      }

      return pad + bass + clap + lead * 0.42;
    });
  },
};

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const name of fs.readdirSync(OUT_DIR)) {
  if (name.endsWith('.wav') || name.endsWith('.mp3')) {
    fs.unlinkSync(path.join(OUT_DIR, name));
  }
}

for (const [name, fn] of Object.entries(assets)) {
  const samples = fn();
  const sampleRate = name === 'bgm' ? BGM_SAMPLE_RATE : SFX_SAMPLE_RATE;
  const bitrate = name === 'bgm' ? '48k' : '64k';
  writeMp3(name, samples, sampleRate, bitrate);
}
