// Tiny chiptune engine: everything is synthesised with WebAudio oscillators, so
// the game ships with no audio files at all.

const NOTE_OFFSETS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" / "C#5" / "Bb3" -> frequency in Hz. `-` means rest (returns 0). */
function freq(note) {
  if (!note || note === '-') return 0;
  const letter = note[0].toUpperCase();
  let i = 1;
  let semitone = NOTE_OFFSETS[letter];
  if (note[i] === '#') { semitone++; i++; }
  else if (note[i] === 'b') { semitone--; i++; }
  const octave = parseInt(note.slice(i), 10);
  return 440 * Math.pow(2, (semitone - 9) / 12 + (octave - 4));
}

// Each track is { bpm, lead: [...], bass: [...] } where a voice is a flat list
// of "note:beats" tokens. Written as strings to keep the songs readable.
const TRACKS = {
  town: {
    bpm: 138, wave: 'square',
    lead: 'E5:1 G5:1 A5:1 B5:1 A5:1 G5:1 E5:2 D5:1 E5:1 G5:2 -:1 E5:1 G5:1 A5:1 C6:1 B5:1 A5:1 G5:2 E5:2 D5:2 -:2',
    bass: 'A2:2 A2:2 E2:2 E2:2 F2:2 F2:2 G2:2 G2:2 A2:2 A2:2 E2:2 E2:2 D2:2 D2:2 E2:2 E2:2',
  },
  route: {
    bpm: 152, wave: 'square',
    lead: 'C5:1 E5:1 G5:1 E5:1 F5:1 A5:1 C6:2 B5:1 G5:1 A5:1 F5:1 G5:2 E5:2 C5:1 E5:1 G5:1 C6:1 B5:2 G5:2 A5:4',
    bass: 'C3:2 C3:1 G2:1 F2:2 F2:2 G2:2 G2:2 C3:2 C3:2 F2:2 G2:2 C3:4',
  },
  battle: {
    bpm: 176, wave: 'square',
    lead: 'D5:1 D5:1 F5:1 A5:1 G5:1 F5:1 D5:2 C5:1 D5:1 F5:1 D5:1 A#4:2 A4:2 D5:1 F5:1 A5:1 D6:1 C6:2 A5:1 F5:1 D5:4',
    bass: 'D2:1 D2:1 D2:1 D2:1 A#1:1 A#1:1 A#1:1 A#1:1 C2:1 C2:1 C2:1 C2:1 A1:1 A1:1 A1:1 A1:1 D2:1 D2:1 D2:1 D2:1 F2:2 A1:2',
  },
  gym: {
    bpm: 168, wave: 'sawtooth',
    lead: 'A4:1 C5:1 E5:1 A5:1 G5:1 E5:2 C5:1 D5:1 F5:1 A5:1 G5:2 E5:2 A4:1 C5:1 E5:1 G5:1 F5:2 D5:2 C5:4',
    bass: 'A2:1 A2:1 A2:1 A2:1 F2:1 F2:1 F2:1 F2:1 G2:1 G2:1 G2:1 G2:1 A2:2 E2:2',
  },
  indoor: {
    bpm: 120, wave: 'triangle',
    lead: 'G4:2 B4:2 D5:2 B4:2 C5:2 E5:2 G5:4 F5:2 D5:2 E5:2 C5:2 D5:4 -:2',
    bass: 'G2:4 C3:4 F2:4 G2:4',
  },
  heal: {
    bpm: 150, wave: 'triangle',
    lead: 'C5:1 E5:1 G5:1 C6:1 G5:1 E5:1 C5:2',
    bass: 'C3:2 G2:2 C3:4',
    once: true,
  },
};

class ChipAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.current = null;
    this.timer = null;
    this.voices = [];
  }

  /** Must be called from a user gesture; browsers block audio otherwise. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.55;
    this.musicGain.connect(this.master);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.32;
    return this.muted;
  }

  toggleMute() { return this.setMuted(!this.muted); }

  /** Start a looping track by name. No-op if it is already playing. */
  play(name) {
    if (!this.ctx || this.current === name) return;
    this.stop();
    const track = TRACKS[name];
    if (!track) return;
    this.current = name;
    this.scheduleTrack(track, name);
  }

  scheduleTrack(track, name) {
    const beat = 60 / track.bpm;
    const lead = parseVoice(track.lead);
    const bass = parseVoice(track.bass);
    const length = Math.max(totalBeats(lead), totalBeats(bass)) * beat;
    const start = this.ctx.currentTime + 0.05;

    this.emitVoice(lead, start, beat, track.wave, 0.16);
    this.emitVoice(bass, start, beat, 'triangle', 0.22);

    if (track.once) {
      this.timer = setTimeout(() => { if (this.current === name) this.current = null; }, length * 1000);
      return;
    }
    this.timer = setTimeout(() => {
      if (this.current === name) this.scheduleTrack(track, name);
    }, Math.max(60, length * 1000 - 60));
  }

  emitVoice(notes, start, beat, wave, gain) {
    let t = start;
    for (const { note, beats } of notes) {
      const dur = beats * beat;
      const hz = freq(note);
      if (hz > 0) this.blip(hz, t, dur * 0.92, wave, gain, this.musicGain);
      t += dur;
    }
  }

  blip(hz, when, dur, wave, peak, dest) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, when);
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(peak, when + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(env);
    env.connect(dest || this.master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    this.voices.push(osc);
    osc.onended = () => {
      const i = this.voices.indexOf(osc);
      if (i >= 0) this.voices.splice(i, 1);
    };
  }

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
    this.current = null;
    // Ramp the music bus down so in-flight notes do not click off.
    if (this.musicGain) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);
      this.musicGain.gain.setValueAtTime(0.55, now + 0.1);
    }
  }

  /** One-shot sound effects, all synthesised. */
  sfx(name) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    switch (name) {
      case 'select': this.blip(880, now, 0.07, 'square', 0.2); break;
      case 'cancel': this.blip(300, now, 0.09, 'square', 0.18); break;
      case 'bump':   this.blip(140, now, 0.08, 'square', 0.14); break;
      case 'hit':
        this.blip(220, now, 0.09, 'sawtooth', 0.22);
        this.blip(150, now + 0.05, 0.12, 'square', 0.18);
        break;
      case 'super':
        this.blip(320, now, 0.07, 'sawtooth', 0.24);
        this.blip(440, now + 0.06, 0.09, 'sawtooth', 0.24);
        this.blip(180, now + 0.14, 0.16, 'square', 0.2);
        break;
      case 'faint':
        [520, 440, 360, 280, 200].forEach((hz, i) => this.blip(hz, now + i * 0.07, 0.1, 'square', 0.16));
        break;
      case 'ball':
        this.blip(520, now, 0.06, 'square', 0.18);
        this.blip(660, now + 0.06, 0.08, 'square', 0.18);
        break;
      case 'caught':
        [523, 659, 784, 1046].forEach((hz, i) => this.blip(hz, now + i * 0.1, 0.16, 'square', 0.2));
        break;
      case 'levelup':
        [659, 784, 988, 1318].forEach((hz, i) => this.blip(hz, now + i * 0.08, 0.14, 'square', 0.18));
        break;
      case 'save':
        this.blip(660, now, 0.09, 'triangle', 0.2);
        this.blip(880, now + 0.1, 0.14, 'triangle', 0.2);
        break;
      case 'encounter':
        for (let i = 0; i < 6; i++) this.blip(i % 2 ? 700 : 460, now + i * 0.06, 0.06, 'square', 0.2);
        break;
      default: break;
    }
  }
}

function parseVoice(str) {
  return str.trim().split(/\s+/).map((token) => {
    const [note, beats] = token.split(':');
    return { note, beats: Number(beats) || 1 };
  });
}

const totalBeats = (notes) => notes.reduce((sum, n) => sum + n.beats, 0);

export const audio = new ChipAudio();
