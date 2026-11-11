let W = 320,
  H = 416,
  TICK = 40,
  PLAYER_R = 6,
  ROBOT_R = 8;
const DIRS = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];
const WALL_BLUE = "#1948e8";
const PATTERNS = [
  [
    [70, 64, 8, 105],
    [145, 0, 8, 105],
    [230, 75, 8, 110],
    [75, 245, 8, 105],
    [180, 270, 8, 145],
    [0, 205, 100, 8],
    [215, 205, 105, 8],
  ],
  [
    [65, 0, 8, 125],
    [160, 80, 8, 145],
    [245, 0, 8, 125],
    [0, 190, 115, 8],
    [210, 190, 110, 8],
    [70, 280, 8, 136],
    [245, 280, 8, 136],
  ],
  [
    [95, 55, 8, 155],
    [215, 55, 8, 155],
    [0, 230, 85, 8],
    [235, 230, 85, 8],
    [150, 275, 8, 141],
    [75, 340, 75, 8],
    [170, 340, 75, 8],
  ],
  [
    [75, 0, 8, 135],
    [235, 0, 8, 135],
    [150, 75, 8, 150],
    [0, 225, 100, 8],
    [220, 225, 100, 8],
    [85, 290, 8, 126],
    [225, 290, 8, 126],
  ],
  [
    [55, 90, 8, 130],
    [120, 0, 8, 125],
    [200, 90, 8, 130],
    [265, 0, 8, 125],
    [0, 260, 110, 8],
    [210, 260, 110, 8],
    [160, 300, 8, 116],
  ],
  [
    [90, 0, 8, 150],
    [220, 0, 8, 150],
    [150, 120, 8, 155],
    [0, 205, 105, 8],
    [215, 205, 105, 8],
    [80, 300, 8, 116],
    [230, 300, 8, 116],
  ],
];
const rect = (x, y, w, h) => ({ x, y, w, h });
const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const hitWalls = (x, y, r, walls) =>
  walls.some((w) => overlaps(rect(x - r, y - r, r * 2, r * 2), w));
