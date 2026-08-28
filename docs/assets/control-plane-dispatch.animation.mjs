const SPARKLE_ASSET_ID = "octicon-sparkle-fill";
const SPARKLE_SIZE = 16;
const SPARKLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><style>path{fill:#8250df}@media(prefers-color-scheme:dark){path{fill:#a371f7}}</style><path d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z"/></svg>`;
const SPARKLE_DATA_URI = `data:image/svg+xml,${encodeURIComponent(SPARKLE_SVG)}`;
const STATUS_PENDING_ASSET_ID = "status-pending";
const STATUS_SUCCESS_ASSET_ID = "status-success";
const STATUS_SIZE = 20;
const STATUS_PENDING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><style>circle{fill:#bf8700;stroke:#fff}@media(prefers-color-scheme:dark){circle{fill:#d29922;stroke:#161b22}}</style><circle cx="10" cy="10" r="7" stroke-width="3"/></svg>`;
const STATUS_SUCCESS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><style>circle{fill:#1f883d;stroke:#fff}@media(prefers-color-scheme:dark){circle{fill:#3fb950;stroke:#161b22}}</style><circle cx="10" cy="10" r="7" stroke-width="3"/></svg>`;
const STATUS_PENDING_DATA_URI = `data:image/svg+xml,${encodeURIComponent(STATUS_PENDING_SVG)}`;
const STATUS_SUCCESS_DATA_URI = `data:image/svg+xml,${encodeURIComponent(STATUS_SUCCESS_SVG)}`;
const REPORT_UPDATED_ASSET_ID = "report-updated";
const REPORT_WIDTH = 274;
const REPORT_HEIGHT = 272;
const REPORT_UPDATED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="274" height="272" viewBox="0 0 274 272"><style>:root{--surface:#fff;--foreground:#1f2328;--muted:#656d76;--border:#d0d7de;--success:#1f883d;--danger:#cf222e;--attention:#bf8700;--accent:#8250df;--info:#0969da}[fill="#ffffff"]{fill:var(--surface)}[fill="#1f2328"]{fill:var(--foreground)}[fill="#656d76"]{fill:var(--muted)}[fill="#cf222e"]{fill:var(--danger)}[stroke="#d0d7de"]{stroke:var(--border)}[stroke="#1f883d"]{stroke:var(--success)}[stroke="#bf8700"]{stroke:var(--attention)}[stroke="#8250df"]{stroke:var(--accent)}[stroke="#0969da"]{stroke:var(--info)}@media(prefers-color-scheme:dark){:root{--surface:#161b22;--foreground:#f0f6fc;--muted:#8b949e;--border:#30363d;--success:#3fb950;--danger:#f85149;--attention:#d29922;--accent:#a371f7;--info:#58a6ff}}</style><g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"><rect width="274" height="272" rx="6" fill="#ffffff" stroke="#d0d7de"/><text x="16" y="32" fill="#656d76" font-size="8" font-weight="700">REPORT EXCERPT</text><text x="258" y="32" fill="#656d76" text-anchor="end" font-size="8" font-weight="700">2026-08-27 07:07:56 UTC</text><text x="16" y="54" fill="#1f2328" font-size="13" font-weight="600">Execution health</text><path d="M16 63H258" fill="none" stroke="#d0d7de"/><text x="16" y="81" fill="#656d76" font-size="8" font-weight="700">RUNS · 24H</text><text x="16" y="100" fill="#1f2328" font-size="15" font-weight="700">748</text><text x="146" y="81" fill="#656d76" font-size="8" font-weight="700">FAILURE RATE</text><text x="146" y="100" fill="#cf222e" font-size="15" font-weight="700">0.0%</text><rect x="16" y="112" width="242" height="7" rx="3.5" fill="#d0d7de"/><path d="M19.5 115.5H246" fill="none" stroke="#1f883d" stroke-width="7" stroke-linecap="round"/><path d="M246 115.5H254.5" fill="none" stroke="#bf8700" stroke-width="7" stroke-linecap="round"/><text x="16" y="142" fill="#656d76" font-size="8" font-weight="700">VALUE OVER TIME</text><g fill="none" stroke="#d0d7de" stroke-width=".7" opacity=".7"><path d="M16 166H258M16 190H258M16 214H258M16 238H258"/><path d="M76 158V244M137 158V244M198 158V244"/></g><path d="M44 158V244" fill="none" stroke="#8250df" stroke-width="1.5" stroke-dasharray="3 2"/><text x="48" y="165" fill="#8250df" font-size="8" font-weight="700">ADOPTED</text><path d="M16 224L36 227L56 204L76 209L97 193L117 199L137 175L157 193L178 171L198 179L218 174L238 181L258 163" fill="none" stroke="#1f883d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 184L36 206L56 211L76 225L97 240L117 221L137 200L157 237L178 216L198 232L218 210L238 226L258 204" fill="none" stroke="#0969da" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
const REPORT_UPDATED_DATA_URI = `data:image/svg+xml,${encodeURIComponent(REPORT_UPDATED_SVG)}`;

const linear = { i: { x: 0.667, y: 1 }, o: { x: 0.333, y: 0 } };
const staticValue = (value) => ({ a: 0, k: value });

function orthogonalFrames(points, start, duration) {
  let distance = 0;
  const distances = [0];

  for (let index = 1; index < points.length; index += 1) {
    const [previousX, previousY] = points[index - 1];
    const [currentX, currentY] = points[index];
    if (previousX !== currentX && previousY !== currentY) {
      throw new Error(`Pipeline animation segment ${index} is not orthogonal`);
    }
    distance += Math.abs(currentX - previousX) + Math.abs(currentY - previousY);
    distances.push(distance);
  }

  return points.map(([x, y], index) => ({
    t: Math.round(start + (distances[index] / distance) * duration),
    v: [x, y, 0],
  }));
}

function animatedValue(frames) {
  return {
    a: 1,
    k: frames.map((frame, index) => {
      if (index === frames.length - 1) return { t: frame.t, s: frame.v };
      return { t: frame.t, s: frame.v, e: frames[index + 1].v, ...linear };
    }),
  };
}

function pipelineSparkle(name, points, start, duration) {
  const end = start + duration;
  return {
    ddd: 0,
    ind: 0,
    ty: 2,
    nm: name,
    refId: SPARKLE_ASSET_ID,
    sr: 1,
    ks: {
      o: animatedValue([
        { t: Math.max(0, start - 3), v: [0] },
        { t: start, v: [100] },
        { t: end - 3, v: [100] },
        { t: end, v: [0] },
      ]),
      r: staticValue(0),
      p: animatedValue(orthogonalFrames(points, start, duration)),
      a: staticValue([SPARKLE_SIZE / 2, SPARKLE_SIZE / 2, 0]),
      s: staticValue([100, 100, 100]),
    },
    ao: 0,
    ip: Math.max(0, start - 3),
    op: Math.min(240, end + 1),
    st: 0,
    bm: 0,
  };
}

function blinkingOpacity(start, end) {
  const frames = [];
  for (let frame = start; frame < end; frame += 10) {
    frames.push({ t: frame, v: [((frame - start) / 10) % 2 === 0 ? 100 : 0] });
  }
  frames.push({ t: end, v: [0] });
  return animatedValue(frames);
}

function statusLayer(name, refId, position, opacity, inPoint, outPoint) {
  return {
    ddd: 0,
    ind: 0,
    ty: 2,
    nm: name,
    refId,
    sr: 1,
    ks: {
      o: opacity,
      r: staticValue(0),
      p: staticValue([...position, 0]),
      a: staticValue([STATUS_SIZE / 2, STATUS_SIZE / 2, 0]),
      s: staticValue([100, 100, 100]),
    },
    ao: 0,
    ip: inPoint,
    op: outPoint,
    st: 0,
    bm: 0,
  };
}

function reportUpdateLayer(position, start) {
  return {
    ddd: 0,
    ind: 0,
    ty: 2,
    nm: "Report healthy update",
    refId: REPORT_UPDATED_ASSET_ID,
    sr: 1,
    ks: {
      o: animatedValue([
        { t: start, v: [0] },
        { t: start + 12, v: [100] },
      ]),
      r: staticValue(0),
      p: staticValue([...position, 0]),
      a: staticValue([0, 0, 0]),
      s: staticValue([100, 100, 100]),
    },
    ao: 0,
    ip: start,
    op: 300,
    st: 0,
    bm: 0,
  };
}

function randomizedStarts(count, minimum, maximum, interval) {
  const candidates = [];
  for (let frame = minimum; frame <= maximum; frame += interval) candidates.push(frame);

  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }

  if (candidates.length < count) throw new Error("Not enough unique sparkle launch frames");
  return candidates.slice(0, count);
}

function createLayers() {
  const packageStarts = randomizedStarts(12, 8, 74, 6);
  const organizationStarts = randomizedStarts(12, 76, 148, 5);
  const repoStarts = randomizedStarts(4, 172, 204, 4);
  const repoDurations = [32, 26, 26, 32];
  const reportArrival = Math.max(...repoStarts.map((start, index) => start + repoDurations[index]));
  const packages = [
    { name: "Supply chain", position: [580, 200], starts: packageStarts.slice(0, 3) },
    { name: "Compliance", position: [580, 252], starts: packageStarts.slice(3, 6) },
    { name: "Security", position: [580, 304], starts: packageStarts.slice(6, 9) },
    { name: "Governance", position: [580, 356], starts: packageStarts.slice(9, 12) },
  ];
  const organizationTargets = [[630, 184], [630, 280], [630, 376]];
  const layers = [
    ...packages.flatMap(({ name, position, starts }) => {
      const dispatch = Math.min(...starts);
      return [
        statusLayer(`${name} pending`, STATUS_PENDING_ASSET_ID, position, blinkingOpacity(dispatch, reportArrival), dispatch, reportArrival),
        statusLayer(`${name} complete`, STATUS_SUCCESS_ASSET_ID, position, staticValue(100), reportArrival, 300),
      ];
    }),
    reportUpdateLayer([930, 144], reportArrival),
    ...packages.flatMap(({ name, position, starts }) => organizationTargets.map(([targetX, targetY], index) =>
      pipelineSparkle(`${name} to Org ${String.fromCharCode(65 + index)}`, [position, [615, position[1]], [615, targetY], [targetX, targetY]], starts[index], index === 2 ? 26 : 20),
    )),
    pipelineSparkle("Org A to Repo 1", [[730, 184], [755, 184], [755, 172], [780, 172]], organizationStarts[0], 24),
    pipelineSparkle("Org A to Repo 2", [[730, 184], [755, 184], [755, 244], [780, 244]], organizationStarts[1], 24),
    pipelineSparkle("Org A to Repo 3", [[730, 184], [755, 184], [755, 316], [780, 316]], organizationStarts[2], 30),
    pipelineSparkle("Org A to Repo 4", [[730, 184], [755, 184], [755, 388], [780, 388]], organizationStarts[3], 34),
    pipelineSparkle("Org B to Repo 1", [[730, 280], [755, 280], [755, 172], [780, 172]], organizationStarts[4], 28),
    pipelineSparkle("Org B to Repo 2", [[730, 280], [755, 280], [755, 244], [780, 244]], organizationStarts[5], 22),
    pipelineSparkle("Org B to Repo 3", [[730, 280], [755, 280], [755, 316], [780, 316]], organizationStarts[6], 22),
    pipelineSparkle("Org B to Repo 4", [[730, 280], [755, 280], [755, 388], [780, 388]], organizationStarts[7], 28),
    pipelineSparkle("Org C to Repo 1", [[730, 376], [755, 376], [755, 172], [780, 172]], organizationStarts[8], 34),
    pipelineSparkle("Org C to Repo 2", [[730, 376], [755, 376], [755, 244], [780, 244]], organizationStarts[9], 30),
    pipelineSparkle("Org C to Repo 3", [[730, 376], [755, 376], [755, 316], [780, 316]], organizationStarts[10], 24),
    pipelineSparkle("Org C to Repo 4", [[730, 376], [755, 376], [755, 388], [780, 388]], organizationStarts[11], 24),
    pipelineSparkle("Repo 1 to outcomes", [[880, 172], [905, 172], [905, 280], [926, 280]], repoStarts[0], repoDurations[0]),
    pipelineSparkle("Repo 2 to outcomes", [[880, 244], [905, 244], [905, 280], [926, 280]], repoStarts[1], repoDurations[1]),
    pipelineSparkle("Repo 3 to outcomes", [[880, 316], [905, 316], [905, 280], [926, 280]], repoStarts[2], repoDurations[2]),
    pipelineSparkle("Repo 4 to outcomes", [[880, 388], [905, 388], [905, 280], [926, 280]], repoStarts[3], repoDurations[3]),
  ];

  layers.forEach((layer, index) => {
    layer.ind = index + 1;
  });
  return layers;
}

function createMobileLayers() {
  const packageStarts = randomizedStarts(12, 8, 74, 6);
  const organizationStarts = randomizedStarts(12, 76, 148, 5);
  const repoStarts = randomizedStarts(4, 172, 204, 4);
  const repoDurations = [32, 26, 26, 32];
  const reportArrival = Math.max(...repoStarts.map((start, index) => start + repoDurations[index]));
  const packages = [
    { name: "Supply chain", position: [57, 128], starts: packageStarts.slice(0, 3) },
    { name: "Compliance", position: [147, 128], starts: packageStarts.slice(3, 6) },
    { name: "Security", position: [237, 128], starts: packageStarts.slice(6, 9) },
    { name: "Governance", position: [327, 128], starts: packageStarts.slice(9, 12) },
  ];
  const organizationTargets = [[75, 216], [195, 216], [315, 216]];
  const layers = [
    ...packages.flatMap(({ name, position, starts }) => {
      const dispatch = Math.min(...starts);
      return [
        statusLayer(`${name} pending`, STATUS_PENDING_ASSET_ID, position, blinkingOpacity(dispatch, reportArrival), dispatch, reportArrival),
        statusLayer(`${name} complete`, STATUS_SUCCESS_ASSET_ID, position, staticValue(100), reportArrival, 300),
      ];
    }),
    reportUpdateLayer([58, 590], reportArrival),
    ...packages.flatMap(({ name, position, starts }) => organizationTargets.map(([targetX, targetY], index) =>
      pipelineSparkle(`${name} to Org ${String.fromCharCode(65 + index)}`, [position, [position[0], 180], [targetX, 180], [targetX, targetY]], starts[index], index === 2 ? 26 : 20),
    )),
    pipelineSparkle("Org A to Repo 1", [[75, 272], [75, 320], [130, 320], [130, 376]], organizationStarts[0], 24),
    pipelineSparkle("Org A to Repo 2", [[75, 272], [75, 320], [260, 320], [260, 376]], organizationStarts[1], 24),
    pipelineSparkle("Org A to Repo 3", [[75, 272], [75, 320], [55, 320], [55, 476], [80, 476]], organizationStarts[2], 30),
    pipelineSparkle("Org A to Repo 4", [[75, 272], [75, 320], [335, 320], [335, 476], [310, 476]], organizationStarts[3], 34),
    pipelineSparkle("Org B to Repo 1", [[195, 272], [195, 320], [130, 320], [130, 376]], organizationStarts[4], 28),
    pipelineSparkle("Org B to Repo 2", [[195, 272], [195, 320], [260, 320], [260, 376]], organizationStarts[5], 22),
    pipelineSparkle("Org B to Repo 3", [[195, 272], [195, 320], [55, 320], [55, 476], [80, 476]], organizationStarts[6], 22),
    pipelineSparkle("Org B to Repo 4", [[195, 272], [195, 320], [335, 320], [335, 476], [310, 476]], organizationStarts[7], 28),
    pipelineSparkle("Org C to Repo 1", [[315, 272], [315, 320], [130, 320], [130, 376]], organizationStarts[8], 34),
    pipelineSparkle("Org C to Repo 2", [[315, 272], [315, 320], [260, 320], [260, 376]], organizationStarts[9], 30),
    pipelineSparkle("Org C to Repo 3", [[315, 272], [315, 320], [55, 320], [55, 476], [80, 476]], organizationStarts[10], 24),
    pipelineSparkle("Org C to Repo 4", [[315, 272], [315, 320], [335, 320], [335, 476], [310, 476]], organizationStarts[11], 24),
    pipelineSparkle("Repo 1 to outcomes", [[80, 404], [40, 404], [40, 530], [195, 530], [195, 590]], repoStarts[0], repoDurations[0]),
    pipelineSparkle("Repo 2 to outcomes", [[310, 404], [350, 404], [350, 530], [195, 530], [195, 590]], repoStarts[1], repoDurations[1]),
    pipelineSparkle("Repo 3 to outcomes", [[130, 504], [130, 554], [195, 554], [195, 590]], repoStarts[2], repoDurations[2]),
    pipelineSparkle("Repo 4 to outcomes", [[260, 504], [260, 554], [195, 554], [195, 590]], repoStarts[3], repoDurations[3]),
  ];

  layers.forEach((layer, index) => {
    layer.ind = index + 1;
  });
  return layers;
}

export default function createAnimationData() {
  return {
    v: "5.12.2",
    fr: 60,
    ip: 0,
    op: 300,
    w: 1240,
    h: 560,
    nm: "Central Agentic Ops pipeline",
    ddd: 0,
    assets: [
      { id: SPARKLE_ASSET_ID, w: SPARKLE_SIZE, h: SPARKLE_SIZE, u: "", p: SPARKLE_DATA_URI, e: 1 },
      { id: STATUS_PENDING_ASSET_ID, w: STATUS_SIZE, h: STATUS_SIZE, u: "", p: STATUS_PENDING_DATA_URI, e: 1 },
      { id: STATUS_SUCCESS_ASSET_ID, w: STATUS_SIZE, h: STATUS_SIZE, u: "", p: STATUS_SUCCESS_DATA_URI, e: 1 },
      { id: REPORT_UPDATED_ASSET_ID, w: REPORT_WIDTH, h: REPORT_HEIGHT, u: "", p: REPORT_UPDATED_DATA_URI, e: 1 },
    ],
    layers: createLayers(),
    markers: [],
  };
}

export function createMobileAnimationData() {
  return {
    v: "5.12.2",
    fr: 60,
    ip: 0,
    op: 300,
    w: 390,
    h: 886,
    nm: "Central Agentic Ops mobile pipeline",
    ddd: 0,
    assets: [
      { id: SPARKLE_ASSET_ID, w: SPARKLE_SIZE, h: SPARKLE_SIZE, u: "", p: SPARKLE_DATA_URI, e: 1 },
      { id: STATUS_PENDING_ASSET_ID, w: STATUS_SIZE, h: STATUS_SIZE, u: "", p: STATUS_PENDING_DATA_URI, e: 1 },
      { id: STATUS_SUCCESS_ASSET_ID, w: STATUS_SIZE, h: STATUS_SIZE, u: "", p: STATUS_SUCCESS_DATA_URI, e: 1 },
      { id: REPORT_UPDATED_ASSET_ID, w: REPORT_WIDTH, h: REPORT_HEIGHT, u: "", p: REPORT_UPDATED_DATA_URI, e: 1 },
    ],
    layers: createMobileLayers(),
    markers: [],
  };
}