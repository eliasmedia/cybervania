# cybervania/audio/ — intentionally empty

**CYBERVANIA ships no audio files.** All music and sound is synthesised at runtime through
the WebAudio API in `../src/audio/audio.js`.

## The music engine

A step sequencer running 16th notes against a per-region preset. There are no tracks — a
region is a *parameter set*, and the same four voices are re-tuned to produce its identity:

| Voice | Construction |
|---|---|
| **Bass** | Square osc → resonant lowpass with a fast downward sweep (PWM-ish pluck) |
| **Arp** | Region-selected waveform → lowpass, 16th-note ladder through the chord |
| **Lead** | Two detuned saws → sweeping lowpass. The synthwave lead in one gesture. |
| **Pad** | Six detuned saws an octave down, long attack, long release |
| **Drums** | Sine kick with pitch envelope; filtered noise for snare and hat |

Each region preset sets tempo, root, mode (`minor`, `phrygian`, `dorian`, `wholetone`,
`locrian`), a four-bar chord progression, filter cutoff, detune amount, and the mix level
of each voice. That is what makes the Undercity sound like slow warm decay and the Reactor
sound like a locrian panic attack, from one engine.

Presets live in `TRACKS` in `../src/audio/audio.js`: eight regions plus `boss`, `atlas`
and `data`.

## The Data Sphere filter

Entering the Data Sphere does not change the track. It drops a lowpass on the whole music
bus to 1.4 kHz and raises its Q to 5. Losing the top end and gaining a resonant peak is
most of the "you are somewhere else" feeling, and it costs two lines.

## SFX

~40 procedural one-shots, each a short oscillator sweep and/or filtered noise burst
(`SFX` in `audio.js`). No sample is longer than a second and none is stored.

## Timing

Scheduling uses a 25 ms `setInterval` with a 120 ms lookahead against
`AudioContext.currentTime`, which is the standard way to get sample-accurate WebAudio
timing without depending on JS timer jitter.

## Browser autoplay policy

`AudioContext` cannot start before a user gesture. The title screen provides it: the first
keypress or click calls `CV.Audio.unlock()`. If WebAudio is unavailable the whole audio
layer no-ops and the game runs silently rather than throwing.

## If you want to add real music

`CV.Audio.setRegion(id)` is the only call the rest of the game makes. Replace its body with
an `<audio>` element or a decoded buffer per region and everything else keeps working —
but note that streaming files reintroduces the `file://` restriction the game currently
avoids entirely.
