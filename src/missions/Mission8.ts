import Phaser from 'phaser';
import { DriveScene, MAX_SPEED, Car } from '../modes/driving/DriveScene';
import { Track, Prop, Theme, SEG_LEN } from '../modes/driving/Track';
import { Audio } from '../core/audio';
import { COLORS } from '../core/config';
import { Controls } from '../core/controls';
import { MANE, GIGAZ_LOOP, OG_LOOP, AQUIFER_FACT_8 } from './lines';

// I-240 at night: concrete barriers, a dark shoulder, white edge lines
const INTERSTATE: Theme = { ground: [0x0e171c, 0x111c22], rumble: [0xd8d8e0, 0x8e94a6], road: [0x2e2e38, 0x32323c], lane: 0xe0e0e0, wall: 0x8a8e9a, wallTop: 0xb4b8c4, wallH: 140 };

// the course, in segments (45 segments is one second at top speed). One lap is about a minute.
const LAPS = 3;
const START_GANTRY = 10;
const GANTRIES = [230, 560, 770, 1100, 1310, 1620, 1950];
const BARRICADE = 2140; // the Gigantum exit, on the last lap
const CARD_SEG = 1345;
// how fast the city forgets, per second, on each lap
const DRAIN = [0, 0.35, 0.42, 0.46];

interface Gantry { seg: number; prop: Prop; gold: number; done: boolean }
type SignProp = Prop & { forget: true };

// Mission 8: THE LOOP. GigaZ turns every light in Memphis blue and the city starts forgetting. Mane takes Big Blue
// three times around I-240, driving under the gold lights to keep Memphis remembering, until O.G.'s convoy shows up
// and the wedge breaks open the last exit to The Gigantum.
export class Mission8 extends DriveScene {
  private gantries: Gantry[] = [];
  private startGantry!: Prop;
  private signs: SignProp[] = [];
  private barricade: Prop = { tex: 'barricade', offset: 0, scale: 4, frame: 0 };
  private memory = 100;
  private golds = 0;
  private blues = 0;
  private lastSeg = 0;
  private finale = false;
  private convoy: Car[] = [];
  private og?: Car;
  private wedge = false;
  private nextRow = 0;
  private swarm: Car[] = [];
  private escortT = 0;
  private barkT = 6;
  private warned = false;
  private cardTaken = false;
  private tint?: Phaser.GameObjects.Rectangle;
  private dogWin?: Phaser.GameObjects.Sprite;
  constructor() { super('Mission8'); }

  create() {
    this.gantries = []; this.signs = []; this.memory = 100; this.golds = 0; this.blues = 0; this.lastSeg = 0; this.finale = false;
    this.convoy = []; this.og = undefined; this.wedge = false; this.nextRow = 0; this.swarm = []; this.escortT = 0; this.barkT = 6; this.warned = false; this.cardTaken = false;
    this.barricade = { tex: 'barricade', offset: 0, scale: 4, frame: 0 };
    this.skyKey = 'loopSky'; this.farKey = 'loopFar';
    this.continueTitle = 'MEMPHIS FORGOT!';
    this.lapsTotal = LAPS;
    super.create();
    // the city forgetting tints everything a little more GigaZ blue
    this.tint = this.add.rectangle(0, 0, 600, 216, 0x2a7ad8, 0).setOrigin(0).setDepth(4985).setBlendMode(Phaser.BlendModes.ADD);
    // Pothole with his head out the back window, ears flapping the whole race
    this.dogWin = this.add.sprite(0, 0, 'potholeWindow').setOrigin(0.5, 1).setDepth(4991).play('potholeWindow:flap').setVisible(false);
  }

