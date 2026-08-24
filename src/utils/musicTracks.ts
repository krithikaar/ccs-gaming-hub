// Famous Copyright-Free Public Domain Melodies & Synthesizer Arrangements for Music Matrix

export interface SongNote {
  id: number;
  lane: 0 | 1; // 0 = Left Lane (←), 1 = Right Lane (→)
  time: number; // Time in seconds from song start when block reaches bottom line
  freq: number; // Pitch frequency in Hz
  noteName: string;
  duration: number; // Note sustain duration in seconds
  isAccent?: boolean; // Highlighted note (beat drop)
}

export interface SongTrack {
  id: string;
  title: string;
  composer: string;
  icon: string;
  bpm: number;
  duration: number; // Total song length in seconds
  difficulty: 'Easy' | 'Medium' | 'Upbeat' | 'Lively' | 'Fast' | 'Virtuoso';
  description: string;
  color: string;
  notes: SongNote[];
  bassChords: { time: number; bassFreq: number; chordFreqs: number[]; duration: number }[];
}

// Frequency helpers
const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00, B3 = 246.94;
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88;
const C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00, B5 = 987.77, C6 = 1046.50;
const Dsharp4 = 311.13, Fsharp4 = 369.99, Gsharp4 = 415.30, Asharp4 = 466.16;
const Dsharp5 = 622.25, Fsharp5 = 739.99, Gsharp5 = 830.61, Asharp5 = 932.33;

// 1. "Ode to Joy" (Ludwig van Beethoven - Symphony No. 9) - 98 BPM (Relaxed & Accessible)
function generateOdeToJoy(): SongTrack {
  const bpm = 98;
  const beat = 60 / bpm; // ~0.612s per quarter beat
  const startOffset = 2.0; // 2s initial prep runway

  const melodyNotes: { pitch: number; name: string; beats: number; lane: 0 | 1; isAccent?: boolean }[] = [
    // Phrase 1
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: F4, name: 'F4', beats: 1, lane: 1 },
    { pitch: G4, name: 'G4', beats: 1, lane: 1, isAccent: true },
    { pitch: G4, name: 'G4', beats: 1, lane: 1 },
    { pitch: F4, name: 'F4', beats: 1, lane: 1 },
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: D4, name: 'D4', beats: 1, lane: 0 },
    { pitch: C4, name: 'C4', beats: 1, lane: 0 },
    { pitch: C4, name: 'C4', beats: 1, lane: 0 },
    { pitch: D4, name: 'D4', beats: 1, lane: 1 },
    { pitch: E4, name: 'E4', beats: 1, lane: 1, isAccent: true },
    { pitch: E4, name: 'E4', beats: 1.5, lane: 0 },
    { pitch: D4, name: 'D4', beats: 0.5, lane: 0 },
    { pitch: D4, name: 'D4', beats: 2, lane: 0 },

    // Phrase 2
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: F4, name: 'F4', beats: 1, lane: 1 },
    { pitch: G4, name: 'G4', beats: 1, lane: 1, isAccent: true },
    { pitch: G4, name: 'G4', beats: 1, lane: 1 },
    { pitch: F4, name: 'F4', beats: 1, lane: 1 },
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: D4, name: 'D4', beats: 1, lane: 0 },
    { pitch: C4, name: 'C4', beats: 1, lane: 0 },
    { pitch: C4, name: 'C4', beats: 1, lane: 0 },
    { pitch: D4, name: 'D4', beats: 1, lane: 1 },
    { pitch: E4, name: 'E4', beats: 1, lane: 1, isAccent: true },
    { pitch: D4, name: 'D4', beats: 1.5, lane: 0 },
    { pitch: C4, name: 'C4', beats: 0.5, lane: 0 },
    { pitch: C4, name: 'C4', beats: 2, lane: 0 },

    // Bridge
    { pitch: D4, name: 'D4', beats: 1, lane: 1 },
    { pitch: D4, name: 'D4', beats: 1, lane: 1 },
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: C4, name: 'C4', beats: 1, lane: 0, isAccent: true },
    { pitch: D4, name: 'D4', beats: 1, lane: 1 },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: F4, name: 'F4', beats: 0.5, lane: 1 },
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: C4, name: 'C4', beats: 1, lane: 0 },
    { pitch: D4, name: 'D4', beats: 1, lane: 1 },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: F4, name: 'F4', beats: 0.5, lane: 1 },
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: D4, name: 'D4', beats: 1, lane: 1 },
    { pitch: C4, name: 'C4', beats: 1, lane: 0 },
    { pitch: D4, name: 'D4', beats: 1, lane: 1 },
    { pitch: G3, name: 'G3', beats: 2, lane: 0, isAccent: true },

    // Climax Reprise
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: F4, name: 'F4', beats: 1, lane: 1 },
    { pitch: G4, name: 'G4', beats: 1, lane: 1, isAccent: true },
    { pitch: G4, name: 'G4', beats: 1, lane: 1 },
    { pitch: F4, name: 'F4', beats: 1, lane: 1 },
    { pitch: E4, name: 'E4', beats: 1, lane: 0 },
    { pitch: D4, name: 'D4', beats: 1, lane: 0 },
    { pitch: C4, name: 'C4', beats: 1, lane: 0 },
    { pitch: C4, name: 'C4', beats: 1, lane: 0 },
    { pitch: D4, name: 'D4', beats: 1, lane: 1 },
    { pitch: E4, name: 'E4', beats: 1, lane: 1, isAccent: true },
    { pitch: D4, name: 'D4', beats: 1.5, lane: 0 },
    { pitch: C4, name: 'C4', beats: 0.5, lane: 0 },
    { pitch: C4, name: 'C4', beats: 3, lane: 0, isAccent: true },
  ];

  let currentTime = startOffset;
  let noteId = 1;
  const notes: SongNote[] = [];

  for (const n of melodyNotes) {
    notes.push({
      id: noteId++,
      lane: n.lane,
      time: Math.round(currentTime * 1000) / 1000,
      freq: n.pitch,
      noteName: n.name,
      duration: n.beats * beat * 0.9,
      isAccent: n.isAccent,
    });
    currentTime += n.beats * beat;
  }

  // Harmonic bass accompaniment chords
  const bassChords: SongTrack['bassChords'] = [];
  let chordTime = startOffset;
  const chordProgression = [
    { bass: C3, chords: [E3, G3] },
    { bass: G3, chords: [D3, B3] },
    { bass: C3, chords: [E3, G3] },
    { bass: G3, chords: [D3, F3] },
    { bass: C3, chords: [E3, G3] },
    { bass: F3, chords: [A3, C4] },
    { bass: C3, chords: [E3, G3] },
    { bass: G3, chords: [D3, B3] },
  ];

  for (let i = 0; i < 16; i++) {
    const cp = chordProgression[i % chordProgression.length];
    bassChords.push({
      time: Math.round(chordTime * 1000) / 1000,
      bassFreq: cp.bass,
      chordFreqs: cp.chords,
      duration: beat * 4 * 0.95,
    });
    chordTime += beat * 4;
  }

  return {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    composer: 'L. v. Beethoven',
    icon: '✨',
    bpm,
    duration: Math.ceil(currentTime + 1.5),
    difficulty: 'Easy',
    description: 'Relaxed uplifting anthem with gentle 2-lane rhythm flow.',
    color: '#06b6d4',
    notes,
    bassChords,
  };
}