const rand = (n) => Math.floor(Math.random() * n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const direction = (dx, dy) =>
  Math.abs(dx) + Math.abs(dy) < 0.01
    ? 0
    : (Math.round(Math.atan2(dx, -dy) / (Math.PI / 4)) + 8) % 8;
const vec = (d) => DIRS[(d + 8) % 8];
// Keep all four doorway approaches free of internal walls. A clear spawn
// alone is not sufficient if the nearest wall seals off the doorway.
function subtractRect(w, cut) {
  if (!overlaps(w, cut)) return [w];
  const x0 = w.x,
    y0 = w.y,
    x1 = w.x + w.w,
    y1 = w.y + w.h;
  const a = Math.max(x0, cut.x),
    b = Math.min(x1, cut.x + cut.w);
  const c = Math.max(y0, cut.y),
    d = Math.min(y1, cut.y + cut.h);
  return [
    rect(x0, y0, w.w, c - y0),
    rect(x0, d, w.w, y1 - d),
    rect(x0, c, a - x0, d - c),
    rect(b, c, x1 - b, d - c),
  ].filter((p) => p.w > 0 && p.h > 0);
}
// All collision, drawing, spawning and doorways use the current logical room size.
// The original patterns are transformed independently on each axis. Wall thickness
// stays eight logical pixels, so landscape does not create oversized wall blocks.
function roomPattern(room) {
  const sx = W / 320, sy = H / 416;
  return PATTERNS[(room - 1) % PATTERNS.length].map(([x,y,w,h]) =>
    rect(Math.round(x*sx), Math.round(y*sy), w===8?8:Math.round(w*sx), h===8?8:Math.round(h*sy)));
}
function wallsFor(room) {
  const doorHalf=26, corridor=65, midX=W/2, midY=H/2;
  const doors=[rect(midX-doorHalf,0,doorHalf*2,corridor),rect(midX-doorHalf,H-corridor,doorHalf*2,corridor),rect(0,midY-doorHalf,corridor,doorHalf*2),rect(W-corridor,midY-doorHalf,corridor,doorHalf*2)];
  const inner=doors.reduce((pieces,door)=>pieces.flatMap(w=>subtractRect(w,door)),roomPattern(room));
  const gap=43, t=7;
  return [rect(0,0,midX-gap,t),rect(midX+gap,0,midX-gap,t),rect(0,H-t,midX-gap,t),rect(midX+gap,H-t,midX-gap,t),rect(0,0,t,midY-gap),rect(0,midY+gap,t,midY-gap),rect(W-t,0,t,midY-gap),rect(W-t,midY+gap,t,midY-gap),...inner];
}
function entryPositions(){return {bottom:[W/2,H-35],top:[W/2,35],left:[35,H/2],right:[W-35,H/2]};}
const ENTRY_SAFE_RADIUS = 62;
const ROBOT_CLEARANCE = 32;
function clearOfRobots(x, y, robots, margin = ROBOT_CLEARANCE) {
  return robots.every((r) => Math.hypot(r.x - x, r.y - y) >= margin);
}
function spawnRobots(room, walls, entry = "bottom") {
  const count = Math.min(3 + Math.floor((room - 1) / 2), 8),
    out = [];
  const points = [
    [50, 55],
    [270, 55],
    [55, 345],
    [265, 345],
    [160, 190],
    [95, 180],
    [230, 285],
    [155, 60],
    [65, 280],
    [260, 165],
    [170, 355],
    [115, 235],
  ];
  const pointsScaled=points.map(([x,y])=>[Math.round(x*W/320),Math.round(y*H/416)]);
  const entries=entryPositions();
  const [sx, sy] = entries[entry] || entries.bottom;
  for (let k = 0; k < points.length && out.length < count; k++) {
    const [x, y] = pointsScaled[(k + room * 3) % pointsScaled.length];
    if (hitWalls(x, y, ROBOT_R + 3, walls)) continue;
    // Exclude robots from the incoming doorway and a wide area around the hero.
    if (Math.hypot(x - sx, y - sy) < ENTRY_SAFE_RADIUS) continue;
    if (!clearOfRobots(x, y, out, ROBOT_R * 2 + 12)) continue;
    out.push({
      id: k + room * 100,
      x,
      y,
      dir: 4,
      phase: rand(20),
      alive: true,
    });
  }
  return out;
}
function safeSpawn(room, robots, entry = "bottom") {
  const walls = wallsFor(room);
  const entries=entryPositions();
  const [px, py] = entries[entry] || entries.bottom;
  const clear = (x, y) =>
    x >= PLAYER_R + 9 &&
    x <= W - PLAYER_R - 9 &&
    y >= PLAYER_R + 9 &&
    y <= H - PLAYER_R - 9 &&
    !hitWalls(x, y, PLAYER_R + 3, walls) &&
    clearOfRobots(x, y, robots, ROBOT_CLEARANCE);
  if (clear(px, py)) return { x: px, y: py };
  // Search near the actual doorway, keeping away from walls AND all robots.
  let best = null,
    bestDist = Infinity;
  for (let y = 20; y <= H - 20; y += 4)
    for (let x = 20; x <= W - 20; x += 4) {
      if (!clear(x, y)) continue;
      const distance = (x - px) ** 2 + (y - py) ** 2;
      if (distance < bestDist) {
        bestDist = distance;
        best = { x, y };
      }
    }
  return best || { x: px, y: py };
}
function newRoom(room, score, lives, settings, high = 0, entry = "bottom") {
  const walls = wallsFor(room);
  const robots = spawnRobots(room, walls, entry);
  const spawn = safeSpawn(room, robots, entry);
  return {
    room,
    score,
    lives,
    high,
    player: { ...spawn, dir: 0, inv: 48, walking: false, step: 0 },
    entryLock: true,
    robots,
    shots: [],
    otto: null,
    tick: 0,
    mode: "playing",
    message: "",
    messageUntil: 0,
    robotShots: 0,
    settings,
  };
}
function start(settings, high = 0) {
  return newRoom(1, 0, 3, settings, high);
}
function killPlayer(s) {
  if (s.player.inv > 0) return s;
  const lives = s.lives - 1;
  if (lives <= 0)
    return {
      ...s,
      lives: 0,
      mode: "gameover",
      message: "GAME OVER",
      high: Math.max(s.high, s.score),
    };
  const spawn = safeSpawn(s.room, s.robots, "bottom");
  return {
    ...s,
    lives,
    player: { ...spawn, dir: s.player.dir, inv: 55, walking: false, step: 0 },
    entryLock: true,
    shots: s.shots.filter((b) => b.owner === "player"),
    message: "PLAYER DESTROYED",
    messageUntil: s.tick + 35,
  };
}
function escapeRoom(s, exitSide) {
  const bonus = s.robots.length === 0 ? 10 : 0;
  const entry =
    { left: "right", right: "left", top: "bottom", bottom: "top" }[exitSide] ||
    "bottom";
  const next = newRoom(
    s.room + 1,
    s.score + bonus,
    s.lives,
    s.settings,
    Math.max(s.high, s.score + bonus),
    entry,
  );
  next.message = bonus ? "ROOM CLEARED +10" : "ESCAPED";
  next.messageUntil = 24;
  return next;
}
function update(s, inputs) {
  if (s.mode !== "playing") return s;
  let n = {
    ...s,
    tick: s.tick + 1,
    player: { ...s.player, inv: Math.max(0, s.player.inv - 1), walking: false },
    robots: s.robots.map((r) => ({ ...r })),
    shots: [],
    otto: s.otto ? { ...s.otto } : null,
  };
  if (n.messageUntil < n.tick) n.message = "";
  // Require the player to release the held movement button once after entering
  // or respawning. Otherwise the same held direction can push them back out.
  if (n.entryLock && inputs.move === null) n.entryLock = false;
  const moving = n.entryLock ? null : inputs.move;
  if (moving !== null) {
    const [vx, vy] = vec(moving),
      mag = vx && vy ? Math.SQRT1_2 : 1,
      speed = n.settings.speed === "fast" ? 3.2 : 2.5;
    const x = n.player.x + vx * mag * speed,
      y = n.player.y + vy * mag * speed;
    n.player.dir = moving;
    n.player.walking = true;
    n.player.step = (n.player.step || 0) + 1;
    // Original Berzerk: touching a wall is lethal, not merely blocked.
    if (hitWalls(x, y, PLAYER_R, wallsFor(n.room))) {
      // Protected players cannot be repeatedly killed or wedged into a wall.
      if (n.player.inv === 0) n = killPlayer(n);
    } else n.player = { ...n.player, x, y };
    if (n.mode !== "playing") return n;
    if (
      x < -PLAYER_R ||
      x > W + PLAYER_R ||
      y < -PLAYER_R ||
      y > H + PLAYER_R
    ) {
      const side =
        x < -PLAYER_R
          ? "left"
          : x > W + PLAYER_R
            ? "right"
            : y < -PLAYER_R
              ? "top"
              : "bottom";
      return escapeRoom(n, side);
    }
  }
  const fireDir = inputs.fireDir !== null ? inputs.fireDir : n.player.dir;
  if (inputs.firing && n.tick % 5 === 0 && n.shots.length < 20) {
    const [vx, vy] = vec(fireDir),
      m = vx && vy ? Math.SQRT1_2 : 1;
    n.shots = s.shots.concat({
      id: n.tick * 10 + 1,
      x: n.player.x + vx * 12,
      y: n.player.y + vy * 12,
      vx: vx * m * 7,
      vy: vy * m * 7,
      owner: "player",
      age: 0,
    });
  } else n.shots = s.shots.slice();
  const walls = wallsFor(n.room),
    level = Math.min(5, Math.floor((n.room - 1) / 3));
  // Robot movement, shooting, collisions and robot-on-robot friendly fire.
  n.robots = n.robots
    .filter((r) => r.alive)
    .map((r) => {
      const dx = n.player.x - r.x,
        dy = n.player.y - r.y,
        dist = Math.hypot(dx, dy) || 1;
      const speed =
        (0.38 + level * 0.13) *
        (n.settings.difficulty === "easy"
          ? 0.72
          : n.settings.difficulty === "hard"
            ? 1.3
            : 1);
      const preferred =
        Math.abs(dx) > Math.abs(dy)
          ? [
              [Math.sign(dx), 0],
              [0, Math.sign(dy)],
            ]
          : [
              [0, Math.sign(dy)],
              [Math.sign(dx), 0],
            ];
      if ((n.tick + r.phase) % 3 === 0) {
        for (const [mx, my] of preferred) {
          if (mx === 0 && my === 0) continue;
          const nx = r.x + mx * speed * 3,
            ny = r.y + my * speed * 3;
          if (
            nx > 15 &&
            nx < W - 15 &&
            ny > 15 &&
            ny < H - 15 &&
            !hitWalls(nx, ny, ROBOT_R, walls) &&
            !(
              n.player.inv > 0 &&
              Math.hypot(nx - n.player.x, ny - n.player.y) < ROBOT_CLEARANCE
            )
          ) {
            r.x = nx;
            r.y = ny;
            r.dir = direction(mx, my);
            break;
          }
        }
      }
      if (dist < 17 && n.player.inv === 0) n = killPlayer(n);
      const rate = Math.max(23, 85 - level * 9);
      if (
        (n.tick + r.id * 7) % rate === 0 &&
        n.shots.filter((b) => b.owner === "robot").length < 12
      ) {
        const d = direction(dx, dy),
          [vx, vy] = vec(d),
          m = vx && vy ? Math.SQRT1_2 : 1;
        n.shots.push({
          id: n.tick * 100 + r.id,
          x: r.x + vx * 12,
          y: r.y + vy * 12,
          vx: vx * m * (3.2 + level * 0.3),
          vy: vy * m * (3.2 + level * 0.3),
          owner: "robot",
          age: 0,
        });
      }
      return r;
    });
  if (n.mode !== "playing") return n;
  const survivors = [];
  for (const b of n.shots) {
    let shot = { ...b, age: b.age + 1 },
      destroyed = false;
    for (let step = 0; step < 2 && !destroyed; step++) {
      shot.x += shot.vx / 2;
      shot.y += shot.vy / 2;
      if (
        shot.x < 0 ||
        shot.x > W ||
        shot.y < 0 ||
        shot.y > H ||
        hitWalls(shot.x, shot.y, 3, walls)
      ) {
        destroyed = true;
        break;
      }
      if (shot.owner === "robot") {
        if (
          n.player.inv === 0 &&
          Math.hypot(shot.x - n.player.x, shot.y - n.player.y) < PLAYER_R + 3
        ) {
          n = killPlayer(n);
          destroyed = true;
        }
      } else {
        for (const r of n.robots) {
          if (r.alive && Math.hypot(shot.x - r.x, shot.y - r.y) < ROBOT_R + 3) {
            r.alive = false;
            n.score += 50;
            destroyed = true;
            break;
          }
        }
      }
      // Robot laser fire can destroy other robots.
      if (!destroyed && shot.owner === "robot")
        for (const r of n.robots) {
          if (r.alive && Math.hypot(shot.x - r.x, shot.y - r.y) < ROBOT_R + 2) {
            r.alive = false;
            n.score += 50;
            destroyed = true;
            break;
          }
        }
    }
    if (!destroyed && shot.age < 100) survivors.push(shot);
  }
  n.shots = survivors;
  n.robots = n.robots.filter((r) => r.alive);
  if (n.mode !== "playing") return n;
  // Otto arrives if you linger. Indestructible and capable of crossing walls.
  const ottoDelay =
    n.settings.difficulty === "easy"
      ? 420
      : n.settings.difficulty === "hard"
        ? 230
        : 320;
  if (n.tick > ottoDelay && !n.otto) n.otto = { x: W/2, y: 25, phase: 0 };
  if (n.otto) {
    const o = n.otto,
      dx = n.player.x - o.x,
      dy = n.player.y - o.y,
      d = Math.hypot(dx, dy) || 1;
    const speed = n.settings.difficulty === "hard" ? 2.15 : 1.65;
    o.x += (dx / d) * speed;
    o.y += (dy / d) * speed;
    o.phase += 0.22;
    if (
      n.player.inv === 0 &&
      Math.hypot(o.x - n.player.x, o.y - n.player.y) < 16
    )
      n = killPlayer(n);
  }
  if (n.robots.length === 0 && n.tick % 50 === 0) {
    n.message = "ALL ROBOTS DESTROYED — FIND AN EXIT";
    n.messageUntil = n.tick + 40;
  }
  return n;
}
const DEFAULT = {
  difficulty: "normal",
  speed: "classic",
  sound: false,
  controls: "dual",
};
function reducer(s, a) {
  if (a.type === "RESET") return start(a.settings || s.settings, s.high);
  if (a.type === "SETTINGS")
    return { ...s, settings: { ...s.settings, ...a.patch } };
  if (a.type === "PAUSE")
    return {
      ...s,
      mode:
        s.mode === "playing"
          ? "paused"
          : s.mode === "paused"
            ? "playing"
            : s.mode,
    };
  if (a.type === "TICK") return update(s, a.inputs);
  return s;
}
// Hand-drawn 8-direction character silhouettes based on the supplied arcade screenshot.
// G=player green; R=robot red; .=transparent. No external sprite assets.
// A facing change immediately selects a different silhouette; legs animate only while walking.
const HERO_FRONT = [
  "...GG...",
  "..GGGG..",
  "...GG...",
  "...GG...",
  "..GGGG..",
  ".G.GG.G.",
  "G..GG..G",
  "...GG...",
  "...GG...",
  "..G..G..",
  "..G..G..",
  ".GG..GG.",
];
const HERO_BACK = [
  "...GG...",
  "..GGGG..",
  "..GGGG..",
  "...GG...",
  "..GGGG..",
  ".G.GG.G.",
  "G..GG..G",
  "...GG...",
  "...GG...",
  "..G..G..",
  "..G..G..",
  ".GG..GG.",
];
const HERO_SIDE = [
  "...GG...",
  "..GGGG..",
  "..GGG...",
  "...GG...",
  "..GGGG..",
  ".GGGGGG.",
  "...GGGGG",
  "...GG...",
  "...GG...",
  "..GG....",
  "..G.G...",
  ".GG..GG.",
];
const HERO_DIAGONAL = [
  "...GG...",
  "..GGGG..",
  "...GG...",
  "...GG...",
  "..GGGG..",
  ".GGGGGG.",
  "..GGGG.G",
  "...GG...",
  "...GG...",
  "..G..G..",
  "..G..G..",
  ".GG..GG.",
];
const ROBOT_FRONT = [
  "..RRRR..",
  ".RRRRRR.",
  ".R.RR.R.",
  ".RRRRRR.",
  "..RRRR..",
  ".RRRRRR.",
  "RRRRRRRR",
  "R.RRRR.R",
  "R.RRRR.R",
  "..RRRR..",
  "..RRRR..",
  "..RRRR..",
  "..RR.RR.",
  "..RR.RR.",
  ".RR...RR",
];
const ROBOT_SIDE = [
  "..RRRR..",
  ".RRRRRR.",
  "..R.RRR.",
  ".RRRRRR.",
  "..RRRR..",
  ".RRRRRR.",
  "..RRRRRR",
  ".RRRRRRR",
  "..RRRR.R",
  "..RRRR..",
  "..RRRR..",
  "..RRRR..",
  "..RR.RR.",
  "..RR.RR.",
  ".RR...RR",
];
function walkingLegs(rows, step) {
  if (step % 2 === 0) return rows;
  const copy = rows.slice();
  if (rows.length === 12) {
    copy[9] = "...G.G..";
    copy[10] = "..GG..G.";
    copy[11] = ".GG....G";
  } else {
    copy[12] = "...RRR..";
    copy[13] = "..RR.RR.";
    copy[14] = ".RR...RR";
  }
  return copy;
}


function setRoomOrientation(landscape, oldGame) {
  const nextW=landscape?480:320, nextH=landscape?300:416;
  if(W===nextW&&H===nextH)return oldGame;
  W=nextW; H=nextH;
  if(!oldGame)return null;
  const n=newRoom(oldGame.room,oldGame.score,oldGame.lives,oldGame.settings,oldGame.high,'bottom');
  n.mode=oldGame.mode; n.message='ROOM RESIZED'; n.messageUntil=35;
  return n;
}
