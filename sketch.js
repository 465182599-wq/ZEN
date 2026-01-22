let bgImg, chopSound;
const bank = [
  "life","job","career","family","future","big television","washing machine","car",
  "CD player","tin opener","health","cholesterol","dental insurance","mortgage",
  "starter home","friends","leisurewear","luggage","three-piece suit","hire purchase",
  "DIY","Sunday morning","couch","game show","junk food","miserable home","rotting",
  "embarrassment","children"
];

const MIND = "mind";
const ZEN  = "zen";

let mode = "start"; 

let words = [];
let letters = [];
let slashes = [];

let capNormal = 10;
let disabled = new Set();

let chops = 0;
let zenQueue = 0;

let zenClear = false;
let emptyFrames = 0;

const specialCap = 2;
const normalFailLimit = 20;
const normalSpawn = 0.05;

const g = 0.25;
const drag = 0.995;
const bounce = 0.55;

const maxWordsAll = 160;
const maxLetters = 700;
const maxSlashes = 20;

let btn = { x: 0, y: 0, w: 320, h: 110 };

function preload() {
  bgImg = loadImage("zan.png");
  chopSound = loadSound("1.MP3");
}

function setup() {
  createCanvas(2000, 1000);
  textAlign(CENTER, CENTER);
  textFont("sans-serif");

  btn.x = width / 2 - btn.w / 2;
  btn.y = height / 2 + 60;
}

function draw() {
  background(245);
  if (bgImg) image(bgImg, 0, 0, width, height);

  if (mode === "start") {
    startScreen();
    return;
  }

  if (mode === "play") {
    stepGame();
    if (!zenClear && countNormal() > normalFailLimit) mode = "end";
  } else {
    stepGame(true);
    endScreen();
  }
}

function startScreen() {
  noStroke();
  fill(0, 120);
  rect(0, 0, width, height);

  fill(255, 245);
  textSize(96);
  text("ZEN", width / 2, height / 2 - 150);

  fill(255, 210);
  textSize(24);
  text("Press R to restart", width / 2, height / 2 - 80);

  const h = over(btn.x, btn.y, btn.w, btn.h);
  fill(h ? 255 : 240);
  stroke(0, 120);
  strokeWeight(3);
  rect(btn.x, btn.y, btn.w, btn.h, 18);

  noStroke();
  fill(0, 200);
  textSize(44);
  text("START", width / 2, btn.y + btn.h / 2);
}

function endScreen() {
  noStroke();
  fill(0, 160);
  rect(0, 0, width, height);

  fill(255, 245);
  textSize(72);

  if (zenClear) {
    text("COMPLETE", width / 2, height / 2 - 40);
  } else {
    text("ENDED", width / 2, height / 2 - 40);
  }

  fill(255, 210);
  textSize(22);
  text("press R to restart", width / 2, height / 2 + 40);
}

//game loop（with some help of GPT）

function stepGame(frozen) {
  if (zenClear) frozen = true;

  if (!frozen) {
    const sf = constrain(frameRate() / 60, 0.25, 1);

    keepSpecial(MIND);

    if (zenQueue > 0) {
      for (let k = 0; k < 2; k++) {
        if (keepSpecial(ZEN)) zenQueue--;
        else break;
      }
    }
//here
    if (random() < normalSpawn * sf) spawnNormal();
  }

  for (let i = words.length - 1; i >= 0; i--) {
    words[i].update();
    words[i].draw();
    if (words[i].off()) words.splice(i, 1);
  }

  for (let i = letters.length - 1; i >= 0; i--) {
    letters[i].update();
    letters[i].draw();
    if (letters[i].dead()) letters.splice(i, 1);
  }

  for (let i = slashes.length - 1; i >= 0; i--) {
    slashes[i].update();
    slashes[i].draw();
    if (slashes[i].dead()) slashes.splice(i, 1);
  }

  if (mode === "play" && zenClear) {
    if (words.length === 0 && letters.length === 0 && slashes.length === 0) {
      emptyFrames++;
      if (emptyFrames >= 300) mode = "end";
    } else {
      emptyFrames = 0;
    }
  }
}