// 2. "Für Elise" (Ludwig van Beethoven) - 110 BPM
function generateFurElise(): SongTrack {
  const bpm = 110;
  const beat = 60 / bpm; // ~0.545s per quarter beat
  const startOffset = 2.0;

  const rawMotifs: { pitch: number; name: string; beats: number; lane: 0 | 1; isAccent?: boolean }[] = [
    // Intro Main Theme (E-D#-E-D#-E-B-D-C-A)
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0, isAccent: true },
    { pitch: Dsharp5, name: 'D#5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: Dsharp5, name: 'D#5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 1 },
    { pitch: A4, name: 'A4', beats: 1.5, lane: 0, isAccent: true },

    // Left hand arpeggio answer (C-E-A-B)
    { pitch: C4, name: 'C4', beats: 0.5, lane: 0 },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: A4, name: 'A4', beats: 0.5, lane: 1 },
    { pitch: B4, name: 'B4', beats: 1.5, lane: 1, isAccent: true },

    // Right hand arpeggio answer (E-G#-B-C)
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: Gsharp4, name: 'G#4', beats: 0.5, lane: 1 },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: C5, name: 'C5', beats: 1.5, lane: 0, isAccent: true },

    // Reprise 1
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0, isAccent: true },
    { pitch: Dsharp5, name: 'D#5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: Dsharp5, name: 'D#5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 1 },
    { pitch: A4, name: 'A4', beats: 1.5, lane: 0, isAccent: true },

    // Left hand arpeggio
    { pitch: C4, name: 'C4', beats: 0.5, lane: 0 },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: A4, name: 'A4', beats: 0.5, lane: 1 },
    { pitch: B4, name: 'B4', beats: 1.5, lane: 1, isAccent: true },

    // Cadence (E-C-B-A)
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 0 },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: A4, name: 'A4', beats: 2.0, lane: 0, isAccent: true },

    // Section B (C major lift)
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 0 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 1.5, lane: 0, isAccent: true },
    { pitch: G4, name: 'G4', beats: 0.5, lane: 0 },
    { pitch: F5, name: 'F5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: D5, name: 'D5', beats: 1.5, lane: 1, isAccent: true },
    { pitch: F4, name: 'F4', beats: 0.5, lane: 0 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 1 },
    { pitch: C5, name: 'C5', beats: 1.5, lane: 0, isAccent: true },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 1 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 0 },
    { pitch: B4, name: 'B4', beats: 2.0, lane: 1, isAccent: true },

    // Final Main Theme Loop
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0, isAccent: true },
    { pitch: Dsharp5, name: 'D#5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: Dsharp5, name: 'D#5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 1 },
    { pitch: A4, name: 'A4', beats: 2.5, lane: 0, isAccent: true },
  ];

  let currentTime = startOffset;
  let noteId = 1;
  const notes: SongNote[] = [];

  for (const n of rawMotifs) {
    notes.push({
      id: noteId++,
      lane: n.lane,
      time: Math.round(currentTime * 1000) / 1000,
      freq: n.pitch,
      noteName: n.name,
      duration: n.beats * beat * 0.85,
      isAccent: n.isAccent,
    });
    currentTime += n.beats * beat;
  }

  const bassChords: SongTrack['bassChords'] = [];
  let chordTime = startOffset;
  const bassProgression = [
    { bass: A3, chords: [C4, E4] },
    { bass: E3, chords: [Gsharp4, B4] },
    { bass: A3, chords: [C4, E4] },
    { bass: E3, chords: [Gsharp4, B4] },
    { bass: C3, chords: [E4, G4] },
    { bass: G3, chords: [B4, D5] },
    { bass: A3, chords: [C4, E4] },
    { bass: E3, chords: [Gsharp4, B4] },
  ];

  for (let i = 0; i < 12; i++) {
    const cp = bassProgression[i % bassProgression.length];
    bassChords.push({
      time: Math.round(chordTime * 1000) / 1000,
      bassFreq: cp.bass,
      chordFreqs: cp.chords,
      duration: beat * 3 * 0.9,
    });
    chordTime += beat * 3;
  }

  return {
    id: 'fur-elise',
    title: 'Für Elise',
    composer: 'L. v. Beethoven',
    icon: '🌸',
    bpm,
    duration: Math.ceil(currentTime + 1.5),
    difficulty: 'Medium',
    description: 'Smooth flowing arpeggios at a gentle, rhythmic pace.',
    color: '#ec4899',
    notes,
    bassChords,
  };
}