  // ------------------------------------------------------------------ the course
  buildTrack() {
    this.missionId = 'm8-the-loop';
    const t = new Track(true);
    t.use(INTERSTATE);
    t.straight(140);            // 0: the start, under the first light
    t.curve(180, 3, 400);       // 140
    t.straight(160);            // 320
    t.curve(200, -2.5, -400);   // 480
    t.straight(120);            // 680
    t.curve(160, 4);            // 800: the sharp one
    t.straight(200, 500);       // 960
    t.curve(220, -3);           // 1160
    t.straight(140, -500);      // 1380
    t.curve(180, 2);            // 1520
    t.straight(160);            // 1700
    t.curve(200, -3.5);         // 1860
    t.straight(160);            // 2060 -> 2220, back to the start

    // lamps down the median, overpasses, the signs that forget, billboards
    t.props(4, t.count, 14, () => ({ tex: 'hwyLamp', offset: -1.3, scale: 1.4 }));
    for (const s of [300, 900, 1450, 2000]) t.prop(s, { tex: 'overpass', offset: 0, scale: 4 });
    const sign = (seg: number, tex: string, offset = 1.5, scale = 1.6) => { const p: SignProp = { tex, offset, scale, frame: 0, forget: true }; t.prop(seg, p); this.signs.push(p); };
    sign(120, 'exitAirways'); sign(640, 'exitLamar'); sign(1050, 'exitGetwell'); sign(1580, 'exitPoplar'); sign(1890, 'exitWalnut');
    sign(450, 'bbqBoard', 1.9, 1.6); sign(1720, 'bbqBoard', -2.0, 1.6);
    t.prop(60, { tex: 'shield240', offset: 1.4, scale: 1.6 });
    t.prop(1240, { tex: 'shield240', offset: 1.4, scale: 1.6 });
    t.prop(1000, { tex: 'boardRemembers', offset: -2.0, scale: 1.6 });
    t.prop(780, { tex: 'boardAether', offset: 2.0, scale: 1.6 });
    t.prop(1500, { tex: 'boardDenile', offset: 2.0, scale: 1.6 });
    t.prop(2070, { tex: 'signGigantum', offset: 1.5, scale: 1.8 });
    // the signal gantries: one gold lane (the water remembering), the rest stuck on GigaZ blue
    this.startGantry = { tex: 'gantry', offset: 0, scale: 4, frame: 4 };
    t.prop(START_GANTRY, this.startGantry);
    for (const s of GANTRIES) {
      const p: Prop = { tex: 'gantry', offset: 0, scale: 4, frame: 1 };
      t.prop(s, p);
      this.gantries.push({ seg: s, prop: p, gold: 1, done: false });
    }
    return t;
  }

  populate() {
    const S = SEG_LEN, L = this.lanes();
    const rnd = new Phaser.Math.RandomDataGenerator(['the-loop']);
    const cans: [number, number][] = [[200, 1], [206, 1], [520, 0], [880, 2], [886, 2], [1180, 0], [1420, 2], [1660, 1], [1666, 1], [2010, 0]];
    for (const [s, l] of cans) this.addPick(s * S, L[l], 'can');
    for (const s of [380, 990, 1530, 2100]) this.boxRow(s);
    this.addPick(CARD_SEG * S, -0.9, 'card');
    for (let i = 0; i < 22; i++) this.addHaz(rnd.between(160, 2100) * S, L[rnd.between(0, 2)] + rnd.realInRange(-0.15, 0.15), 'pothole');
    const sedans = ['altimaRear', 'altimaRearBlack', 'infinitiRear'];
    for (let i = 0; i < 12; i++) this.spawnCar('traffic', (260 + i * 160 + rnd.between(-30, 30)) * S, L[rnd.between(0, 2)], MAX_SPEED * rnd.realInRange(0.42, 0.56), sedans[i % 3]);
    for (let i = 0; i < 8; i++) this.spawnCar('aether', (420 + i * 210 + rnd.between(-20, 20)) * S, L[rnd.between(0, 2)], MAX_SPEED * rnd.realInRange(0.5, 0.62), 'aetherCar');
    this.meter = { label: 'MEMPHIS MEMORY', value: 100, max: 100, color: COLORS.gold, icon: 'glyph', scale: 0.45 };
    this.shuffleGantries(1);
  }

  // a new gold lane on every gantry each lap
  private shuffleGantries(lap: number) {
    this.gantries.forEach((g, i) => { g.gold = (i * 2 + lap * 5 + (i % 3) * lap) % 3; g.done = false; g.prop.frame = g.gold; });
  }

  // ------------------------------------------------------------------ the script
  async runScript() {
    await this.intro();
    this.position = 0; this.playerX = 0; this.speed = 0;
    this.cans = 1;
    this.events.emit('hud');
    this.dogWin?.setVisible(true);
    await this.countdown();
    this.racing = true;
    this.lastSeg = this.segIdx();
    Audio.music(this, 'music_loop', 0.42);
    this.say(this.maneSpeaker(), MANE.start, 1600);
    this.time.delayedCall(900, () => this.tip('startLoop'));
    await this.waitUntil(() => this.seg() > 120);
    this.tip('gantry');
    this.say(this.malikSpeaker(), 'FOLLOW THE GOLD LIGHT, MANE! THAT\'S THE WATER TALKIN\'!', 2400);
    await this.waitUntil(() => this.seg() > 330);
    this.say(this.gigazSpeaker(), `GIGAZ: ${GIGAZ_LOOP.hello}`, 3400);
    await this.waitUntil(() => this.seg() > 440 && this.lap === 1);
    this.say(this.malikSpeaker(), 'NAH! THE RIB SPOT SIGN SAY "SMOKED PROTEIN"!', 2200);
    await this.wait(2300);
    this.say(this.maneSpeaker(), 'MANE, THAT\'S DISRESPECTFUL.', 1800);
    await this.waitUntil(() => this.seg() > 990 && this.lap === 1);
    this.say(this.malikSpeaker(), 'THE MEMPHYS BOARD AIN\'T FORGOT A THING.', 2200);
    await this.wait(2300);
    this.say(this.maneSpeaker(), 'THE WATER REMEMBERS, MANE.', 1800);
    this.time.delayedCall(2200, () => this.tip('memory'));
    await this.waitUntil(() => this.finale);
  }

