# The Legend of MEMPHYS Mane

A retro 90s beat-'em-up (Turtles in Time feel) set in Memphis, TN, starring MEMPHYS Mane. A free promo game for MEMPHYS Water, built to run in a phone browser and embed on memphyswater.com.

Playable now: **Mission 1, "The Sip"**, in the alley behind Uncle T's Pit at Park & Airways, Orange Mound, at night, **Mission 2, "Old Memphis"**, in Memphis, Egypt, 3,000 years ago, **Mission 3, "Fight Night"**, a 1-on-1 boxing match against Pip at Mid-South Coliseum, and **Mission 4, "Bridge Run"**, a Mario Kart style chase across the Hernando-DeSoto Bridge in Big Blue.

## Play

- **Phone:** turn it sideways. Left thumb anywhere on the left half is the stick. HIT, JUMP, SIP, FLEX on the right. Tap to advance dialogue, SKIP to jump past the intro.
- **Keyboard:** arrows/WASD move, Z or J punch, X/K/Space jump, C or L sip, V or I flex, Esc or P pause.
- **Fight Night (Mission 3), phone:** BLOCK (hold) and DODGE on the left; JAB, HOOK, FLEX and SUPER on the right. Tap anywhere to get up when you're down.
- **Fight Night, keyboard:** Z/J/→ jab, X/K hook, hold C/L/↓ block, Space/Shift/← dodge, V/I flex (grill shine), B/U/↑ super.
- **Bridge Run (Mission 4), phone:** Big Blue drives herself. Left thumb steers. ITEM, DRIFT (hold) and SIP on the right. Hold DRIFT with no turn to brake.
- **Bridge Run, keyboard:** left/right or A/D steer, Z/J/Space item, hold X/K/Shift/↓ to drift (or brake), C/L/↑ sip, Esc or P pause.
- Add `?play` to the URL to skip the title screen, or `?play=2`, `?play=3` or `?play=4` to jump straight into that mission. Beating Mission 1 unlocks a mission picker on the title screen, and the results screen has NEXT.

What's in Mission 1: the intro (Malik, the Shiesty Boys, Uncle T's toss, the one-frame flash of Old Memphis, Mane bursting out of the can), four fight waves, a three-hit combo and flying kick, potholes that trip you, drive-out cars to jump or dodge (they flatten Shiesty Boys too), breakable trash cans with ribs, wings and MEMPHYS cans inside, carrying up to 3 cans and sipping one for 10 seconds of Mane Mode, the grill shine (stand still 3 seconds, or FLEX to daze everyone in front of you), the first punch knocking a mask off for Pothole to steal, O.G. Drive-Out's gold car at the end, the glowing pyramid puddle, and a results screen with a rank and local best score.

What's in Mission 2: Mane flies out of a reflecting pool into ancient Memphis and Nia rises from the water ("Welcome back, Keeper."), jackal-masked guards with spears, blades and thrown clay pots, mud holes, clay jars with bread, dates and MEMPHYS cans, war chariots charging through the lanes, the date seller who gets offered Mane's gold grill as payment, Nia's memory of the day the young king (face in shadow) had Mane sealed in the golden jar, the Jackal Captain boss (telegraphed charge, a howl that calls guards, a fake surrender: "Quit flaugin'."), Nia's "You ain't a king. You a keeper.", and the pull-back where the Nile lines up with the Mississippi and the old pyramid with the Memphis Pyramid.

