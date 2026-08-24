const WHITE = [1, 1, 1, 1];
const OUTLINE = [0.188, 0.212, 0.239, 1];

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

function sparkleShapes() {
  const vertices = [[0, -7], [2, -2], [7, 0], [2, 2], [0, 7], [-2, 2], [-7, 0], [-2, -2]];
  const tangents = vertices.map(() => [0, 0]);
  return [
    { ty: "sh", d: 1, ks: staticValue({ i: tangents, o: tangents, v: vertices, c: true }), nm: "Four-point sparkle" },
    { ty: "fl", c: staticValue(WHITE), o: staticValue(100), r: 1, bm: 0, nm: "White fill" },
    { ty: "st", c: staticValue(OUTLINE), o: staticValue(70), w: staticValue(1), lc: 2, lj: 2, bm: 0, nm: "Contrast outline" },
    { ty: "tr", p: staticValue([0, 0]), a: staticValue([0, 0]), s: staticValue([100, 100]), r: staticValue(0), o: staticValue(100), sk: staticValue(0), sa: staticValue(0) },
  ];
}

function pipelineSparkle(name, points, start, duration) {
  const end = start + duration;
  return {
    ddd: 0,
    ind: 0,
    ty: 4,
    nm: name,
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
      a: staticValue([0, 0, 0]),
      s: staticValue([100, 100, 100]),
    },
    ao: 0,
    shapes: sparkleShapes(),
    ip: Math.max(0, start - 3),
    op: Math.min(240, end + 1),
    st: 0,
    bm: 0,
  };
}

const layers = [
  pipelineSparkle("Control to bounded batch", [[180, 150], [180, 236]], 4, 20),
  pipelineSparkle("Batch forks to Dependabot", [[260, 280], [400, 280], [400, 190], [420, 190]], 28, 32),
  pipelineSparkle("Batch forks to Optimization", [[260, 280], [400, 280], [400, 370], [420, 370]], 28, 32),
  pipelineSparkle("Dependabot to Org A", [[580, 190], [630, 190]], 64, 20),
  pipelineSparkle("Optimization to Org B", [[580, 370], [630, 370]], 64, 20),
  pipelineSparkle("Org A to successful repository", [[730, 190], [750, 190], [750, 150], [780, 150]], 88, 28),
  pipelineSparkle("Org A failure stops at repository", [[730, 190], [750, 190], [750, 230], [780, 230]], 88, 28),
  pipelineSparkle("Org B to successful repository", [[730, 370], [750, 370], [750, 330], [780, 330]], 88, 28),
  pipelineSparkle("Org B to pending repository", [[730, 370], [750, 370], [750, 410], [780, 410]], 88, 28),
  pipelineSparkle("Org A success to report", [[900, 150], [920, 150], [920, 460], [260, 460]], 120, 68),
  pipelineSparkle("Org B success to report", [[900, 330], [920, 330], [920, 460], [260, 460]], 120, 56),
  pipelineSparkle("Pending outcome to report", [[900, 410], [920, 410], [920, 460], [260, 460]], 120, 52),
];

layers.forEach((layer, index) => {
  layer.ind = index + 1;
});

export default {
  v: "5.12.2",
  fr: 60,
  ip: 0,
  op: 240,
  w: 1100,
  h: 560,
  nm: "Central Agentic Ops pipeline",
  ddd: 0,
  assets: [],
  layers,
  markers: [],
};