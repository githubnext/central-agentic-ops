// Colors are resolved to a concrete light/dark palette in JS (rather than relying on an
// embedded `@media (prefers-color-scheme: dark)` stylesheet inside each SVG) because Safari
// does not evaluate that media query for SVGs referenced via a data URI or `<image>`/`<img>`
// element: https://bugs.webkit.org/show_bug.cgi?id=199134
const SPARKLE_ASSET_ID = "octicon-sparkle-fill";
const SPARKLE_SIZE = 16;
const sparkleSvg = (dark) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="${dark ? "#a371f7" : "#8250df"}" d="M7.53 1.282a.5.5 0 0 1 .94 0l.478 1.306a7.492 7.492 0 0 0 4.464 4.464l1.305.478a.5.5 0 0 1 0 .94l-1.305.478a7.492 7.492 0 0 0-4.464 4.464l-.478 1.305a.5.5 0 0 1-.94 0l-.478-1.305a7.492 7.492 0 0 0-4.464-4.464L1.282 8.47a.5.5 0 0 1 0-.94l1.306-.478a7.492 7.492 0 0 0 4.464-4.464Z"/></svg>`;
const sparkleDataUri = (dark) => `data:image/svg+xml,${encodeURIComponent(sparkleSvg(dark))}`;
const STATUS_PENDING_ASSET_ID = "status-pending";
const STATUS_SUCCESS_ASSET_ID = "status-success";
const STATUS_SIZE = 20;
const statusPendingSvg = (dark) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" stroke-width="3" fill="${dark ? "#d29922" : "#bf8700"}" stroke="${dark ? "#161b22" : "#fff"}"/></svg>`;
const statusSuccessSvg = (dark) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" stroke-width="3" fill="${dark ? "#3fb950" : "#1f883d"}" stroke="${dark ? "#161b22" : "#fff"}"/></svg>`;
const statusPendingDataUri = (dark) => `data:image/svg+xml,${encodeURIComponent(statusPendingSvg(dark))}`;
const statusSuccessDataUri = (dark) => `data:image/svg+xml,${encodeURIComponent(statusSuccessSvg(dark))}`;
const REPORT_UPDATED_ASSET_ID = "report-updated";
const REPORT_WIDTH = 274;
const REPORT_HEIGHT = 272;
const reportUpdatedSvg = (dark) => {
  const surface = dark ? "#161b22" : "#fff";
  const foreground = dark ? "#f0f6fc" : "#1f2328";
  const muted = dark ? "#8b949e" : "#656d76";
  const border = dark ? "#30363d" : "#d0d7de";
  const success = dark ? "#3fb950" : "#1f883d";
  const danger = dark ? "#f85149" : "#cf222e";
  const attention = dark ? "#d29922" : "#bf8700";
  const accent = dark ? "#a371f7" : "#8250df";
  const info = dark ? "#58a6ff" : "#0969da";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="274" height="272" viewBox="0 0 274 272"><g font-family="-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"><rect width="274" height="272" rx="6" fill="${surface}" stroke="${border}"/><text x="16" y="32" fill="${muted}" font-size="8" font-weight="700">REPORT EXCERPT</text><text x="258" y="32" fill="${muted}" text-anchor="end" font-size="8" font-weight="700">2026-08-27 07:07:56 UTC</text><text x="16" y="54" fill="${foreground}" font-size="13" font-weight="600">Execution health</text><path d="M16 63H258" fill="none" stroke="${border}"/><text x="16" y="81" fill="${muted}" font-size="8" font-weight="700">RUNS · 24H</text><text x="16" y="100" fill="${foreground}" font-size="15" font-weight="700">748</text><text x="146" y="81" fill="${muted}" font-size="8" font-weight="700">FAILURE RATE</text><text x="146" y="100" fill="${danger}" font-size="15" font-weight="700">0.0%</text><rect x="16" y="112" width="242" height="7" rx="3.5" fill="${border}"/><path d="M19.5 115.5H246" fill="none" stroke="${success}" stroke-width="7" stroke-linecap="round"/><path d="M246 115.5H254.5" fill="none" stroke="${attention}" stroke-width="7" stroke-linecap="round"/><text x="16" y="142" fill="${muted}" font-size="8" font-weight="700">VALUE OVER TIME</text><g fill="none" stroke="${border}" stroke-width=".7" opacity=".7"><path d="M16 166H258M16 190H258M16 214H258M16 238H258"/><path d="M76 158V244M137 158V244M198 158V244"/></g><path d="M44 158V244" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="3 2"/><text x="48" y="165" fill="${accent}" font-size="8" font-weight="700">ADOPTED</text><path d="M16 224L36 227L56 204L76 209L97 193L117 199L137 175L157 193L178 171L198 179L218 174L238 181L258 163" fill="none" stroke="${success}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 184L36 206L56 211L76 225L97 240L117 221L137 200L157 237L178 216L198 232L218 210L238 226L258 204" fill="none" stroke="${info}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
};
const reportUpdatedDataUri = (dark) => `data:image/svg+xml,${encodeURIComponent(reportUpdatedSvg(dark))}`;

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
  const packageStarts = randomizedStarts(6, 8, 62, 6);
  const organizationStarts = randomizedStarts(12, 76, 148, 5);
  const repoStarts = randomizedStarts(4, 172, 204, 4);
  const repoDurations = [32, 26, 26, 32];
  const reportArrival = Math.max(...repoStarts.map((start, index) => start + repoDurations[index]));
  const dependabotDispatch = Math.min(...packageStarts.slice(0, 3));
  const optimizationDispatch = Math.min(...packageStarts.slice(3));
  const layers = [
    statusLayer("Dependabot pending", STATUS_PENDING_ASSET_ID, [580, 240], blinkingOpacity(dependabotDispatch, reportArrival), dependabotDispatch, reportArrival),
    statusLayer("Optimization pending", STATUS_PENDING_ASSET_ID, [580, 320], blinkingOpacity(optimizationDispatch, reportArrival), optimizationDispatch, reportArrival),
    statusLayer("Dependabot complete", STATUS_SUCCESS_ASSET_ID, [580, 240], staticValue(100), reportArrival, 300),
    statusLayer("Optimization complete", STATUS_SUCCESS_ASSET_ID, [580, 320], staticValue(100), reportArrival, 300),
    reportUpdateLayer([930, 144], reportArrival),
    pipelineSparkle("Dependabot to Org A", [[580, 240], [615, 240], [615, 184], [630, 184]], packageStarts[0], 20),
    pipelineSparkle("Dependabot to Org B", [[580, 240], [615, 240], [615, 280], [630, 280]], packageStarts[1], 20),
    pipelineSparkle("Dependabot to Org C", [[580, 240], [615, 240], [615, 376], [630, 376]], packageStarts[2], 26),
    pipelineSparkle("Optimization to Org A", [[580, 320], [615, 320], [615, 184], [630, 184]], packageStarts[3], 26),
    pipelineSparkle("Optimization to Org B", [[580, 320], [615, 320], [615, 280], [630, 280]], packageStarts[4], 20),
    pipelineSparkle("Optimization to Org C", [[580, 320], [615, 320], [615, 376], [630, 376]], packageStarts[5], 20),
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
  const packageStarts = randomizedStarts(6, 8, 62, 6);
  const organizationStarts = randomizedStarts(12, 76, 148, 5);
  const repoStarts = randomizedStarts(4, 172, 204, 4);
  const repoDurations = [32, 26, 26, 32];
  const reportArrival = Math.max(...repoStarts.map((start, index) => start + repoDurations[index]));
  const dependabotDispatch = Math.min(...packageStarts.slice(0, 3));
  const optimizationDispatch = Math.min(...packageStarts.slice(3));
  const layers = [
    statusLayer("Dependabot pending", STATUS_PENDING_ASSET_ID, [107, 128], blinkingOpacity(dependabotDispatch, reportArrival), dependabotDispatch, reportArrival),
    statusLayer("Optimization pending", STATUS_PENDING_ASSET_ID, [283, 128], blinkingOpacity(optimizationDispatch, reportArrival), optimizationDispatch, reportArrival),
    statusLayer("Dependabot complete", STATUS_SUCCESS_ASSET_ID, [107, 128], staticValue(100), reportArrival, 300),
    statusLayer("Optimization complete", STATUS_SUCCESS_ASSET_ID, [283, 128], staticValue(100), reportArrival, 300),
    reportUpdateLayer([58, 590], reportArrival),
    pipelineSparkle("Dependabot to Org A", [[107, 128], [107, 180], [75, 180], [75, 216]], packageStarts[0], 20),
    pipelineSparkle("Dependabot to Org B", [[107, 128], [107, 180], [195, 180], [195, 216]], packageStarts[1], 20),
    pipelineSparkle("Dependabot to Org C", [[107, 128], [107, 180], [315, 180], [315, 216]], packageStarts[2], 26),
    pipelineSparkle("Optimization to Org A", [[283, 128], [283, 180], [75, 180], [75, 216]], packageStarts[3], 26),
    pipelineSparkle("Optimization to Org B", [[283, 128], [283, 180], [195, 180], [195, 216]], packageStarts[4], 20),
    pipelineSparkle("Optimization to Org C", [[283, 128], [283, 180], [315, 180], [315, 216]], packageStarts[5], 20),
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

function pipelineAssets(prefersDark) {
  return [
    { id: SPARKLE_ASSET_ID, w: SPARKLE_SIZE, h: SPARKLE_SIZE, u: "", p: sparkleDataUri(prefersDark), e: 1 },
    { id: STATUS_PENDING_ASSET_ID, w: STATUS_SIZE, h: STATUS_SIZE, u: "", p: statusPendingDataUri(prefersDark), e: 1 },
    { id: STATUS_SUCCESS_ASSET_ID, w: STATUS_SIZE, h: STATUS_SIZE, u: "", p: statusSuccessDataUri(prefersDark), e: 1 },
    { id: REPORT_UPDATED_ASSET_ID, w: REPORT_WIDTH, h: REPORT_HEIGHT, u: "", p: reportUpdatedDataUri(prefersDark), e: 1 },
  ];
}

export default function createAnimationData(prefersDark = false) {
  return {
    v: "5.12.2",
    fr: 60,
    ip: 0,
    op: 300,
    w: 1240,
    h: 560,
    nm: "Central Agentic Ops pipeline",
    ddd: 0,
    assets: pipelineAssets(prefersDark),
    layers: createLayers(),
    markers: [],
  };
}

export function createMobileAnimationData(prefersDark = false) {
  return {
    v: "5.12.2",
    fr: 60,
    ip: 0,
    op: 300,
    w: 390,
    h: 886,
    nm: "Central Agentic Ops mobile pipeline",
    ddd: 0,
    assets: pipelineAssets(prefersDark),
    layers: createMobileLayers(),
    markers: [],
  };
}