// 3. "The Entertainer" (Scott Joplin) - 118 BPM
function generateTheEntertainer(): SongTrack {
  const bpm = 118;
  const beat = 60 / bpm;
  const startOffset = 2.0;

  const rawNotes: { pitch: number; name: string; beats: number; lane: 0 | 1; isAccent?: boolean }[] = [
    // Intro Ragtime Pickup (D-D#-E-C)
    { pitch: D4, name: 'D4', beats: 0.5, lane: 0 },
    { pitch: Dsharp4, name: 'D#4', beats: 0.5, lane: 1 },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 1.0, lane: 1, isAccent: true },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 1.5, lane: 1, isAccent: true },

    // Measure 2 (D-D#-E-C-D-E-C-D-E-C)
    { pitch: D4, name: 'D4', beats: 0.5, lane: 0 },
    { pitch: Dsharp4, name: 'D#4', beats: 0.5, lane: 1 },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 0 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 1 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 0 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 1.0, lane: 0, isAccent: true },

    // Ragtime Swing Run (C-D-D#-E-C-D-E)
    { pitch: C5, name: 'C5', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 0 },
    { pitch: Dsharp5, name: 'D#5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0, isAccent: true },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 2.0, lane: 1, isAccent: true },

    // Phrase 2 (Syncopated Bass & Stride)
    { pitch: D4, name: 'D4', beats: 0.5, lane: 0 },
    { pitch: Dsharp4, name: 'D#4', beats: 0.5, lane: 1 },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 1.0, lane: 1, isAccent: true },
    { pitch: E4, name: 'E4', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 1.5, lane: 1, isAccent: true },

    // Ending Stride
    { pitch: A4, name: 'A4', beats: 0.5, lane: 0 },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 0 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 2.5, lane: 1, isAccent: true },
  ];

  let currentTime = startOffset;
  let noteId = 1;
  const notes: SongNote[] = [];

  for (const n of rawNotes) {
    notes.push({
      id: noteId++,
      lane: n.lane,
      time: Math.round(currentTime * 1000) / 1000,
      freq: n.pitch,
      noteName: n.name,
      duration: n.beats * beat * 0.8,
      isAccent: n.isAccent,
    });
    currentTime += n.beats * beat;
  }

  const bassChords: SongTrack['bassChords'] = [];
  let chordTime = startOffset;
  for (let i = 0; i < 10; i++) {
    bassChords.push({
      time: Math.round(chordTime * 1000) / 1000,
      bassFreq: C3,
      chordFreqs: [E4, G4],
      duration: beat * 2 * 0.9,
    });
    chordTime += beat * 2;
  }

  return {
    id: 'the-entertainer',
    title: 'The Entertainer',
    composer: 'Scott Joplin',
    icon: '🎩',
    bpm,
    duration: Math.ceil(currentTime + 1.5),
    difficulty: 'Upbeat',
    description: 'Bouncy ragtime swing at a steady, enjoyable groove.',
    color: '#eab308',
    notes,
    bassChords,
  };
}

