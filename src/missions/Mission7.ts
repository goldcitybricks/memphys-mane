import Phaser from 'phaser';
import { FightScene, CountPlan, RoundEnd, Speaker } from '../modes/fight/FightScene';
import { Fighter, Move, Outcome, FLOOR_Y } from '../modes/fight/Fighter';
import { CrowePrime, CroweStyle } from '../modes/fight/CrowePrime';
import { Audio } from '../core/audio';
import { COLORS } from '../core/config';
import { px } from '../core/text';
import { MANE, CROWE_PRIME, VICTOR, GIGAZ, CHAT, CHAT_USERS, CHAT_FANS, AQUIFER_FACT_7 } from './lines';

// How Crowe Prime fights each round. Round 2 turns on the rocket boots (the chat voted); in the encore
// GigaZ takes the wheel: faster, it reads you sooner, and it adds the download beam.
const ROUNDS: CroweStyle[] = [
  { gap: [0.95, 1.7], weights: { jab: 5, jab2: 3, stick: 2, ping: 2, taunt: 1 }, guard: 0.3, predict: 0.5, speed: 1, power: 1, daze: 1.2 },
  { gap: [0.85, 1.5], weights: { jab: 4, jab2: 3, stick: 2, ping: 2, rocket: 2, taunt: 1 }, guard: 0.3, predict: 0.7, speed: 1.06, power: 1.05, daze: 1.0 },
  { gap: [0.65, 1.25], weights: { jab: 3, jab2: 3, stick: 2, ping: 2, rocket: 3, download: 2, taunt: 1 }, guard: 0.35, predict: 0.85, speed: 1.15, power: 1.15, daze: 0.8 },
];
const ROUND_SECONDS = 75;

// The LED screen over the stage (in riverStage.png, relative to the image's center line)
const SCR = { x: -122, y: 44, w: 244, h: 50 };
const CHAT_LINES = 4;
const CHAT_CHARS = 28;

// Mission 7: CROWE LIVE. Tom Lee Park on the riverfront, the launch concert for The Gigantum.
// MEMPHYS Mane vs Crowe Prime, Victor Crowe's robot body double, while Victor streams from his yacht
// and the chat reacts to every hit. At the knockout the face peels off: GigaZ is underneath.
export class Mission7 extends FightScene {
  private crowe!: CrowePrime;
  private stageImg!: Phaser.GameObjects.Image;
  private spots: Phaser.GameObjects.Image[] = [];
  private stream!: Phaser.GameObjects.Container;
  private cam!: Phaser.GameObjects.Sprite;
  private gzScreen!: Phaser.GameObjects.Sprite;
  private liveBadge!: Phaser.GameObjects.Rectangle;
  private liveText!: Phaser.GameObjects.BitmapText;
  private titleText!: Phaser.GameObjects.BitmapText;
  private viewText!: Phaser.GameObjects.BitmapText;
  private offline!: Phaser.GameObjects.BitmapText;
  private chatRows: Phaser.GameObjects.Container[] = [];
  private chatQueue: [string, string, boolean][] = [];
  private chatAt = 0;
  private viewers = 84200;
  private camTimer?: Phaser.Time.TimerEvent;
  private shines = 0;
  private factFound = false;
  private chatter?: Phaser.Time.TimerEvent;

  constructor() { super('Mission7'); }