What's in Mission 3: Fight Night at Mid-South Coliseum, sponsored by DeNile Water. O.G. Drive-Out on the mic with everything he owns bet on Pip, Pip's "I'm single-use, baby." entrance, Malik volunteering Mane, "Pip, you lookin' ahh plastic." Three rounds against Pip: jab, hook, the jab-jab-hook one-two, hold to block, dodge for a counter window, the grill shine to daze him, and a shades-on super. Pip has readable tells: a quick jab, the gold-glowing single-use haymaker, the cap shot, the red-glowing bottle flip you can only dodge (miss it and he's stuck upside down on his cap), and the crinkle he ducks under punches with. Three clean hits in a row and he covers up and fires back. Pothole carries the round cards, Malik hands Mane a MEMPHYS in the corner, and before round 3 O.G. refills Pip with DeNile. The KO freezes into the poster shot with flashbulbs popping, the ref counts "...8, 9, RECYCLED!" and drops Pip in a recycling bin, and O.G. pays up and tells Mane about the AetherCorp tankers crossing the bridge (Mission 4).

What's in Mission 4: the tire shop on Park Ave, where Uncle T hands over Big Blue with new tires, Mane can't see over the wheel and Uncle T tosses him a phone book ("Respect the phone book."). Then a pseudo-3D chase seen from behind Big Blue, Malik riding shotgun: downtown past the towers, Beale and the Pyramid, up the ramp and across the bridge under its two lit arches. Auto-gas, analog steering, a Mario Kart style drift with blue and gold sparks and a boost when you let go, Uncle T's to-go boxes with items (sweet tea boost, a sauce slick you throw ahead, wing bones you drop behind), MEMPHYS cans to sip for Mane Mode (faster, bash through cars and barrels), Memphis potholes, drive-out Altimas and Infinitis, and self-driving AetherCars that pull in front of you and say "recalculating" when you spin them. The AetherCorp tanker has GigaZ on its back screen, rolls coolant barrels at you and calls escorts that ram from behind; Victor Crowe livestreams the chase. Ram it until it breaks (if it reaches Arkansas it gets away: sip to continue). The bridge lights flash a glyph, Mane goes shades-on for one last ram, the water shoots into the sky and rains back down glowing, Nia speaks from the drops, and a shipping tag points to the DeNile plant on Presidents Island (Mission 5).

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
    modes.ts                 the mission list and the play modes (brawler, fight and driving now; shooter and hub later)
  modes/brawler/             the reusable Turtles-in-Time engine
    BrawlerScene.ts          camera locks, waves, hit detection, hitstop, cars, pickups, speech bubbles, script helpers
    Mane.ts                  the player: movement, combo, jump kick, Sip/Mane Mode, flex, knockdowns
    Shiesty.ts               enemy AI (rushers and throwers, two attack tokens at a time); each mission skins it
    JackalCaptain.ts         Mission 2 boss
    Props.ts                 cars, pickups, trash cans, bottles
  modes/fight/               the reusable 1-on-1 fight engine (Mortal Kombat / Fight Night style, side view)
    FightScene.ts            rounds, the clock, hit resolution (block, dodge, counters), knockdowns and the ref's count, the super, cutscene helpers
    Fighter.ts               a fighter: state machine plus a data-driven move list (windup tells, damage, chip, armor, unblockable)
    BoxerMane.ts             Mane's moves and controls
    Pip.ts                   Mission 3 opponent: move list, per-round styles, the AI
    FightUI.ts               fight HUD, touch buttons, the count, pause and continue
  modes/driving/             the reusable racing engine (Mario Kart / arcade racer style, pseudo-3D from behind the car)
    Track.ts                 the course: segments with curves, hills, themes (city, ramp, bridge), arch spans and roadside props; point-to-point or laps
    DriveScene.ts            projection and drawing, the car (auto-gas, steering, drift boosts, Mane Mode), traffic and AetherCar AI, items, hazards, the boss vehicle, continues, script helpers, a live engine sound
    DriveUI.ts               driving HUD (cans, item slot, speed, TN-to-AR progress, the tanker's health), steering stick and buttons, pause and continue
  missions/
    Mission1.ts              The Sip: level layout, the intro, waves, the ending
    Mission2.ts              Old Memphis: the market, the grill gag, Nia's memory, the Jackal Captain, the pull-back
    Mission3.ts              Fight Night: the entrance, the corners, the round cards, the KO photo, "recycled!", O.G.'s tip
    Mission4.ts              Bridge Run: the tire shop and the phone book, the course and who's on it, the tanker chase, the glyph and the geyser
    lines.ts                 Mane's lines and enemy trash talk, in one place for review
  ui/UIScene.ts              HUD, touch controls, pause and continue screens
  scenes/                    Boot, Title, Results, credits
tools/
  art/                       first-pass pixel art, drawn in code to the story bible's specs
  audio/                     tiny synth that makes all the music and sound effects
```

Later missions plug in as new scenes: another brawler extends `BrawlerScene` and writes a script; another 1-on-1 boss (Crowe Prime in Mission 7, Victor's phase 1 in Mission 10) extends `FightScene` with a new `Fighter` subclass and move list; Mission 8 (The Loop) extends `DriveScene` with a looping `Track` (`new Track(true)`) and its own script; the shooter mode gets its own folder under `src/modes/`, and the open-world hub reuses the brawler's side-scrolling camera and art. Leaderboards, the Join the Keepers email save and promo codes have stub hooks in `core/modes.ts` and `core/save.ts`.

### Swapping in final art

Every sprite is a PNG in `public/assets/art/` with frames side by side, facing right, feet on the same baseline (the specs in the story bible). Replace a file with one of the same frame size and frame order and the game picks it up; frame ranges per animation are listed in `public/assets/art/art.json`. Music and sound effects swap the same way in `public/assets/audio/`.

See [CREDITS.md](CREDITS.md).