  private seg() { return (this.playerZ % this.track.length) / SEG_LEN; }
  private segIdx() { return Math.floor(this.seg()); }
  private gigazSpeaker() { const w = this; return ((this as any).__gz ??= { get x() { return w.W / 2; }, get headY() { return 74; } }); }

  // ------------------------------------------------------------------ every frame
  update(t: number, deltaMs: number) {
    super.update(t, deltaMs);
    if (this.paused) return;
    const dt = Math.min(deltaMs, 50) / 1000;
    // Pothole rides along by the back window
    if (this.dogWin && this.dogWin.visible) {
      const c = this.car;
      this.dogWin.setPosition(c.x + 33 + (this.steer > 0.3 ? 2 : this.steer < -0.3 ? -2 : 0), c.y - 26).setAngle(c.angle);
    }
    if (!this.racing || this.frozen || this.continuing || this.finale) return;
    // the city forgets a little every second
    this.setMemory(this.memory - DRAIN[Math.min(this.lap, LAPS)] * dt);
    this.checkGantries();
    this.updateConvoy();
    // Pothole barks at the robots now and then
    this.barkT -= dt;
    if (this.barkT <= 0) { this.barkT = 9 + Math.random() * 8; this.sfx('bark', 0.5); this.say(this.dogSpeaker(), 'WOOF!', 700); }
    // from lap 2, AetherCars come up from behind to ram (and download a little of you)
    if (this.lap >= 2 && !this.wedge) {
      this.escortT -= dt;
      if (this.escortT <= 0) { this.escortT = 14 + Math.random() * 6; this.escorts(); }
    }
    // the last exit
    if (this.lap >= LAPS && this.seg() >= BARRICADE - 7 && this.seg() < BARRICADE + 30) this.onExit();
  }

  private setMemory(v: number) {
    this.memory = Phaser.Math.Clamp(v, 0, 100);
    if (this.meter) this.meter.value = this.memory;
    // the signs lose their words as the city forgets
    const f = this.memory > 60 ? 0 : this.memory > 30 ? 1 : 2;
    for (const s of this.signs) s.frame = f;
    this.tint?.setFillStyle(0x2a7ad8, (1 - this.memory / 100) * 0.2);
    if (this.memory < 25 && !this.warned) {
      this.warned = true;
      this.toast('MEMPHIS IS FORGETTING!');
      this.say(this.malikSpeaker(), 'MANE, I CAN\'T REMEMBER WHAT STREET UNC STAY ON! HIT THE GOLD!', 2600);
    }
    if (this.memory > 40) this.warned = false;
    if (this.memory <= 0 && !this.continuing) this.showContinue();
  }
  private addMemory(n: number) { this.setMemory(this.memory + n); }

  private checkGantries() {
    const cur = this.segIdx(), prev = this.lastSeg;
    this.lastSeg = cur;
    // (a bump can push you back a segment; only a big drop means you wrapped past the start line)
    if (cur <= prev && prev - cur < this.track.count / 2) return;
    const crossed = (g: number) => (cur > prev ? prev < g && g <= cur : g > prev || g <= cur);
    for (const g of this.gantries) {
      if (g.done || !crossed(g.seg)) continue;
      g.done = true;
      const lane = this.playerX < -1 / 3 ? 0 : this.playerX > 1 / 3 ? 2 : 1;
      if (lane === g.gold || this.maneT > 0) {
        g.prop.frame = 3;
        this.golds++;
        this.addMemory(6);
        this.addScore(300);
        this.sfx('remember', 0.7);
        this.boost(0.5, COLORS.gold);
        this.toast(this.maneT > 0 && lane !== g.gold ? 'MANE MODE: ALL GOLD! +300' : 'REMEMBERED! +300');
        this.cameras.main.flash(160, 255, 220, 120);
      } else {
        g.prop.frame = 4;
        this.blues++;
        this.addMemory(-6);
        this.speed *= 0.86;
        this.sfx('forget', 0.7);
        this.sfx('glitch', 0.35);
        this.cameras.main.flash(220, 58, 168, 255);
        this.shake(140, 0.005);
        this.toast('FORGETTING... -6%');
        if (this.blues === 1) {
          this.say(this.maneSpeaker(), 'WAIT... WHERE WAS I GOIN\'?', 1600);
          this.time.delayedCall(1700, () => this.say(this.malikSpeaker(), 'THE GIGANTUM, MANE! STAY ON THE GOLD!', 1800));
        } else if (Math.random() < 0.5) this.say(this.gigazSpeaker(), `GIGAZ: ${Phaser.Utils.Array.GetRandom(GIGAZ_LOOP.blue)}`, 1600);
      }
    }
  }

