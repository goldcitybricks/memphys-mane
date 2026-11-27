import Phaser from 'phaser';
import { DriveScene, MAX_SPEED } from '../modes/driving/DriveScene';
import { Track, THEMES, SEG_LEN } from '../modes/driving/Track';
import { Audio } from '../core/audio';
import { COLORS } from '../core/config';
import { Controls } from '../core/controls';
import { MANE, GIGAZ, CROWE } from './lines';

// The course, in segments (45 segments is one second at top speed)
const BRIDGE = 2400; // the deck starts here
const ARCH1 = [2700, 3600] as const; // the two spans of the M
const ARCH2 = [3600, 4500] as const;
const TANKER_AT = 2250; // you see the tanker
const ESCAPE = 4950; // the tanker reaches Arkansas and gets away
const TANKER_HP = 8;

// Mission 4: BRIDGE RUN. Mane takes Big Blue across the Hernando-DeSoto Bridge after an AetherCorp tanker
// hauling the city's aquifer water to Arkansas.
export class Mission4 extends DriveScene {
  private escortWave = 0;
  private finale = false;
  private croweMad = false;
  constructor() { super('Mission4'); }

  // ------------------------------------------------------------------ the course
  buildTrack() {
    this.missionId = 'm4-bridge-run';
    const t = new Track(false);
    // Downtown: along the river, past Beale and the Pyramid
    t.use(THEMES.city);
    t.straight(120);
    t.curve(140, 3);
    t.straight(100);
    t.curve(160, -4);
    t.curve(120, 2);
    t.straight(140);
    t.curve(180, -3);
    t.straight(120);
    t.curve(140, 5);
    t.straight(100);
    t.curve(160, -2);
    t.curve(120, 3);
    t.straight(200); // ~1900
    // the ramp up onto the bridge
    t.use(THEMES.ramp);
    t.curve(200, -2, 900);
    t.straight(300, 1500); // 2400
    // the bridge: long, gentle bends, the M arches over the river
    t.use(THEMES.bridge);
    t.straight(300);
    t.curve(300, 1.2);
    t.straight(300);
    t.curve(300, -1.5);
    t.straight(300);
    t.curve(300, 1);
    t.straight(400);
    // Arkansas side, then room to draw past the end
    t.straight(600, -1200);
    t.straight(400);
    t.arch(ARCH1[0], ARCH1[1], 5200);
    t.arch(ARCH2[0], ARCH2[1], 5200);

    // downtown props: towers, lamps, billboards, the Pyramid, signs
    const towers = ['towerA', 'towerB', 'towerC'];
    t.props(20, 1900, 28, (i, k) => [
      { tex: towers[k % 3], offset: -2.4 - (k % 3) * 0.5 },
      { tex: towers[(k + 1) % 3], offset: 2.6 + ((k + 2) % 3) * 0.5 },
    ]);
    t.props(10, BRIDGE, 16, () => [{ tex: 'bridgeLamp', offset: -1.32, scale: 1.4 }, { tex: 'bridgeLamp', offset: 1.32, scale: 1.4 }]);
    const boards = ['boardDenile', 'boardMemphys', 'boardAether'];
    t.props(180, 2300, 190, (i, k) => ({ tex: boards[k % 3], offset: k % 2 ? 1.6 : -1.6, scale: 1.6 }));
    t.prop(300, { tex: 'signBeale', offset: 1.5, scale: 1.6 });
    t.prop(1350, { tex: 'pyramid', offset: -3.2, scale: 3 });
    t.prop(1800, { tex: 'signWest', offset: 1.5, scale: 1.8 });
    t.prop(2380, { tex: 'signRiver', offset: 1.4, scale: 1.6 });
    t.prop(4700, { tex: 'signState', offset: 1.4, scale: 1.6 });
    t.props(BRIDGE, ESCAPE, 12, () => [{ tex: 'bridgeLamp', offset: -1.22, scale: 1.2 }, { tex: 'bridgeLamp', offset: 1.22, scale: 1.2 }]);
    t.props(2500, 2700, 100, (i, k) => ({ tex: k % 2 ? 'boardDenile' : 'boardAether', offset: k % 2 ? 1.5 : -1.5, scale: 1.6 }));
    this.escapeZ = ESCAPE * SEG_LEN;
    return t;
  }