// 4. "Eine kleine Nachtmusik" (W. A. Mozart) - 126 BPM
function generateNachtmusik(): SongTrack {
  const bpm = 126;
  const beat = 60 / bpm;
  const startOffset = 2.0;

  const rawNotes: { pitch: number; name: string; beats: number; lane: 0 | 1; isAccent?: boolean }[] = [
    // Theme Allegro: G - D - G - D - G - B - D
    { pitch: G4, name: 'G4', beats: 1.0, lane: 0, isAccent: true },
    { pitch: D4, name: 'D4', beats: 1.0, lane: 1 },
    { pitch: G4, name: 'G4', beats: 0.5, lane: 0 },
    { pitch: D4, name: 'D4', beats: 0.5, lane: 1 },
    { pitch: G4, name: 'G4', beats: 0.5, lane: 0 },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 2.0, lane: 0, isAccent: true },

    // Answer: C - G - C - G - C - E - G
    { pitch: C5, name: 'C5', beats: 1.0, lane: 1, isAccent: true },
    { pitch: G4, name: 'G4', beats: 1.0, lane: 0 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 1 },
    { pitch: G4, name: 'G4', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 1 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 0 },
    { pitch: G5, name: 'G5', beats: 2.0, lane: 1, isAccent: true },

    // Rapid Triplet/Eighth Motif
    { pitch: G5, name: 'G5', beats: 0.5, lane: 1 },
    { pitch: Fsharp5, name: 'F#5', beats: 0.5, lane: 0 },
    { pitch: E5, name: 'E5', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 0.5, lane: 0 },
    { pitch: C5, name: 'C5', beats: 0.5, lane: 1 },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 0 },
    { pitch: A4, name: 'A4', beats: 1.0, lane: 1, isAccent: true },
    { pitch: D5, name: 'D5', beats: 1.0, lane: 0, isAccent: true },
    { pitch: G4, name: 'G4', beats: 2.0, lane: 0, isAccent: true },

    // Fast Reprise
    { pitch: G4, name: 'G4', beats: 1.0, lane: 0, isAccent: true },
    { pitch: D4, name: 'D4', beats: 1.0, lane: 1 },
    { pitch: G4, name: 'G4', beats: 0.5, lane: 0 },
    { pitch: D4, name: 'D4', beats: 0.5, lane: 1 },
    { pitch: G4, name: 'G4', beats: 0.5, lane: 0 },
    { pitch: B4, name: 'B4', beats: 0.5, lane: 1 },
    { pitch: D5, name: 'D5', beats: 2.5, lane: 0, isAccent: true },
  ];

  let currentTime = startOffset;
  let noteId = 1;
  const notes: SongNote[] = [];

  for (const n of rawNotes) {
    notes.push({
      id: noteId++,
      lane: n.lane,
      time: Math.round(currentTime * 1000) / 1000,
      freq: n.pitch,
      noteName: n.name,
      duration: n.beats * beat * 0.8,
      isAccent: n.isAccent,
    });
    currentTime += n.beats * beat;
  }

  const bassChords: SongTrack['bassChords'] = [];
  let chordTime = startOffset;
  for (let i = 0; i < 8; i++) {
    bassChords.push({
      time: Math.round(chordTime * 1000) / 1000,
      bassFreq: G3,
      chordFreqs: [B3, D4],
      duration: beat * 4 * 0.9,
    });
    chordTime += beat * 4;
  }

  return {
    id: 'nachtmusik',
    title: 'Eine kleine Nachtmusik',
    composer: 'W. A. Mozart',
    icon: '⚡',
    bpm,
    duration: Math.ceil(currentTime + 1.5),
    difficulty: 'Lively',
    description: 'Classical symphony rhythm with balanced cross-lane hits.',
    color: '#8b5cf6',
    notes,
    bassChords,
  };
}

export const SONG_TRACKS: SongTrack[] = [
  generateOdeToJoy(),
  generateFurElise(),
  generateTheEntertainer(),
  generateNachtmusik(),
];