  // ------------------------------------------------------------------ laps
  onLap(lap: number) {
    if (lap > LAPS) return;
    this.shuffleGantries(lap);
    this.startGantry.frame = 3;
    this.banner(lap === LAPS ? 'FINAL LAP' : `LAP ${lap}`, `MEMPHIS: ${Math.ceil(this.memory)}%`);
    this.sfx('ding', 0.7);
    if (lap === 2) this.lap2().catch((e) => console.error(e));
    if (lap === 3) this.lap3().catch((e) => console.error(e));
  }

  private async lap2() {
    this.escortT = 4;
    await this.wait(1800);
    this.say(this.gigazSpeaker(), `GIGAZ: ${GIGAZ_LOOP.lap2}`, 3400);
    await this.wait(3600);
    this.say(this.maneSpeaker(), 'CIRCLES? I BEEN SPINNIN\' BLOCKS MY WHOLE LIFE.', 2200);
    await this.waitUntil(() => this.seg() > 640 && this.lap === 2);
    this.say(this.malikSpeaker(), 'MANE, EVERY EXIT SIGN BLANK! HOW WE GETTIN\' OFF?', 2400);
    await this.wait(2500);
    this.say(this.gigazSpeaker(), `GIGAZ: ${GIGAZ_LOOP.exits}`, 3000);
    await this.wait(3100);
    this.say(this.maneSpeaker(), 'THEN WE MAKE OUR OWN.', 1800);
  }

  // the convoy: O.G. and his drive-out crew pull up and wedge up in front of Big Blue
  private async lap3() {
    this.escortT = 99;
    // the barricade is up across the last exit
    this.track.segs[BARRICADE].props.push(this.barricade);
    await this.wait(1400);
    this.say(this.gigazSpeaker(), `GIGAZ: ${GIGAZ_LOOP.lap3}`, 2400);
    await this.wait(2200);
    this.sfx('horn', 0.8);
    await this.wait(300);
    this.sfx('horn', 0.7);
    // they come up from behind: O.G. in the gold car, two crew Nissans
    const L = this.playerZ;
    this.og = this.spawnCar('ally', L - SEG_LEN * 22, -0.6, this.speed, 'ogRear');
    this.og.lead = SEG_LEN * 0.4; this.og.slot = -0.62;
    const c1 = this.spawnCar('ally', L - SEG_LEN * 26, 0.6, this.speed, 'altimaRearBlack');
    c1.lead = -SEG_LEN * 2.5; c1.slot = 0.62;
    const c2 = this.spawnCar('ally', L - SEG_LEN * 30, -0.6, this.speed, 'altimaRear');
    c2.lead = -SEG_LEN * 3.5; c2.slot = -0.62;
    this.convoy = [this.og, c1, c2];
    Audio.music(this, 'music_convoy', 0.45);
    this.banner('THE CONVOY', 'O.G. DRIVE-OUT');
    this.say(this.malikSpeaker(), 'MANE! BEHIND US!', 1400);
    await this.wait(1600);
    this.say(this.carSpeaker(this.og), `O.G.: ${OG_LOOP.hello}`, 2200);
    await this.wait(2300);
    this.say(this.maneSpeaker(), 'O.G.!', 1000);
    await this.wait(1100);
    this.say(this.carSpeaker(this.og), `O.G.: ${OG_LOOP.why}`, 3600);
    await this.wait(3700);
    // the swarm is coming: wedge up
    this.say(this.gigazSpeaker(), `GIGAZ: ${GIGAZ_LOOP.convoy}`, 2600);
    await this.wait(2600);
    this.say(this.carSpeaker(this.og), `O.G.: ${OG_LOOP.network}`, 2000);
    await this.wait(2100);
    this.say(this.carSpeaker(this.og), `O.G.: ${OG_LOOP.wedge}`, 1800);
    this.sfx('horn', 0.8);
    this.og.lead = SEG_LEN * 6; this.og.slot = 0;
    c1.lead = SEG_LEN * 3.6; c1.slot = 0.44;
    c2.lead = SEG_LEN * 3.6; c2.slot = -0.44;
    this.wedge = true;
    this.nextRow = Math.max(this.segIdx() + 40, 300);
    this.banner('WEDGE UP!', 'STEER THE WEDGE');
    this.tip('convoy');
    await this.waitUntil(() => this.seg() > 1400 && this.lap === LAPS);
    this.say(this.malikSpeaker(), 'THERE IT IS! THE GIGANTUM EXIT!', 1800);
    await this.waitUntil(() => this.seg() > 2010 && this.lap === LAPS);
    this.say(this.gigazSpeaker(), `GIGAZ: ${GIGAZ_LOOP.barricade}`, 2200);
    await this.wait(1800);
    this.say(this.carSpeaker(this.og), `O.G.: ${OG_LOOP.exit}`, 2000);
  }