  populate() {
    const S = SEG_LEN, L = this.lanes();
    const rnd = new Phaser.Math.RandomDataGenerator(['bridge-run']);
    // MEMPHYS cans: often in a little line so you can grab two or three
    const cans: [number, number][] = [[180, 1], [186, 1], [192, 1], [420, 0], [640, 2], [646, 2], [900, 1], [1120, 0], [1126, 0], [1400, 2], [1650, 1], [1656, 1], [1950, 0], [2150, 2], [2550, 1], [2900, 0], [3200, 2], [3480, 1], [3800, 0], [4150, 2], [4420, 1]];
    for (const [s, l] of cans) this.addPick(s * S, L[l], 'can');
    for (const s of [260, 760, 1180, 1580, 2020, 2520, 2850, 3150, 3450, 3750, 4050, 4350]) this.boxRow(s);
    // Memphis potholes
    for (let i = 0; i < 26; i++) this.addHaz(rnd.between(140, 2300) * S, L[rnd.between(0, 2)] + rnd.realInRange(-0.15, 0.15), 'pothole');
    for (let i = 0; i < 6; i++) this.addHaz(rnd.between(2500, 4600) * S, L[rnd.between(0, 2)], 'pothole');
    // drive-outs cruising, AetherCars driving themselves (and getting in your way)
    const sedans = ['altimaRear', 'altimaRearBlack', 'infinitiRear'];
    for (let i = 0; i < 16; i++) this.spawnCar('traffic', (240 + i * 120 + rnd.between(-30, 30)) * S, L[rnd.between(0, 2)], MAX_SPEED * rnd.realInRange(0.4, 0.55), sedans[i % 3]);
    for (let i = 0; i < 9; i++) this.spawnCar('aether', (420 + i * 190 + rnd.between(-20, 20)) * S, L[rnd.between(0, 2)], MAX_SPEED * rnd.realInRange(0.5, 0.62), 'aetherCar');
  }

  // ------------------------------------------------------------------ the script
  async runScript() {
    await this.intro();
    this.position = 0; this.playerX = 0; this.speed = 0;
    this.cans = 1;
    this.events.emit('hud');
    await this.countdown();
    this.racing = true;
    Audio.music(this, 'music_bridge', 0.42);
    this.say(this.maneSpeaker(), MANE.start, 1600);
    this.time.delayedCall(900, () => this.tip('start'));

    // chatter on the way downtown (none of it stops the race)
    await this.waitUntil(() => this.seg() > 380);
    this.say(this.malikSpeaker(), 'MANE, THEM WHITE CARS AIN\'T GOT NOBODY DRIVIN\'!', 2200);
    await this.waitUntil(() => this.seg() > 470);
    this.say(this.maneSpeaker(), 'THEN WHO DRIVIN\'?', 1500);
    await this.waitUntil(() => this.seg() > 900);
    if (!this.drifted()) { this.tip('driftHow'); this.say(this.malikSpeaker(), 'DRIFT THROUGH THE TURNS! UNCLE T DO IT ALL THE TIME!', 2200); }
    await this.waitUntil(() => this.seg() > 1340);
    this.say(this.malikSpeaker(), 'THE PYRAMID! BRIDGE IS RIGHT THERE!', 1800);

    // the tanker
    await this.waitUntil(() => this.seg() > TANKER_AT);
    this.startTanker(this.playerZ + SEG_LEN * 45, TANKER_HP);
    this.escorts(2, true);
    this.banner('THERE IT IS!', 'THE TANKER');
    this.time.delayedCall(2200, () => this.tip('tanker'));
    this.sfx('horn', 0.7);
    await this.wait(1500);
    this.say(this.tankerSpeaker(), GIGAZ.hello, 2600);
    await this.wait(2800);
    this.say(this.liveSpeaker(), `VICTOR CROWE (LIVE): ${CROWE.live}`, 3000);
    await this.wait(3200);
    this.say(this.maneSpeaker(), MANE.vsTanker, 1800);
    await this.waitUntil(() => this.finale);
  }