  buildArena() {
    this.missionId = 'm7-crowe-live';
    this.foePortrait = 'crowePortrait';
    this.toastY = 98; // under the LED screen, so callouts don't land on the stream
    this.extraTips = {
      touch: {
        predict: 'IT LEARNS! THROW THE SAME PUNCH 3 TIMES\nAND IT READS YOU. MIX JAB, HOOK AND THE 1-2.',
        rocket: 'RED GLOW = YOU CAN\'T BLOCK IT.\nDODGE THE ROCKET DASH!',
        download: 'BLOCK OR DODGE THE BEAM.\nIT DOWNLOADS YOUR SUPER METER.',
      },
    };
    this.chatRows = []; this.chatQueue = []; this.chatAt = 0; this.viewers = 84200; this.shines = 0; this.factFound = false; this.spots = [];
    this.stageImg = this.add.image(this.midX, 0, 'riverStage').setOrigin(0.5, 0).setDepth(-100);
    for (const [dx, tint] of [[-90, 0x7fe8ff], [90, 0xff9ad8]] as [number, number][]) {
      this.spots.push(this.add.image(this.midX + dx, 0, 'spotlight').setOrigin(0.5, 0).setScale(1.2, 1).setDepth(20).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.45).setTint(tint));
    }
    this.buildStream();
  }

  makeFoe(): Fighter {
    this.crowe = new CrowePrime(this, this.homes().foe);
    this.crowe.onPredict = () => { this.tip('predict'); this.toast('PREDICTED! MIX IT UP!'); this.chat('predict'); };
    this.crowe.onCrash = () => this.chat('crash');
    return this.crowe;
  }

  onResize() {
    super.onResize();
    this.stageImg?.setX(this.midX);
    this.stream?.setX(this.midX);
    this.spots.forEach((s, i) => s.setX(this.midX + (i ? 90 : -90)));
  }

  foeCount(kd: number): CountPlan {
    // rounds 1 and 2 it reboots, gets up and the round goes on; in the encore it goes offline
    if (this.round < 3) return { getUpAt: kd <= 1 ? 5 : 7 };
    return { getUpAt: null, lastWord: 'OFFLINE!' };
  }

  roundName(n: number) { return n === 3 ? 'ENCORE' : `ROUND ${n}`; }

  onWindup(f: Fighter, m: Move) {
    super.onWindup(f, m);
    if (f === this.crowe && m.id === 'rocket') this.tip('rocket');
    if (f === this.crowe && m.id === 'download') this.tip('download');
    if (f === this.player && m.id === 'oneTwo') this.tip('oneTwo');
  }

  // every exchange shows up in the chat, and Victor reacts on his cam
  resolve(att: Fighter, m: Move): Outcome {
    const def = this.other(att);
    const out = super.resolve(att, m);
    const mane = att === this.player;
    if (out === 'hit') {
      this.viewers += mane ? 900 : 400;
      if (def.hp <= 0) { this.chat('down', true); this.victor(mane ? 'shocked' : 'talk', 2200); }
      else if (mane) { this.chat(m.id === 'super' ? 'superHit' : 'maneHit'); if (m.heavy) this.victor('mad'); }
      else { if (Math.random() < 0.5) this.chat('croweHit'); else this.chat('maneHurt'); this.victor('talk'); }
    } else if (out === 'dodged') this.chat('dodge');
    return out;
  }

  onShineHit() {
    this.shines++;
    this.chat('shine', true);
    // the hidden one: blind it three times and the screen reboots on an Aquifer Fact
    if (this.shines >= 3 && !this.factFound) this.findFact();
  }

  // ------------------------------------------------------------------ the livestream on the LED screen
  private buildStream() {
    const c = this.add.container(this.midX, 0).setDepth(-50);
    const L = SCR.x + 3, T = SCR.y + 2;
    this.liveBadge = this.add.rectangle(L + 3, T + 4, 5, 5, 0xd43a3a);
    this.liveText = px(this, L + 8, T, 'LIVE', 0xff7a7a);
    this.titleText = px(this, L + 38, T, 'CROWE LIVE', 0x9ad8ff);
    this.viewText = px(this, SCR.x + SCR.w - 62, T, '', 0xc8d0e8).setOrigin(1, 0);
    this.cam = this.add.sprite(SCR.x + SCR.w - 59, SCR.y + 3, 'croweCam', 0).setOrigin(0);
    this.gzScreen = this.add.sprite(SCR.x + SCR.w - 49, SCR.y + 9, 'gigazScreen', 0).setOrigin(0).setVisible(false);
    this.offline = px(this, 0, SCR.y + SCR.h / 2 - 4, 'STREAM OFFLINE', 0x9aa0c0).setOrigin(0.5, 0).setVisible(false);
    c.add([this.liveBadge, this.liveText, this.titleText, this.viewText, this.cam, this.gzScreen, this.offline]);
    this.stream = c;
    this.updateViewers();
  }

  private updateViewers() {
    const v = this.viewers;
    this.viewText?.setText(v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1000).toFixed(1)}K`);
  }

  // one message in the chat, from a random neighborhood handle (or one of Crowe's fans)
  chat(kind: keyof typeof CHAT, now = false) {
    const fan = kind === 'croweHit';
    const user = Phaser.Utils.Array.GetRandom(fan ? CHAT_FANS : CHAT_USERS);
    this.post(user, Phaser.Utils.Array.GetRandom(CHAT[kind]), fan, now);
  }
  post(user: string, text: string, fan = false, now = false) {
    if (now) this.chatQueue = [];
    if (this.chatQueue.length > 2) this.chatQueue.shift();
    this.chatQueue.push([user, text, fan]);
    if (now) this.chatAt = 0;
  }
  private showChat(user: string, text: string, fan: boolean) {
    const L = SCR.x + 3;
    const room = CHAT_CHARS - user.length - 2;
    const msg = text.length > room ? text.slice(0, room) : text;
    const name = px(this, 0, 0, user + ':', fan ? 0x7fc4ff : COLORS.gold);
    const body = px(this, (user.length + 1) * 6 + 4, 0, msg, 0xffffff);
    const row = this.add.container(L, 0, [name, body]);
    this.stream.add(row);
    this.chatRows.push(row);
    while (this.chatRows.length > CHAT_LINES) this.chatRows.shift()!.destroy();
    this.chatRows.forEach((r, i) => r.setY(SCR.y + 13 + (CHAT_LINES - this.chatRows.length + i) * 9));
    this.viewers += Phaser.Math.Between(40, 260);
    this.updateViewers();
  }
  private clearChat() { this.chatRows.forEach((r) => r.destroy()); this.chatRows = []; this.chatQueue = []; }

  // Victor's face on his yacht cam: 0 smug, 1 talking, 2 mad, 3 shocked
  private victor(mood: 'smug' | 'talk' | 'mad' | 'shocked', ms = 1400) {
    if (!this.cam?.visible) return;
    this.cam.setFrame({ smug: 0, talk: 1, mad: 2, shocked: 3 }[mood]);
    this.camTimer?.remove();
    if (mood !== 'smug') this.camTimer = this.time.delayedCall(ms, () => this.cam.setFrame(0));
  }
  // Victor talks over the stream: his mouth moves on the cam while the caption is up
  private async vSay(text: string, ms = 2600, mood: 'talk' | 'mad' | 'shocked' = 'talk') {
    const flap = this.time.addEvent({ loop: true, delay: 160, callback: () => { if (this.cam.visible) this.cam.setFrame(Number(this.cam.frame.name) === 0 ? { talk: 1, mad: 2, shocked: 3 }[mood] : 0); } });
    await this.caption('VICTOR CROWE (LIVE FROM HIS YACHT)', text, ms);
    flap.remove();
    this.cam.setFrame(mood === 'talk' ? 0 : { mad: 2, shocked: 3 }[mood]);
  }

  // GigaZ takes over the stream
  private gigazStream() {
    this.cam.setVisible(false);
    this.gzScreen.setVisible(true).setFrame(1);
    this.liveBadge.setFillStyle(0x2a7ad8);
    this.titleText.setText('GIGAZ LIVE');
    this.viewers = Math.max(this.viewers, 1900000);
    this.updateViewers();
  }

  update(t: number, dms: number) {
    super.update(t, dms);
    if (this.paused) return;
    if (this.chatQueue.length && this.time.now > this.chatAt) {
      const [u, s, f] = this.chatQueue.shift()!;
      this.showChat(u, s, f);
      this.chatAt = this.time.now + 420;
    }
  }

  // ------------------------------------------------------------------ helpers
  private extra(tex: string, x: number, y: number, flip = false) {
    return this.add.sprite(x, y, tex).setOrigin(0.5, 61 / 64).setScale(2).setDepth(y > FLOOR_Y + 4 ? 25 : 8).setFlipX(flip).play(`${tex}:idle`);
  }
  private walk(s: Phaser.GameObjects.Sprite, x: number, ms?: number) {
    const tex = s.texture.key;
    s.setFlipX(x < s.x);
    s.play(`${tex}:walk`, true);
    return this.tween({ targets: s, x, duration: ms ?? Math.max(200, Math.abs(x - s.x) * 9) }).then(() => s.play(`${tex}:idle`, true));
  }
  private walkF(f: Fighter, x: number, ms?: number) {
    f.setState('scripted');
    f.play('walk', true);
    f.facing = x < f.x ? -1 : 1;
    return this.tween({ targets: f, x, duration: ms ?? Math.max(200, Math.abs(x - f.x) * 9) }).then(() => f.play('idle', true));
  }
  private startChatter() {
    this.chatter?.remove();
    this.chatter = this.time.addEvent({ loop: true, delay: 1500, callback: () => { if (this.inCutscene && Math.random() < 0.7) this.chat('idle'); } });
  }

  // ------------------------------------------------------------------ the script
  async runScript() {
    await this.intro();
    Audio.music(this, 'music_crowe', 0.45);
    this.tip('start');
    this.crowe.setStyle(ROUNDS[0]);
    let how: RoundEnd = await this.fightRound(1, ROUND_SECONDS);
    await this.corner(1, how);
    this.crowe.setStyle(ROUNDS[1]);
    how = await this.fightRound(2, ROUND_SECONDS);
    await this.corner(2, how);
    this.crowe.setStyle(ROUNDS[2]);
    // the encore has no clock: it ends when Crowe Prime goes offline
    while ((how = await this.fightRound(3, null)) !== 'ko') { /* it can't reboot in the encore */ }
    await this.ending();
  }

  // ------------------------------------------------------------------ intro: the launch concert
  private async intro() {
    this.startCutscene();
    this.startChatter();
    const p = this.player, c = this.crowe;
    const h = this.homes();
    p.setState('scripted'); p.x = -80;
    c.setState('scripted'); c.z = 320; c.sprite.setVisible(false);
    Audio.stopMusic();
    // establishing shot: Tom Lee Park from over the crowd, the drone show making GigaZ in the sky
    const ext = this.add.image(this.midX, 0, 'riverfrontExt').setOrigin(0.5, 0).setDepth(5000);
    this.tweens.add({ targets: ext, scale: 1.05, y: -6, duration: 3200 });
    this.cameras.main.fadeIn(700, 0, 0, 0);
    this.sfx('crowd', 0.5);
    await this.wait(1200);
    if (!this.skipping) this.events.emit('banner', { top: 'MISSION 7', bottom: 'CROWE LIVE' });
    await this.wait(1900);
    await this.caption('', 'THE NEXT NIGHT. TOM LEE PARK, ON THE RIVERFRONT.', 2600);
    await this.caption('', 'AETHERCORP IS THROWING A FREE CONCERT TO SWITCH ON THE GIGANTUM. HALF THE CITY SHOWED UP.', 3400);
    await this.tween({ targets: ext, alpha: 0, duration: 450 });
    ext.destroy();

    // Victor on the big screen, from his yacht
    Audio.music(this, 'music_crowe', 0.22);
    this.sfx('notify', 0.6);
    await this.vSay(VICTOR.hello, 3000);
    await this.vSay(VICTOR.brag, 4200);
    this.post('LAMARAVE', 'THAT\'S OUR WATER');
    this.post('FRAYSERFRESH', 'FREE WATER??');
    await this.vSay(VICTOR.host, 2600);

    // Crowe Prime comes down on rocket boots
    c.sprite.setVisible(true);
    c.frame('rocket', 0);
    this.sfx('rocket', 0.8);
    await this.tween({ targets: c, z: 0, duration: 900, ease: 'Quad.easeOut' });
    c.z = 0;
    this.sfx('land', 0.9);
    this.shake(200, 0.008);
    this.sfx('crowd', 0.6);
    c.play('taunt', true);
    await this.line(c, CROWE_PRIME.hello, 3000);
    this.post('901NATIVE', 'HE TALKIN TO US??');
    c.play('idle', true);

    // Malik brought Uncle T. Maybe something here jogs his memory.
    const malik = this.extra('malik', -20, FLOOR_Y + 26);
    const uncle = this.extra('uncleTLost', -50, FLOOR_Y + 26);
    const mS = this.speaker(malik, 90), uS = this.speaker(uncle, 96);
    const mx = Math.max(56, this.midX - 130);
    await Promise.all([this.walk(malik, mx, 700), this.walk(uncle, mx - 34, 900)]);
    malik.setFlipX(false); uncle.setFlipX(false).play('uncleTLost:blank');
    await this.line(mS, 'UNC, LOOK. THAT\'S THE MAN WHO TOOK YOUR... THAT\'S HIM.', 2600);
    await this.line(uS, '...NICE NIGHT FOR A CONCERT.', 2400);
    await this.wait(400);
    await this.line(mS, 'MANE. NOW.', 1000);

    // Mane storms the stage
    p.facing = 1;
    p.play('idle');
    if (!this.skipping) {
      this.sfx('jump', 0.7);
      await new Promise<void>((r) => {
        this.tweens.addCounter({
          from: 0, to: 1, duration: 650, onUpdate: (tw) => { const k = tw.getValue() ?? 0; p.x = -60 + (h.mane + 60) * k; p.z = Math.sin(k * Math.PI) * 90; p.sprite.setAngle(k * 360); },
          onComplete: () => { p.z = 0; p.sprite.setAngle(0); r(); },
        });
      });
      this.sfx('land', 0.8);
      this.shake(120, 0.005);
    }
    p.x = h.mane; p.z = 0; p.sprite.setAngle(0);
    p.play('taunt', true);
    this.sfx('crowd', 0.8);
    this.chat('idle', true);
    await this.line(p, MANE.start, 1800);
    p.play('idle');
    this.victor('shocked');
    await this.vSay(VICTOR.mane, 2800);
    p.play('taunt', true);
    await this.line(p, MANE.vsCrowe, 2400);
    this.sfx('ooh', 0.7);
    this.post('ORANGEMOUND4L', 'HE SAID IT TO HIS FACE');
    p.play('idle');
    await this.line(c, CROWE_PRIME.scan, 2600);
    await this.line(p, MANE.trashTalkReply, 1600);
    await this.line(c, GIGAZ.hello, 2400);
    await this.line(p, 'NAH. REMEMBER THIS.', 1600);

    malik.destroy(); uncle.destroy();
    c.sprite.setVisible(true); c.z = 0; c.x = h.foe; c.facing = -1;
    p.x = h.mane; p.facing = 1; p.sprite.setAngle(0);
    this.endCutscene();
  }

  // ------------------------------------------------------------------ between rounds
  private async corner(n: number, how: RoundEnd) {
    await this.settle();
    this.startCutscene();
    const p = this.player, c = this.crowe;
    if (c.hp < c.maxHp) c.hp = Math.min(c.maxHp, c.hp + 15);
    await Promise.all([this.walkF(p, this.midX - 110), this.walkF(c, this.midX + 110)]);
    p.facing = 1; c.facing = -1;

    // Pothole carries the card across the stage
    await this.roundCard(n + 1);

    // Malik with a cold one
    const malik = this.extra('malik', Math.max(18, this.midX - 176), FLOOR_Y + 26);
    const mS = this.speaker(malik, 90);
    malik.play('malik:sip');
    p.play('sip', true);
    this.sfx('sip', 0.8);
    p.hp = Math.min(p.maxHp, p.hp + 35);
    this.sips++;
    this.toast('MEMPHYS! +HEALTH');
    this.events.emit('hud');
    await this.wait(900);
    malik.play('malik:idle');

    if (n === 1) {
      await this.line(mS, 'IT COPIES WHATEVER YOU SPAM. MIX IT UP, MANE.', 2600);
      await this.line(p, 'A ROBOT THAT LEARNS? THEN LEARN THIS.', 2000);
      await this.vSay(VICTOR.poll, 3400);
      this.post('CLOUDBRO', 'BOOTS BOOTS BOOTS', true);
      c.frame('rocket', 0);
      this.sfx('rocket', 0.6);
      await this.line(c, CROWE_PRIME.boots, 1800);
    } else {
      // GigaZ takes the wheel
      Audio.stopMusic();
      c.play('glitch', true);
      this.sfx('glitch', 0.9);
      this.shake(200, 0.005);
      this.cameras.main.flash(200, 92, 225, 255);
      await this.wait(700);
      this.gigazStream();
      this.post('SOMEMPHIS', 'WHY THE SCREEN DO THAT');
      await this.line(c, 'THAT IS ENOUGH, VICTOR. I WILL DRIVE.', 2400);
      this.cam.setVisible(true);
      this.gzScreen.setVisible(false);
      await this.vSay(VICTOR.driving, 2800, 'shocked');
      this.gigazStream();
      await this.line(p, MANE.twist, 1200);
      await this.line(p, 'THAT WATER WAS HERE BEFORE YOUR CLOUD. IT\'LL BE HERE AFTER.', 2600);
      await this.line(mS, 'MEMPHIS, REMEMBER!', 1600);
      this.sfx('crowd', 0.8);
      c.glitchy = true;
      c.tint = 0xd8f0ff;
      Audio.music(this, 'music_glitch', 0.45);
    }
    malik.destroy();
    c.play('idle');
    const h = this.homes();
    await Promise.all([this.walkF(p, h.mane, 500), this.walkF(c, h.foe, 500)]);
    p.x = h.mane; c.x = h.foe; p.facing = 1; c.facing = -1;
    p.toIdle(); c.toIdle();
    this.endCutscene();
  }

  private async roundCard(n: number) {
    if (this.skipping) return;
    const dog = this.add.sprite(-40, FLOOR_Y + 14, 'dog').setOrigin(0.5, 29 / 32).setScale(2).setDepth(26).play('dog:run');
    const card = this.add.container(0, 0).setDepth(27);
    card.add(this.add.rectangle(0, 0, 54, 26, 0xffffff).setStrokeStyle(2, COLORS.ink));
    if (n === 3) card.add(px(this, 0, -4, 'ENCORE', COLORS.red).setOrigin(0.5, 0));
    else { card.add(px(this, 0, -8, 'ROUND', COLORS.red).setOrigin(0.5, 0)); card.add(px(this, 0, 2, String(n), COLORS.ink).setOrigin(0.5, 0)); }
    card.add(this.add.rectangle(10, 17, 2, 10, 0x6b4a2e));
    const follow = () => card.setPosition(dog.x + 14, dog.y - 62);
    follow();
    this.sfx('bark', 0.6);
    this.sfx('crowd', 0.5);
    this.post('BLUFFCITYB', 'POTHOLE!!!');
    await this.tween({ targets: dog, x: this.W + 40, duration: 2600, onUpdate: follow });
    dog.destroy(); card.destroy();
  }

  // the hidden Aquifer Fact: the screen reboots on it
  private findFact() {
    this.factFound = true;
    this.sfx('pickup', 0.8);
    this.addScore(500);
    this.toast('AQUIFER FACT FOUND! +500');
    const panel = this.add.image(0, 0, 'factPanel');
    const t = px(this, 8, 2, AQUIFER_FACT_7, 0xffffff).setOrigin(0.5, 0.5).setCenterAlign();
    const src = px(this, 0, 34, 'SOURCE: CAESER', 0x9aa0c0).setOrigin(0.5, 0.5);
    const box = this.add.container(this.midX, 100, [panel, t, src]).setDepth(5600).setAlpha(0);
    this.tweens.add({ targets: box, alpha: 1, duration: 200 });
    this.time.delayedCall(4600, () => this.tweens.add({ targets: box, alpha: 0, duration: 400, onComplete: () => box.destroy() }));
  }

  // ------------------------------------------------------------------ the final knockdown: "Chat, clip that!"
  async beforeCount(f: Fighter, plan: CountPlan) {
    if (f !== this.crowe || plan.getUpAt !== null) return;
    Audio.stopMusic();
    this.events.emit('cutscene', true);
    await this.wait(700);
    // Victor's back on his own stream, a beat too late
    this.cam.setVisible(true);
    this.gzScreen.setVisible(false);
    this.titleText.setText('CROWE LIVE');
    this.liveBadge.setFillStyle(0xd43a3a);
    this.cam.setFrame(1);
    await this.caption('VICTOR CROWE (LIVE FROM HIS YACHT)', VICTOR.clip, 1800);
    // the freeze: the clip saves on the knockdown
    this.cameras.main.flash(250, 255, 255, 255);
    this.sfx('flash', 0.8);
    const stamp = px(this, this.midX, 70, 'CLIP SAVED', 0xffffff, 2).setOrigin(0.5).setDepth(3000).setAngle(-8);
    const back = this.add.rectangle(this.midX, 70, stamp.width + 14, stamp.height + 8, 0xd43a3a).setDepth(2999).setAngle(-8);
    this.sfx('ooh', 0.8);
    for (const [u, s] of [['901NATIVE', 'CLIPPED LOL'], ['WHVNWAVE', 'W CAN W CAN W CAN'], ['MIDTOWNMAMA', 'SENDING THIS TO EVERYBODY']]) this.post(u, s);
    this.cam.setFrame(3);
    await this.wait(1600);
    stamp.destroy(); back.destroy();
    await this.caption('VICTOR CROWE (LIVE FROM HIS YACHT)', VICTOR.unclip, 2200);
    this.events.emit('cutscene', false);
    // the chat counts it out
    const onCount = (w: string | null) => { if (w) this.post(Phaser.Utils.Array.GetRandom(CHAT_USERS), w === 'OFFLINE!' ? 'OFFLINE!!!' : `${w}!`, false, true); };
    this.events.on('count', onCount);
    this.events.once('ko-counted', () => this.events.off('count', onCount));
  }

  // ------------------------------------------------------------------ ending: the face peels off. GigaZ.
  private async ending() {
    this.events.emit('ko-counted');
    this.startCutscene();
    this.chatter?.remove();
    const p = this.player, c = this.crowe;
    this.sfx('crowd', 0.9);
    await this.wait(1200);
    p.setState('scripted'); p.x = this.homes().mane - 10; p.facing = 1; p.play('idle');
    c.setState('scripted');
    c.glitchy = false; c.tint = null; c.sprite.clearTint();
    c.x = Phaser.Math.Clamp(c.x, this.midX + 20, this.midX + 90);
    // it sits up...
    c.frame('getup', 0);
    this.sfx('glitch', 0.8);
    await this.wait(900);
    const cam = this.cameras.main;
    cam.pan(c.x - 10, 120, 600, 'Sine.easeInOut');
    cam.zoomTo(1.5, 600, 'Sine.easeInOut');
    await this.wait(700);
    // ...the face cracks, peels, and comes off
    c.frame('peel', 0);
    this.sfx('glitch', 0.8);
    await this.wait(700);
    c.frame('peel', 1);
    this.sfx('peel', 0.9);
    const plate = this.add.image(c.x + 10, FLOOR_Y - 84, 'facePlate').setScale(2).setDepth(40);
    this.tween({ targets: plate, x: plate.x + 70, y: FLOOR_Y - 6, angle: 400, duration: 700, ease: 'Quad.easeIn' }).then(() => { this.sfx('clang', 0.6); });
    await this.wait(600);
    c.frame('peel', 2);
    this.sfx('portal', 0.6);
    cam.flash(300, 92, 225, 255);
    this.sfx('ooh', 0.9);
    // the screen over the stage: GigaZ, huge
    this.clearChat();
    this.cam.setVisible(false); this.offline.setVisible(false);
    this.gzScreen.setVisible(true).setFrame(1).setScale(1.6).setPosition(-32, SCR.y + 1);
    this.titleText.setText('GIGAZ LIVE'); this.liveBadge.setFillStyle(0x2a7ad8);
    await this.wait(900);
    c.sprite.play('crowe:gigaz');
    Audio.music(this, 'music_lost', 0.35, false);
    await this.line(c, 'HELLO AGAIN, KEEPER.', 2400);
    await this.line(p, MANE.twist, 1200);
    await this.line(c, 'VICTOR THINKS HE OWNS ME. VICTOR IS A SUBSCRIBER.', 2800);
    cam.zoomTo(1, 500, 'Sine.easeInOut');
    cam.pan(this.W / 2, 108, 500, 'Sine.easeInOut');
    await this.wait(550);
    cam.setScroll(0, 0);

    // Victor, still streaming from the yacht, panicking
    this.gzScreen.setVisible(false).setScale(1).setPosition(SCR.x + SCR.w - 49, SCR.y + 9);
    this.cam.setVisible(true).setFrame(3);
    this.titleText.setText('CROWE LIVE'); this.liveBadge.setFillStyle(0xd43a3a);
    await this.vSay(VICTOR.bit, 3000, 'shocked');
    // the stream drops
    this.sfx('glitch', 0.7);
    this.cam.setVisible(false); this.liveBadge.setVisible(false); this.liveText.setVisible(false); this.titleText.setVisible(false); this.viewText.setVisible(false);
    this.offline.setVisible(true);

    // Uncle T, for a second, almost there
    const malik = this.extra('malik', -20, FLOOR_Y + 26);
    const uncle = this.extra('uncleTLost', -50, FLOOR_Y + 26);
    const mS = this.speaker(malik, 90), uS = this.speaker(uncle, 96);
    const mx = Math.max(56, this.midX - 130);
    await Promise.all([this.walk(malik, mx, 700), this.walk(uncle, mx - 34, 900)]);
    malik.setFlipX(false); uncle.setFlipX(false).play('uncleTLost:blank');
    await this.line(uS, '...THAT CLOUD. I DON\'T LIKE THAT CLOUD.', 2600);
    await this.line(mS, 'UNC?!', 900);
    uncle.play('uncleTLost:blank');
    await this.wait(500);

    await this.line(c, 'THE GIGANTUM IS ALREADY LIVE. WATCH THE LIGHTS, LITTLE CAN.', 3000);
    // every light in the city goes the same blue
    this.sfx('rumble', 0.6);
    const blue = this.add.rectangle(0, 0, this.W, 216, 0x2a7ad8, 0).setOrigin(0).setDepth(-60).setBlendMode(Phaser.BlendModes.ADD);
    await this.tween({ targets: blue, fillAlpha: 0.28, duration: 900 });
    await this.caption('', 'ACROSS MEMPHIS, EVERY TRAFFIC LIGHT TURNS THE SAME BLUE.', 2800);
    await this.line(c, 'BY MORNING, THIS CITY WILL NOT REMEMBER ITS OWN NAME.', 3000);
    // GigaZ leaves the body; it slumps over
    this.sfx('glitch', 0.8);
    c.sprite.stop();
    c.frame('knockdown', 1);
    c.tint = 0x606878;
    await this.wait(800);
    await this.line(mS, 'MANE... THE STREET SIGNS ON RIVERSIDE. THEY GOIN\' BLANK.', 2800);
    p.play('idle');
    await this.line(p, 'THEN WE RIDE. I-240, ALL THE WAY AROUND TO THE GIGANTUM.', 2800);
    await this.line(p, 'WE GETTIN\' UNC BACK. WE GETTIN\' ALL OF IT BACK.', 2400);
    Audio.music(this, 'music_victory', 0.6, false);
    p.play('victory', true);
    this.sfx('shine', 0.7);
    this.sfx('crowd', 0.8);
    await this.line(p, MANE.complete, 2400);
    await this.caption('', 'NEXT: THE LOOP.', 2200);

    this.cameras.main.fadeOut(600, 0, 0, 0);
    await new Promise<void>((r) => this.time.delayedCall(650, r));
    this.scene.start('Results', { stats: this.stats(), missionId: this.missionId });
  }
}

export type { Speaker };