  private updateConvoy() {
    if (!this.wedge) return;
    // the swarm: rows of AetherCars across all three lanes, coming up ahead
    const s = this.segIdx();
    if (this.lap === LAPS && s >= this.nextRow && s < 1900) {
      this.nextRow = s + 55;
      const z = this.playerZ + SEG_LEN * 75;
      for (const x of this.lanes()) this.swarm.push(this.spawnCar('aether', z + Phaser.Math.Between(-40, 40), x, MAX_SPEED * 0.38, 'aetherCar'));
      if (this.swarm.length === 3) this.time.delayedCall(800, () => this.say(this.malikSpeaker(), 'THE WHOLE SWARM, MANE!', 1600));
    }
    // swarm cars you've left behind go away
    for (const c of this.swarm) if (c.z < this.playerZ - SEG_LEN * 90) c.gone = true;
    this.swarm = this.swarm.filter((c) => !c.gone);
    this.cars = this.cars.filter((c) => !c.gone);
  }

  onAllyPlow(ally: Car, hit: Car) {
    // once the wedge spins a robot car out, it stops chasing you and limps along the shoulder
    hit.kind = 'traffic';
    hit.base = MAX_SPEED * 0.3;
    const side = hit.x >= ally.x ? 1 : -1;
    hit.tx = side * 0.9; hit.x = Phaser.Math.Clamp(hit.x + side * 0.35, -0.85, 0.85);
    if (ally.talkCd <= 0 && Math.random() < 0.35) { ally.talkCd = 3; this.say(this.carSpeaker(ally), ally === this.og ? `O.G.: ${Phaser.Utils.Array.GetRandom(OG_LOOP.plow)}` : Phaser.Utils.Array.GetRandom(OG_LOOP.plow), 1200); }
  }

  // an AetherCar that hits you downloads a little of the city
  // (only a real hit: one that rams you, not you tapping a slow one, and not one the wedge already spun)
  private bumpCd = 0;
  onBump(c: Car) {
    if (c.spinT > 0 || this.time.now < this.bumpCd) return;
    if (c.kind === 'escort' || (c.kind === 'aether' && c.z < this.playerZ)) {
      this.bumpCd = this.time.now + 1500;
      this.addMemory(-3);
      this.toast('DOWNLOADING... -3%');
    }
  }

  // ramming AetherCars come up from behind
  private escorts() {
    const L = this.lanes();
    for (let i = 0; i < 2; i++) this.spawnCar('escort', this.playerZ - SEG_LEN * (16 + i * 7), L[(i * 2 + this.lap) % 3], MAX_SPEED * 0.72, 'aetherCar');
    this.say(this.malikSpeaker(), 'ROBOT CARS COMIN\' UP BEHIND US!', 1600);
  }

  // a sip brings some of the city back too
  sip() {
    const ok = this.cans > 0 && this.maneT <= 0;
    super.sip();
    if (ok) { this.addMemory(10); this.time.delayedCall(700, () => this.toast('THE WATER REMEMBERS! +10%')); }
  }

  onPickCard() {
    if (this.cardTaken) return;
    this.cardTaken = true;
    this.addScore(1000);
    this.sfx('shine', 0.8);
    this.events.emit('fact', 'AQUIFER FACT CARD', AQUIFER_FACT_8);
    this.say(this.malikSpeaker(), 'A FACT CARD! UNC USED TO KEEP THESE IN A BOOK AT THE PIT.', 2600);
  }

  // when the city forgets you pick up right where you are, with some of Memphis back
  continueZ() { return this.playerZ; }
  doContinue() {
    super.doContinue();
    this.setMemory(45);
    this.cars = this.cars.filter((c) => c.kind !== 'escort');
  }