  // after the tanker gets away you pick up again on the bridge, a good way back
  continueZ() { return Math.max(BRIDGE * SEG_LEN, this.playerZ - SEG_LEN * 900); }

  private seg() { return this.playerZ / SEG_LEN; }
  private drifted() { return (this as any).tips?.has?.('drift'); }
  private liveSpeaker() { const w = this; return ((this as any).__live ??= { get x() { return w.W / 2; }, get headY() { return 74; } }); }

  // a couple of AetherCars to guard the tanker: some up front to block, some behind to ram
  private escorts(n: number, ahead: boolean) {
    const L = this.lanes();
    for (let i = 0; i < n; i++) {
      const z = ahead ? (this.tanker?.z ?? this.playerZ) - SEG_LEN * (8 + i * 10) : this.playerZ - SEG_LEN * (14 + i * 6);
      this.spawnCar('escort', z, L[(i + this.escortWave) % 3], MAX_SPEED * 0.72, 'aetherCar');
    }
    this.escortWave++;
  }

  onTankerRam(hp: number) {
    if (hp <= 0) return;
    const lines = [MANE.taunt, MANE.bigHit, 'OPEN UP, MANE!', MANE.bigHit];
    this.say(this.maneSpeaker(), lines[(TANKER_HP - hp) % lines.length], 1200);
    if (hp === TANKER_HP - 1) this.time.delayedCall(1300, () => this.say(this.tankerSpeaker(), GIGAZ.hit, 2200));
    if ((hp <= 5 && this.escortWave < 2) || (hp <= 2 && this.escortWave < 3)) this.time.delayedCall(800, () => { this.escorts(2, false); this.say(this.malikSpeaker(), 'MORE OF EM BEHIND US!', 1600); });
    if (hp <= 4 && !this.croweMad) { this.croweMad = true; this.time.delayedCall(2400, () => this.say(this.liveSpeaker(), `VICTOR CROWE (LIVE): ${CROWE.mad}`, 2600)); }
  }

  onTankerDown() {
    if (this.finale) return;
    this.finale = true;
    this.ending().catch((e) => console.error(e));
  }

  // ------------------------------------------------------------------ the countdown
  private async countdown() {
    this.idleEngine(true);
    for (const n of ['3', '2', '1']) {
      this.events.emit('count', n, 0xffffff);
      this.sfx('blip', 0.8);
      await new Promise<void>((r) => this.time.delayedCall(800, r));
    }
    this.events.emit('count', 'GO!', COLORS.goldHi);
    this.sfx('ding', 0.7);
    this.sfx('horn', 0.6);
    // drop button taps made during the count, but keep a thumb that's already steering
    for (const b of ['item', 'sip', 'drift', 'attack'] as const) Controls.consume(b);
  }

