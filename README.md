# The Legend of MEMPHYS Mane

A retro 90s beat-'em-up (Turtles in Time feel) set in Memphis, TN, starring MEMPHYS Mane. A free promo game for MEMPHYS Water, built to run in a phone browser and embed on memphyswater.com.

This is the first playable: **Mission 1, "The Sip"**, in the alley behind Uncle T's Pit at Park & Airways, Orange Mound, at night.

## Play

- **Phone:** turn it sideways. Left thumb anywhere on the left half is the stick. HIT, JUMP, SIP, FLEX on the right. Tap to advance dialogue, SKIP to jump past the intro.
- **Keyboard:** arrows/WASD move, Z or J punch, X/K/Space jump, C or L sip, V or I flex, Esc or P pause.
- Add `?play` to the URL to skip the title screen.

What's in Mission 1: the intro (Malik, the Shiesty Boys, Uncle T's toss, the one-frame flash of Old Memphis, Mane bursting out of the can), four fight waves, a three-hit combo and flying kick, potholes that trip you, drive-out cars to jump or dodge (they flatten Shiesty Boys too), breakable trash cans with ribs, wings and MEMPHYS cans inside, carrying up to 3 cans and sipping one for 10 seconds of Mane Mode, the grill shine (stand still 3 seconds, or FLEX to daze everyone in front of you), the first punch knocking a mask off for Pothole to steal, O.G. Drive-Out's gold car at the end, the glowing pyramid puddle, and a results screen with a rank and local best score.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run assets     # regenerate all art + audio (needs ffmpeg)
```

Pushing to `main` (or a `claude/*` branch) builds and deploys to GitHub Pages via `.github/workflows/pages.yml`, once Pages is turned on in the repo settings with Source set to "GitHub Actions". The build is a plain static folder with relative paths, so it can also be dropped into any folder on memphyswater.com.

## How it's put together

```
src/
  main.ts                    game config: 216px tall, 384 to 480 wide, scales up crisp
  core/                      shared by every mission and mode
    assets.ts                loads every sprite sheet from public/assets/art/art.json
    controls.ts              one input model for keyboard + touch, with input buffering
    audio.ts, save.ts        music/SFX/mute, local best scores
    modes.ts                 the mission list and the play modes (brawler now; fight, driving, shooter, hub later)
  modes/brawler/             the reusable Turtles-in-Time engine
    BrawlerScene.ts          camera locks, waves, hit detection, hitstop, cars, pickups, speech bubbles, script helpers
    Mane.ts                  the player: movement, combo, jump kick, Sip/Mane Mode, flex, knockdowns
    Shiesty.ts               enemy AI (rushers and bottle throwers, two attack tokens at a time)
    Props.ts                 cars, pickups, trash cans, bottles
  missions/
    Mission1.ts              The Sip: level layout, the intro, waves, the ending
    lines.ts                 Mane's lines and enemy trash talk, in one place for review
  ui/UIScene.ts              HUD, touch controls, pause and continue screens
  scenes/                    Boot, Title, Results, credits
tools/
  art/                       first-pass pixel art, drawn in code to the story bible's specs
  audio/                     tiny synth that makes all the music and sound effects
```

Later missions plug in as new scenes: another brawler extends `BrawlerScene` and writes a script; the fight, driving and shooter modes get their own folders under `src/modes/`, and the open-world hub reuses the brawler's side-scrolling camera and art. Leaderboards, the Join the Keepers email save and promo codes have stub hooks in `core/modes.ts` and `core/save.ts`.

### Swapping in final art

Every sprite is a PNG in `public/assets/art/` with frames side by side, facing right, feet on the same baseline (the specs in the story bible). Replace a file with one of the same frame size and frame order and the game picks it up; frame ranges per animation are listed in `public/assets/art/art.json`. Music and sound effects swap the same way in `public/assets/audio/`.

See [CREDITS.md](CREDITS.md).