function mousePressed() {
  if (typeof userStartAudio === "function") userStartAudio();

  if (mode === "start") {
    if (over(btn.x, btn.y, btn.w, btn.h)) {
      resetAll();
      mode = "play";
    }
    return;
  }

  if (mode !== "play") return;
  if (zenClear) return;

  if (chopSound && chopSound.isLoaded()) {
    chopSound.rate(random(0.92, 1.08));
    chopSound.setVolume(random(0.45, 0.75));
    chopSound.play();
  }

  let x1 = isFinite(pmouseX) ? pmouseX : mouseX - 60;
  let y1 = isFinite(pmouseY) ? pmouseY : mouseY - 25;
  let x2 = mouseX;
  let y2 = mouseY;

  if (dist(x1, y1, x2, y2) < 22) {
    x1 = mouseX - 90;
    y1 = mouseY - 35;
    x2 = mouseX + 90;
    y2 = mouseY + 35;
  }

  slashes.push(new Slash(x1, y1, x2, y2));
  if (slashes.length > maxSlashes) slashes.splice(0, slashes.length - maxSlashes);

  const mx = (x1 + x2) * 0.5;
  const my = (y1 + y2) * 0.5;

  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    const dx = w.x - mx;
    const dy = w.y - my;
    if (dx * dx + dy * dy > 260 * 260) continue;

    if (w.hit(x1, y1, x2, y2)) {
      chops++;
      if (chops % 10 === 0) zenQueue++;

      onHitWord(w.text);

      letters.push(...w.split(x1, y1, x2, y2));
      if (letters.length > maxLetters) letters.splice(0, letters.length - maxLetters);

      words.splice(i, 1);
    }
  }
}

function keyPressed() {
  if (key === "r" || key === "R") {
    resetAll();
    mode = "start";
  }
}

//game（？） rules

function resetAll() {
  words = [];
  letters = [];
  slashes = [];
  capNormal = 10;
  disabled = new Set();
  chops = 0;
  zenQueue = 0;
  zenClear = false;
  emptyFrames = 0;
}

function onHitWord(t) {
  if (t === MIND) {
    capNormal = max(0, capNormal - 1);
    return;
  }
  if (t === ZEN) {
    capNormal += 1;
    const enabled = enabledNormal();
    if (enabled.length > 0) disabled.add(random(enabled));
    if (enabledNormal().length === 0) {
      zenClear = true;
      emptyFrames = 0;
    }
  }
}

function keepSpecial(t) {
  if (countWord(t) >= specialCap) return false;
  spawnWord(t);
  return true;
}

function spawnNormal() {
  if (countNormal() >= capNormal) return;
  const enabled = enabledNormal();
  if (!enabled.length) return;
  spawnWord(random(enabled));
}

function enabledNormal() {
  const out = [];
  for (const w of bank) if (!disabled.has(w)) out.push(w);
  return out;
}

//create words rain

function spawnWord(t) {
  const size = random(26, 54);
  const x = random(120, width - 120);
  const y = random(-140, -40);
  const vx = random(-0.45, 0.45);
  const vy = random(0.30, 0.85);
  words.push(new Word(t, x, y, vx, vy, size));
  if (words.length > maxWordsAll) words.splice(0, words.length - maxWordsAll);
}

function countWord(t) {
  let c = 0;
  for (const w of words) if (w.text === t) c++;
  return c;
}

function countNormal() {
  let c = 0;
  for (const w of words) if (w.text !== MIND && w.text !== ZEN) c++;
  return c;
}

function over(x, y, w, h) {
  return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
}

//turn text from the bank into the visual system(with some help of GPT)

class Word {
  constructor(text, x, y, vx, vy, size) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.ph = random(TWO_PI);
    this.ps = random(0.008, 0.022);
  }

  update() {
    this.ph += this.ps;
    this.x += this.vx + sin(this.ph) * 0.35;
    this.y += this.vy;
    if (this.x < -240) this.x = width + 240;
    if (this.x > width + 240) this.x = -240;
  }

  draw() {
    push();
    textSize(this.size);
    stroke(0, 90);
    strokeWeight(2);
    fill(255, 245);
    text(this.text, this.x, this.y);
    pop();
  }

  bounds() {
    push();
    textSize(this.size);
    const w = textWidth(this.text);
    pop();
    const h = this.size;
    return {
      l: this.x - w / 2 - 12,
      r: this.x + w / 2 + 12,
      t: this.y - h / 2 - 10,
      b: this.y + h / 2 + 10
    };
  }

  hit(x1, y1, x2, y2) {
    const b = this.bounds();
    return segAabb(x1, y1, x2, y2, b.l, b.t, b.r, b.b);
  }

  split(x1, y1, x2, y2) {
    push();
    textSize(this.size);

    const totalW = textWidth(this.text);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const L = max(1, sqrt(dx * dx + dy * dy));
    const nx = -dy / L;
    const ny = dx / L;

    const chars = Array.from(this.text);
    let xc = this.x - totalW / 2;
    const out = [];

    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const cw = textWidth(ch);
      if (ch !== " ") {
        out.push(
          new Letter(
            ch,
            xc + cw / 2,
            this.y,
            this.vx + nx * random(2.2, 5.5) + random(-0.7, 0.7),
            this.vy + ny * random(2.2, 5.5) + random(-1.4, 0.2),
            this.size
          )
        );
      }
      xc += cw;
    }
    pop();
    return out;
  }

  off() {
    return this.y > height + 180;
  }
}