  // ------------------------------------------------------------------ intro: the tire shop, Big Blue, the phone book
  private async intro() {
    this.startCutscene();
    this.frozen = true;
    const W = this.W;
    const layer = this.add.container(0, 0).setDepth(7000);
    const sky = this.add.tileSprite(0, 0, W, 216, 'bgSky').setOrigin(0);
    const farL = this.add.tileSprite(0, 0, W, 216, 'bgFar').setOrigin(0).setTilePosition(300, 0);
    const street = this.add.rectangle(0, 150, W, 66, 0x24242e).setOrigin(0);
    const curb = this.add.rectangle(0, 150, W, 3, 0x6a6e80).setOrigin(0);
    const line = this.add.rectangle(0, 186, W, 2, 0xd8b830, 0.6).setOrigin(0);
    const shop = this.add.image(W / 2 + 70, 152, 'tireShop').setOrigin(0.5, 1);
    layer.add([sky, farL, street, curb, line, shop]);
    const carX = W / 2 - 70;
    const car = this.add.sprite(carX, 200, 'bigBlueSide', 0).setOrigin(0.5, 1);
    const uncle = this.add.sprite(carX + 130, 196, 'uncleT').setOrigin(0.5, 61 / 64).play('uncleT:idle').setFlipX(true);
    const malik = this.add.sprite(carX + 96, 198, 'malik').setOrigin(0.5, 61 / 64).play('malik:idle').setFlipX(true);
    const mane = this.add.sprite(-30, 196, 'mane').setOrigin(0.5, 61 / 64);
    layer.add([car, uncle, malik, mane]);
    const uS = this.speaker(uncle, 52), mS = this.speaker(malik, 50), meS = this.speaker(mane, 48);

    Audio.music(this, 'music_backdoor', 0.25);
    this.cameras.main.fadeIn(600, 0, 0, 0);
    await this.wait(700);
    this.banner('MISSION 4', 'BRIDGE RUN');
    await this.wait(2000);
    await this.caption('', 'RIGHT AFTER THE FIGHT. THE TIRE SHOP ON PARK AVE, ORANGE MOUND.', 2800);
    uncle.play('uncleT:talk');
    await this.line(uS, 'BIG BLUE GOT FOUR NEW TIRES ON HER. SHE\'LL RUN.', 2400);
    await this.line(uS, 'BRING HER BACK WITHOUT A SCRATCH, NEPHEW.', 2200);
    uncle.play('uncleT:idle');
    await this.line(mS, 'IT\'S MANE DRIVIN\'.', 1400);
    await this.line(uS, '...LORD.', 1200);

    // Mane walks up and hops in the driver's seat: only the top of his can shows in the window
    mane.play('mane:walk').setFlipX(false);
    await this.tween({ targets: mane, x: carX + 17, duration: 1200 });
    mane.play('mane:jump');
    this.sfx('jump', 0.6);
    layer.moveBelow(mane as any, car as any);
    mane.setCrop(0, 0, 64, 24); // only what shows through the window
    await this.tween({ targets: mane, y: 205, duration: 300, ease: 'Quad.easeOut' });
    mane.play('mane:idle');
    await this.line(meS, 'AYE, WHO MOVED THE ROAD?', 1800);
    malik.play('malik:scared');
    await this.line(mS, 'MANE. YOU CAN\'T SEE OVER THE WHEEL.', 2000);
    malik.play('malik:idle');
    await this.line(meS, MANE.trashTalkReply, 1600);

    // the phone book
    uncle.play('uncleT:toss');
    this.sfx('throw', 0.6);
    const book = this.add.image(uncle.x - 10, uncle.y - 40, 'phoneBook');
    layer.add(book);
    if (!this.skipping) {
      await new Promise<void>((r) => this.tweens.addCounter({
        from: 0, to: 1, duration: 650,
        onUpdate: (tw) => { const k = tw.getValue() ?? 0; book.setPosition(Phaser.Math.Linear(uncle.x - 10, mane.x, k), Phaser.Math.Linear(uncle.y - 40, 158, k) - Math.sin(k * Math.PI) * 40).setAngle(k * 540); },
        onComplete: () => r(),
      }));
    }
    book.destroy();
    this.sfx('tonk', 0.6);
    await this.tween({ targets: mane, y: 199, duration: 200, ease: 'Back.easeOut' });
    mane.setCrop(0, 0, 64, 30);
    mane.play('mane:shine');
    this.sfx('shine', 0.6);
    await this.line(meS, '...OH, THERE GO THE ROAD.', 1800);
    uncle.play('uncleT:talk');
    await this.line(uS, 'RESPECT THE PHONE BOOK.', 1800);
    uncle.play('uncleT:idle');
    await this.line(mS, 'NOW GO GET OUR WATER!', 1600);
    // Malik climbs in the other side, and they peel out
    malik.play('malik:walk');
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
    await this.line(uS, 'NOT A SCRATCH!', 1400);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(420, r));
    layer.destroy(true);
    this.frozen = false;
    this.endCutscene();
    this.startCutscene();
    this.cameras.main.fadeIn(500, 0, 0, 0);
    Audio.stopMusic();
    await this.caption('', 'DOWNTOWN. THE TANKER IS ALREADY HEADED FOR THE BRIDGE.', 2600);
    this.endCutscene();
  }

  // ------------------------------------------------------------------ the ending: the glyph, the ram, the water goes home
  private async ending() {
    this.startCutscene();
    const tk = this.tanker!;
    Audio.stopMusic();
    // everybody pulls up: Big Blue right behind the tanker
    await this.wait(500);
    this.frozen = true;
    this.cars = this.cars.filter((c) => Math.abs(c.z - this.playerZ) > SEG_LEN * 30);
    this.hazards = [];
    this.playerX = 0; tk.x = 0;
    tk.z = this.playerZ + SEG_LEN * 7;
    this.maneT = 0; this.boostT = 0; this.steer = 0; this.spinT = 0;
    this.addScore(2000);
    this.toast('TANKER STOPPED! +2000');

    // the bridge lights flash a glyph
    await this.wait(600);
    this.archLights = 'glyph';
    this.sfx('portal', 0.8);
    this.sfx('shine', 0.7);
    const glyph = this.add.image(this.W / 2, 64, 'glyph').setDepth(6000).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0).setScale(1.5);
    this.tweens.add({ targets: glyph, alpha: 0.9, duration: 700 });
    this.tweens.add({ targets: glyph, scale: 1.7, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    await this.line(this.malikSpeaker(), 'MANE... THE BRIDGE IS TALKIN\'!', 2200);
    await this.line(this.maneSpeaker(), 'NAH. THAT\'S THE WATER. IT REMEMBERS.', 2400);
    await this.line(this.tankerSpeaker(), GIGAZ.hello, 2200);
    await this.line(this.maneSpeaker(), 'NAH. I GOT IT.', 1400);

    // shades on, one big ram
    this.maneT = 99;
    this.freezeFrame(240, COLORS.goldHi);
    this.sfx('sip', 0.8);
    this.sfx('maneMode', 0.8);
    await this.line(this.maneSpeaker(), MANE.super, 1500);
    this.tweens.add({ targets: glyph, alpha: 0, duration: 300 });
    const car = this.car;
    const y0 = car.y;
    this.boostT = 99; this.boostColor = COLORS.gold;
    this.sfx('boost', 0.8);
    await this.tween({ targets: car, y: y0 - 34, scale: 0.78, duration: 420, ease: 'Quad.easeIn' });
    this.freezeFrame(300, 0xffffff);
    this.shake(700, 0.02);
    this.sfx('punchHeavy', 1); this.sfx('crash', 0.9); this.sfx('geyser', 0.9);
    tk.hp = 0; tk.maxHp = TANKER_HP; tk.hitT = 0.6;
    this.boostT = 0;
    await this.tween({ targets: car, y: y0, scale: 1, duration: 450, ease: 'Quad.easeOut' });
    this.maneT = 0;
    // the water shoots up into the sky, then rains back down glowing
    await this.geyser();
    this.rain();
    glyph.destroy();
    await this.wait(800);
    await this.line(this.tankerSpeaker(), GIGAZ.down, 2200);
    await this.line(this.tankerSpeaker(), GIGAZ.threat, 2400);
    await this.line(this.maneSpeaker(), MANE.twist, 1200);
    await this.line(this.malikSpeaker(), 'IT\'S RAININ\' OUR WATER BACK!', 2000);
    await this.line(this.maneSpeaker(), 'BACK IN THE RIVER. BACK IN THE GROUND. WHERE IT BELONG.', 2600);
    await this.caption('NIA', '(FROM EVERY DROP ON THE WINDSHIELD) THE WATER REMEMBERS YOU, KEEPER.', 3000);
    await this.caption('', 'A SHIPPING TAG FLUTTERS DOWN: "DELIVER TO DENILE WATER PLANT. PRESIDENTS ISLAND."', 3200);
    await this.line(this.maneSpeaker(), 'PRESIDENTS ISLAND. THAT\'S WHERE THEY BOTTLIN\' IT.', 2400);
    await this.line(this.malikSpeaker(), 'SO WE GOIN\'?', 1400);
    await this.line(this.maneSpeaker(), 'FUH YOU MEAN, MANE? WE ALREADY GONE.', 2200);
    Audio.music(this, 'music_victory', 0.6, false);
    this.maneT = 99;
    this.sfx('shine', 0.7);
    await this.line(this.maneSpeaker(), MANE.victory, 2400);
    await this.caption('', 'NEXT: THE PLANT.', 2200);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(650, r));
    this.scene.start('Results', { stats: this.stats(), missionId: this.missionId });
  }

  private geyser() {
    const tk = this.tanker!;
    const g = this.add.graphics().setDepth(4000);
    const drops: { x: number; y: number; vy: number; vx: number; c: number }[] = [];
    const top = () => (tk.seen ? tk.sy + 10 : 90);
    let t = 0;
    return new Promise<void>((resolve) => {
      const ev = this.time.addEvent({
        loop: true, delay: 16, callback: () => {
          t += 16;
          g.clear();
          const x = tk.seen ? tk.sx : this.W / 2;
          const h = Math.min(1, t / 400);
          const fade = t > 2200 ? Math.max(0, 1 - (t - 2200) / 500) : 1;
          const w = 14 + Math.sin(t / 40) * 3;
          g.fillStyle(0x7fd8ff, 0.85 * fade).fillRect(x - w / 2, top() - 300 * h, w, 300 * h);
          g.fillStyle(0xffffff, 0.9 * fade).fillRect(x - w / 5, top() - 300 * h, w / 2.5, 300 * h);
          if (fade > 0 && t < 2400) for (let i = 0; i < 4; i++) drops.push({ x: x + (Math.random() - 0.5) * w, y: top() - Math.random() * 200 * h, vy: -3 - Math.random() * 3, vx: (Math.random() - 0.5) * 3, c: Math.random() < 0.3 ? COLORS.goldHi : 0xbfefff });
          for (const d of drops) { d.x += d.vx; d.y += d.vy; d.vy += 0.15; g.fillStyle(d.c, 0.9).fillRect(d.x, d.y, 2, 3); }
          if (t > 2800) { ev.remove(); g.destroy(); resolve(); }
        },
      });
      if (this.skipping) { ev.remove(); g.destroy(); resolve(); }
    });
  }

  // glowing rain over the whole bridge for the rest of the scene
  private rain() {
    const g = this.add.graphics().setDepth(4500);
    const drops = Array.from({ length: 90 }, () => ({ x: Math.random() * this.W, y: Math.random() * 216 - 216, v: 2 + Math.random() * 2.5, c: Math.random() < 0.35 ? COLORS.goldHi : 0x9fe8ff }));
    this.time.addEvent({
      loop: true, delay: 16, callback: () => {
        if (!g.active) return;
        g.clear();
        for (const d of drops) {
          d.y += d.v; d.x -= d.v * 0.2;
          if (d.y > 216) { d.y = -6; d.x = Math.random() * (this.W + 40); }
          g.fillStyle(d.c, 0.85).fillRect(d.x, d.y, 1, 4);
        }
      },
    });
  }
}
