/**
 * Simulate 6 teams rolling 2d6 around a 32-tile square board.
 * Goal: find which positions have the highest landing probability,
 * then suggest optimal placement for chance & pay_tax tiles
 * (max 2 per side).
 *
 * Board layout:
 *   Side 1: positions 0–8   (corner 0=Start, corner 8=Jail)
 *   Side 2: positions 8–16  (corner 16=Pot)
 *   Side 3: positions 16–24 (corner 24=Go to Jail)
 *   Side 4: positions 24–31,0 (wraps back to Start)
 *
 * "Go to Jail" (pos 24) sends the team to Jail (pos 8).
 */

const TOTAL_TILES = 32;
const NUM_TEAMS = 6;
const NUM_SIMULATIONS = 500_000; // per team
const JAIL_POS = 8;
const GO_TO_JAIL_POS = 24;

function roll2d6() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return d1 + d2;
}

// Simulate landing frequency
const landCount = new Array(TOTAL_TILES).fill(0);
let totalLandings = 0;

for (let team = 0; team < NUM_TEAMS; team++) {
  let pos = 0; // start
  for (let turn = 0; turn < NUM_SIMULATIONS; turn++) {
    const roll = roll2d6();
    pos = (pos + roll) % TOTAL_TILES;

    // Go to Jail mechanic
    if (pos === GO_TO_JAIL_POS) {
      landCount[GO_TO_JAIL_POS]++;
      totalLandings++;
      pos = JAIL_POS; // sent to jail
      landCount[JAIL_POS]++;
      totalLandings++;
      continue;
    }

    landCount[pos]++;
    totalLandings++;
  }
}

console.log("=== LANDING PROBABILITY BY POSITION ===\n");
console.log("Pos | Side | Prob(%) | Bar");
console.log("----|------|---------|----");

const probs = landCount.map(c => (c / totalLandings) * 100);

// Identify side for each position
function getSide(pos) {
  if (pos >= 0 && pos <= 8) return 1;
  if (pos > 8 && pos <= 16) return 2;
  if (pos > 16 && pos <= 24) return 3;
  return 4; // 25-31
}

for (let i = 0; i < TOTAL_TILES; i++) {
  const bar = "█".repeat(Math.round(probs[i] * 20));
  console.log(
    `${String(i).padStart(3)} | ${getSide(i)}    | ${probs[i].toFixed(3).padStart(6)}  | ${bar}`
  );
}

// Now rank non-corner positions by probability
console.log("\n=== NON-CORNER POSITIONS RANKED BY PROBABILITY ===\n");
const corners = new Set([0, 8, 16, 24]);
const ranked = probs
  .map((p, i) => ({ pos: i, prob: p, side: getSide(i) }))
  .filter(x => !corners.has(x.pos))
  .sort((a, b) => b.prob - a.prob);

ranked.forEach((r, idx) => {
  console.log(`#${idx + 1}: pos ${r.pos} (side ${r.side}) — ${r.prob.toFixed(3)}%`);
});

// Suggest placement: pick top 2 per side for chance/pay_tax
// constraint: max 2 chance/pay_tax per side, total ~4 chance + 2 pay_tax
console.log("\n=== SUGGESTED CHANCE & PAY TAX PLACEMENT ===\n");
console.log("Constraints: max 2 chance/pay_tax per side, want ~4 chance + 2 pay_tax tiles\n");

const sideSlots = { 1: [], 2: [], 3: [], 4: [] };
for (const r of ranked) {
  if (sideSlots[r.side].length < 2) {
    sideSlots[r.side].push(r);
  }
}

// Collect all candidates, sort by prob, assign types
const candidates = Object.values(sideSlots).flat().sort((a, b) => b.prob - a.prob);
console.log("Top candidates (max 2 per side, sorted by probability):");
candidates.forEach((c, i) => {
  const type = i < 4 ? "chance" : "pay_taxes";
  console.log(`  pos ${c.pos} (side ${c.side}, ${c.prob.toFixed(3)}%) → ${type}`);
});

// Build final board
console.log("\n=== FULL SUGGESTED BOARD LAYOUT ===\n");
const specialPositions = new Map();
specialPositions.set(0, { tile_type: "start", label: "Start", color_group: "gray" });
specialPositions.set(8, { tile_type: "jail", label: "Jail", color_group: "orange" });
specialPositions.set(16, { tile_type: "pot", label: "Pot", color_group: "purple" });
specialPositions.set(24, { tile_type: "go_to_jail", label: "Go to Jail", color_group: "orange" });

const chanceTaxPositions = new Set();
candidates.forEach((c, i) => {
  const type = i < 4 ? "chance" : "pay_taxes";
  const label = i < 4 ? "Chance" : "Pay Tax";
  const color = i < 4 ? "indigo" : "pink";
  specialPositions.set(c.pos, { tile_type: type, label, color_group: color });
  chanceTaxPositions.add(c.pos);
});

// Activity types cycle for remaining tiles
const ACTIVITY_TYPES = ["solo", "head_to_head", "all_teams"];
let actIdx = 0;
const tiles = [];
for (let i = 0; i < TOTAL_TILES; i++) {
  if (specialPositions.has(i)) {
    const sp = specialPositions.get(i);
    tiles.push({
      position: i,
      label: sp.label,
      tile_type: sp.tile_type,
      color_group: sp.color_group,
    });
  } else {
    const type = ACTIVITY_TYPES[actIdx % ACTIVITY_TYPES.length];
    actIdx++;
    tiles.push({
      position: i,
      label: "",
      tile_type: type,
      color_group: type,
    });
  }
}

// Count tile types
const typeCounts = {};
tiles.forEach(t => {
  typeCounts[t.tile_type] = (typeCounts[t.tile_type] || 0) + 1;
});

console.log("Tile type distribution:");
for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type}: ${count}`);
}

console.log("\nFull tile list:");
tiles.forEach(t => {
  const prob = probs[t.position].toFixed(3);
  console.log(`  [${String(t.position).padStart(2)}] ${t.tile_type.padEnd(14)} ${t.label.padEnd(12)} (${prob}%)`);
});

// Output JSON
console.log("\n=== JSON TILES ARRAY ===\n");
console.log(JSON.stringify(tiles, null, 2));
