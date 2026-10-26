# Rendering comparison

Compared against the exact client.js from the user's uploaded archive. Five trials per scenario, median of 120-frame runs, with 15 players and 256 bullets. Results use a deterministic fake DOM/Canvas command harness in Node.js. They measure client JavaScript and drawing-command work, not actual browser GPU frame rate, internet latency, or guaranteed FPS on a MacBook/phone.

| Scenario | Uploaded client | Optimized client | Ratio |
| --- | ---: | ---: | ---: |
| Typical view, many entities off screen | 181.42 ms | 67.44 ms | 2.69× |
| All players and bullets visible | 178.14 ms | 136.96 ms | 1.30× |

In the typical view, Canvas commands fell from 560,100 to 95,820 over 120 frames (about 83% fewer). Repeated static gradient builds fell from 240 to zero after cache warmup. With unchanged displayed HUD values, unnecessary DOM writes fell from 1,200 to zero. Actual health/score/feed/timer changes are tested separately and remain live.

The core server, shared physics, uploaded sound design, maps, and input behavior are unchanged. No visual quality setting or device-pixel-ratio reduction was used to obtain these measurements.

Run the current renderer benchmark:

```sh
node benchmark-render.js
```

For a before/after comparison against a retained previous client:

```sh
node benchmark-render.js /absolute/path/to/previous/client.js
```

Run regression tests:

```sh
npm test
```