class Letter {
  constructor(ch, x, y, vx, vy, size) {
    this.ch = ch;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.rot = random(-0.25, 0.25);
    this.av = random(-0.06, 0.06);
    this.life = 60 * 8;
  }

  update() {
    this.vy += g;
    this.vx *= drag;
    this.vy *= drag;
    this.x += this.vx;
    this.y += this.vy;
    this.rot += this.av;

    if (this.x < 12 || this.x > width - 12) this.vx *= -bounce;
//GPT
    const ground = height - 28;
    if (this.y > ground) {
      this.y = ground;
      this.vy *= -bounce;
    }
    this.life--;
  }

  draw() {
    push();
    translate(this.x, this.y);
    rotate(this.rot);
    textSize(this.size);
    const a = map(this.life, 0, 120, 0, 245, true);
    stroke(0, 90);
    strokeWeight(2);
    fill(255, a);
    text(this.ch, 0, 0);
    pop();
  }

  dead() {
    return this.life <= 0;
  }
}

class Slash {
  constructor(x1, y1, x2, y2) {
    this.x1 = x1; this.y1 = y1;
    this.x2 = x2; this.y2 = y2;
    this.life = 22;
  }
  update() { this.life--; }
  draw() {
    const a = map(this.life, 0, 22, 0, 200);
    stroke(0, a);
    strokeWeight(5);
    line(this.x1, this.y1, this.x2, this.y2);
    stroke(255, a * 0.35);
    strokeWeight(2);
    line(this.x1 + 1, this.y1 + 1, this.x2 + 1, this.y2 + 1);
  }
  dead() { return this.life <= 0; }
}

// Detecting of the chop（GPT help me a lot o.o）

function segAabb(x1, y1, x2, y2, l, t, r, b) {
  if (x1 >= l && x1 <= r && y1 >= t && y1 <= b) return true;
  if (x2 >= l && x2 <= r && y2 >= t && y2 <= b) return true;
  if (segSeg(x1, y1, x2, y2, l, t, r, t)) return true;
  if (segSeg(x1, y1, x2, y2, r, t, r, b)) return true;
  if (segSeg(x1, y1, x2, y2, r, b, l, b)) return true;
  if (segSeg(x1, y1, x2, y2, l, b, l, t)) return true;
  return false;
}

function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
  const o1 = ori(ax, ay, bx, by, cx, cy);
  const o2 = ori(ax, ay, bx, by, dx, dy);
  const o3 = ori(cx, cy, dx, dy, ax, ay);
  const o4 = ori(cx, cy, dx, dy, bx, by);
  if (o1 * o2 < 0 && o3 * o4 < 0) return true;
  if (o1 === 0 && onSeg(ax, ay, bx, by, cx, cy)) return true;
  if (o2 === 0 && onSeg(ax, ay, bx, by, dx, dy)) return true;
  if (o3 === 0 && onSeg(cx, cy, dx, dy, ax, ay)) return true;
  if (o4 === 0 && onSeg(cx, cy, dx, dy, bx, by)) return true;
  return false;
}

function ori(ax, ay, bx, by, px, py) {
  const v = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  if (abs(v) < 1e-9) return 0;
  return v > 0 ? 1 : -1;
}

function onSeg(ax, ay, bx, by, px, py) {
  return (
    px >= min(ax, bx) - 1e-9 && px <= max(ax, bx) + 1e-9 &&
    py >= min(ay, by) - 1e-9 && py <= max(ay, by) + 1e-9
  );
}