  stats() { return { ...super.stats(), drivers: this.golds }; }

  // ------------------------------------------------------------------ the countdown under the first light
  private async countdown() {
    this.idleEngine(true);
    this.startGantry.frame = 4;
    for (const n of ['3', '2', '1']) {
      this.events.emit('count', n, 0x7fd8ff);
      this.sfx('blip', 0.8);
      await new Promise<void>((r) => this.time.delayedCall(800, r));
    }
    this.startGantry.frame = 3;
    this.events.emit('count', 'GO!', COLORS.goldHi);
    this.sfx('remember', 0.7);
    this.sfx('horn', 0.6);
    for (const b of ['item', 'sip', 'drift', 'attack'] as const) Controls.consume(b);
  }

  // ------------------------------------------------------------------ intro: Uncle T's Pit forgets its name
  private async intro() {
    this.startCutscene();
    this.frozen = true;
    const W = this.W;
    const layer = this.add.container(0, 0).setDepth(7000);
    const sky = this.add.tileSprite(0, 0, W, 216, 'bgSky').setOrigin(0);
    const farL = this.add.tileSprite(0, 0, W, 216, 'bgFar').setOrigin(0).setTilePosition(120, 0);
    const blueNight = this.add.rectangle(0, 0, W, 216, 0x2a7ad8, 0.08).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    const street = this.add.rectangle(0, 150, W, 66, 0x24242e).setOrigin(0);
    const curb = this.add.rectangle(0, 150, W, 3, 0x6a6e80).setOrigin(0);
    const line = this.add.rectangle(0, 186, W, 2, 0xd8b830, 0.6).setOrigin(0);
    // the same strip-mall Pit as Mission 1 (pitFront is drawn by the same code); pitX is Uncle T's door
    const pitX = W / 2 + 58;
    const pitLeft = pitX - 187, pitTop = 150 - 146;
    const pit = this.add.image(pitLeft, pitTop, 'pitFront').setOrigin(0);
    const sign = this.add.sprite(pitLeft + 110, pitTop + 58, 'pitSign', 0).setOrigin(0);
    const light = this.add.sprite(pitX - 162, 152, 'cornerLight', 0).setOrigin(0.5, 1);
    const street1 = this.add.sprite(pitX - 134, 152, 'streetSign', 0).setOrigin(0.5, 1);
    layer.add([sky, farL, blueNight, street, curb, line, pit, sign, light, street1]);
    const carX = W / 2 - 92;
    const car = this.add.sprite(carX, 200, 'bigBlueSide', 0).setOrigin(0.5, 1);
    const uncle = this.add.sprite(pitX, 196, 'uncleTLost').setOrigin(0.5, 61 / 64).play('uncleTLost:idle').setFlipX(true);
    const malik = this.add.sprite(carX + 86, 198, 'malik').setOrigin(0.5, 61 / 64).play('malik:idle');
    const mane = this.add.sprite(carX + 58, 196, 'mane').setOrigin(0.5, 61 / 64).play('mane:idle');
    const dog = this.add.sprite(W + 30, 200, 'dog').setOrigin(0.5, 1).play('dog:run').setFlipX(true);
    layer.add([car, uncle, malik, mane, dog]);
    const uS = this.speaker(uncle, 52), mS = this.speaker(malik, 50), meS = this.speaker(mane, 48);

    Audio.music(this, 'music_lost', 0.25);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    await this.wait(700);
    this.banner('MISSION 8', 'THE LOOP');
    await this.wait(2000);
    await this.caption('', 'MIDNIGHT. PARK & AIRWAYS, ORANGE MOUND. EVERY TRAFFIC LIGHT IN MEMPHIS IS THE SAME BLUE.', 3200);
    // the Pit's own sign forgets its name
    this.sfx('glitch', 0.6);
    sign.setFrame(1);
    await this.wait(700);
    this.sfx('glitch', 0.6);
    sign.setFrame(2);
    malik.setFlipX(true).play('malik:scared');
    await this.line(mS, 'UNC\'S SIGN... IT FORGOT HIS NAME.', 2200);
    malik.play('malik:idle');
    // Uncle T comes out and looks at his own car
    uncle.play('uncleTLost:walk');
    await this.tween({ targets: uncle, x: pitX - 18, duration: 500 });
    uncle.play('uncleTLost:talk');
    await this.line(uS, '...NICE CAR. WHOEVER OWN THAT GOT TASTE.', 2400);
    uncle.play('uncleTLost:idle');
    await this.line(mS, 'UNC. THAT\'S BIG BLUE. THAT\'S YOUR CAR.', 2200);
    uncle.play('uncleTLost:blank');
    await this.line(uS, '...IS IT?', 1400);
    await this.wait(500);
    uncle.play('uncleTLost:talk');
    await this.line(uS, 'WELL... BRING HER BACK WITHOUT A SCRATCH.', 2400);
    uncle.play('uncleTLost:idle');
    malik.setFlipX(false);
    await this.line(mS, '...HE STILL IN THERE, MANE.', 1800);
    // the street sign goes too
    this.sfx('glitch', 0.6);
    street1.setFrame(1);
    await this.wait(500);
    street1.setFrame(2);
    await this.line(meS, 'STREET SIGNS TOO. THE WHOLE CITY GOIN\' BLANK.', 2400);
    // fact 1 (CAESER, MLGW): the myth is the science
    await this.line(mS, 'THE WATER UNDER US FELL AS RAIN OVER 2,000 YEARS AGO AND AIN\'T FORGOT A DROP.', 3200);
    await this.line(mS, 'MEMPHIS AIN\'T \'BOUT TO FORGET IN ONE NIGHT.', 2200);
    mane.play('mane:shine');
    this.sfx('shine', 0.7);
    await this.line(meS, 'NOT ON MY WATCH.', 1600);
    mane.play('mane:idle');
    await this.line(mS, 'THE GIGANTUM IS OFF THE LAST EXIT. I-240, ALL THE WAY AROUND.', 2600);
    // Pothole isn't missing this
    this.sfx('bark', 0.7);
    await this.tween({ targets: dog, x: carX + 30, duration: 900 });
    dog.play('dog:bark');
    await this.line(this.speaker(dog, 18), 'WOOF!', 700);
    this.sfx('jump', 0.5);
    await this.tween({ targets: dog, y: 172, x: carX + 10, duration: 260, ease: 'Quad.easeOut' });
    dog.setVisible(false);
    await this.line(meS, 'POTHOLE RIDIN\' TOO?', 1400);
    await this.line(mS, 'POTHOLE DON\'T MISS A RIDE.', 1600);
    // Mane hops in on his phone book, Malik climbs in, and they go
    mane.play('mane:walk').setFlipX(true);
    await this.tween({ targets: mane, x: carX + 17, duration: 700 });
    mane.play('mane:jump');
    this.sfx('jump', 0.6);
    layer.moveBelow(mane as any, car as any);
    mane.setCrop(0, 0, 64, 30);
    await this.tween({ targets: mane, y: 199, duration: 260, ease: 'Quad.easeOut' });
    mane.play('mane:idle').setFlipX(false);
    await this.line(meS, 'PHONE BOOK. CHECK.', 1400);
    malik.play('malik:walk').setFlipX(true);
    await this.tween({ targets: malik, x: carX + 40, duration: 500 });
    malik.setVisible(false);
    this.sfx('horn', 0.7);
    this.idleEngine(true);
    await this.wait(400);
    car.play('bigBlueSide:roll');
    this.sfx('skid', 0.5);
    this.sfx('carBy', 0.7);
    if (!this.skipping) await Promise.all([
      this.tween({ targets: car, x: W + 120, duration: 1100, ease: 'Quad.easeIn' }),
      this.tween({ targets: mane, x: W + 120 + 17, duration: 1100, ease: 'Quad.easeIn' }),
    ]);
    uncle.play('uncleTLost:talk');
    await this.line(uS, 'NOT A SCRATCH!', 1400);
    uncle.play('uncleTLost:blank');
    await this.line(uS, '...WHO WAS THAT?', 1600);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(420, r));
    layer.destroy(true);
    this.frozen = false;
    this.endCutscene();
    this.startCutscene();
    this.cameras.main.fadeIn(500, 0, 0, 0);
    Audio.stopMusic();
    await this.caption('', 'I-240, THE LOOP AROUND MEMPHIS. THREE LAPS TO THE LAST EXIT. KEEP THE CITY REMEMBERING.', 3000);
    this.endCutscene();
  }

  // ------------------------------------------------------------------ the exit: the wedge breaks the barricade
  private onExit() {
    if (this.finale) return;
    this.finale = true;
    this.ending().catch((e) => console.error(e));
  }

  private async ending() {
    // the wedge hits it first
    this.barricade.frame = 1;
    this.sfx('crash', 0.9); this.sfx('punchHeavy', 0.8); this.sfx('glitch', 0.6);
    this.freezeFrame(220, 0x7fd8ff);
    this.shake(500, 0.016);
    this.say(this.carSpeaker(this.og ?? this.cars[0]), 'O.G.: RIDE OUT!', 1400);
    this.addScore(2000 + Math.round(this.memory) * 20);
    this.toast(`EXIT OPEN! +${2000 + Math.round(this.memory) * 20}`);
    await this.wait(1300);
    this.startCutscene();
    Audio.stopMusic();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(420, r));
    this.frozen = true;
    this.dogWin?.setVisible(false);

    // the top of the exit ramp, The Gigantum ahead
    const W = this.W;
    const layer = this.add.container(0, 0).setDepth(7000);
    const bg = this.add.image(W / 2, 0, 'gigantumExt').setOrigin(0.5, 0);
    const ramp = this.add.tileSprite(0, 176, W, 40, 'rampStrip').setOrigin(0);
    const sign = this.add.sprite(34, 178, 'exitPoplar', 2).setOrigin(0.5, 1).setScale(0.8);
    layer.add([bg, ramp, sign]);
    const blue = this.add.rectangle(0, 0, W, 216, 0x2a7ad8, 0.12).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    layer.add(blue);
    const carX = W / 2 - 60;
    const car = this.add.sprite(carX, 212, 'bigBlueSide', 0).setOrigin(0.5, 1);
    const gold = this.add.sprite(carX + 150, 212, 'carGold', 0).setOrigin(0.5, 1).setScale(0.9);
    const crew = this.add.sprite(carX - 150, 212, 'carAltimaBlack', 0).setOrigin(0.5, 1).setScale(0.9);
    const mane = this.add.sprite(carX + 30, 206, 'mane').setOrigin(0.5, 61 / 64).play('mane:idle');
    const malik = this.add.sprite(carX + 56, 208, 'malik').setOrigin(0.5, 61 / 64).play('malik:idle');
    const og = this.add.sprite(carX + 110, 206, 'og').setOrigin(0.5, 61 / 64).play('og:idle').setFlipX(true);
    const dog = this.add.sprite(carX + 4, 210, 'dog').setOrigin(0.5, 1).play('dog:idle');
    layer.add([crew, car, gold, dog, mane, malik, og]);
    const meS = this.speaker(mane, 48), mS = this.speaker(malik, 50), oS = this.speaker(og, 52);
    const gz = { x: W / 2, y: 92 };
    const gS = this.speaker(gz, 0);
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.sfx('drone', 0.4);
    Audio.music(this, 'music_lost', 0.3);
    await this.wait(700);
    await this.caption('', 'THE LAST EXIT. THE GIGANTUM, HUMMING, WITH A CLOUD PARKED ON TOP.', 2800);
    og.play('og:tip');
    await this.line(oS, 'THIS AS FAR AS THE NISSANS GO, CAN.', 2200);
    og.play('og:idle');
    this.sfx('glitch', 0.6);
    await this.line(gS, `GIGAZ: ${GIGAZ_LOOP.left}`, 2800);
    await this.line(meS, 'WE AIN\'T NO ONE. WE MEMPHIS.', 2000);
    // behind them, the Loop starts remembering
    this.sfx('remember', 0.8);
    this.tweens.add({ targets: blue, alpha: 0, duration: 1200 });
    await this.caption('', 'BEHIND THEM, ALL THE WAY AROUND THE LOOP, THE LIGHTS GO GOLD.', 2600);
    sign.setFrame(1);
    this.sfx('glitch', 0.4);
    await this.wait(400);
    sign.setFrame(0);
    this.sfx('shine', 0.6);
    malik.setFlipX(true);
    await this.line(mS, 'MANE, LOOK. THE SIGNS... THEY COMIN\' BACK.', 2400);
    malik.setFlipX(false);
    await this.line(meS, 'CUZ WE AIN\'T FORGET.', 1600);
    await this.line(mS, 'UNC\'S MEMORY IN THERE SOMEWHERE.', 2000);
    await this.line(meS, 'THEN WE GOIN\' IN. WE GETTIN\' UNC. WE GETTIN\' ALL OF IT BACK.', 2800);
    dog.play('dog:bark');
    this.sfx('bark', 0.7);
    await this.line(this.speaker(dog, 18), 'WOOF!', 700);
    dog.play('dog:idle');
    Audio.music(this, 'music_victory', 0.6, false);
    mane.play('mane:victory');
    this.sfx('shine', 0.7);
    await this.line(meS, MANE.complete, 2400);
    await this.caption('', 'NEXT: THE GIGANTUM.', 2200);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(650, r));
    layer.destroy(true);
    this.scene.start('Results', { stats: this.stats(), missionId: this.missionId });
  }

  private dogSpeaker() { const w = this; return ((this as any).__dog ??= { get x() { return w.dogWin?.x ?? w.W / 2; }, get headY() { return (w.dogWin?.y ?? 180) - 20; } }); }
}
