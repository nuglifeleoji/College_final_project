export type Body3 = {
  mass: number;
  radius: number;
  color: number;
  glow: number;
  position: [number, number, number];
  velocity: [number, number, number];
};

export type SimulationBody = Body3 & {
  position: [number, number, number];
  velocity: [number, number, number];
};

export const THREE_BODY_DT = 0.0038;
export const THREE_BODY_STEPS_PER_FRAME = 6;
export const THREE_BODY_BOUNDS = 1.12;

const G = 1;
const SOFTENING = 0.018;
const BOUNDARY_DAMPING = 0.92;

export const INITIAL_THREE_BODY_STATE: Body3[] = [
  {
    mass: 1.08,
    radius: 0.042,
    color: 0xff2d4f,
    glow: 0xc8102e,
    position: [-0.84, 0.12, -0.28],
    velocity: [0.28, 0.44, 0.31],
  },
  {
    mass: 0.94,
    radius: 0.037,
    color: 0xd4a857,
    glow: 0xb89569,
    position: [0.76, -0.22, 0.34],
    velocity: [0.24, 0.38, -0.42],
  },
  {
    mass: 1.18,
    radius: 0.046,
    color: 0x4ea3ff,
    glow: 0x4ea3ff,
    position: [0.08, 0.36, 0.02],
    velocity: [-0.46, -0.65, 0.06],
  },
];

export function createSimulationBodies(): SimulationBody[] {
  return INITIAL_THREE_BODY_STATE.map((body) => ({
    ...body,
    position: [...body.position],
    velocity: [...body.velocity],
  }));
}

function acceleration(bodies: SimulationBody[], index: number) {
  const acc: [number, number, number] = [0, 0, 0];
  const body = bodies[index];

  for (let j = 0; j < bodies.length; j++) {
    if (j === index) continue;
    const other = bodies[j];
    const dx = other.position[0] - body.position[0];
    const dy = other.position[1] - body.position[1];
    const dz = other.position[2] - body.position[2];
    const distSq = dx * dx + dy * dy + dz * dz + SOFTENING * SOFTENING;
    const invDist = 1 / Math.sqrt(distSq);
    const force = G * other.mass * invDist * invDist * invDist;
    acc[0] += dx * force;
    acc[1] += dy * force;
    acc[2] += dz * force;
  }

  return acc;
}

export function advanceThreeBody(bodies: SimulationBody[], dt = THREE_BODY_DT) {
  const firstAcc = bodies.map((_, i) => acceleration(bodies, i));

  bodies.forEach((body, i) => {
    body.velocity[0] += 0.5 * firstAcc[i][0] * dt;
    body.velocity[1] += 0.5 * firstAcc[i][1] * dt;
    body.velocity[2] += 0.5 * firstAcc[i][2] * dt;
    body.position[0] += body.velocity[0] * dt;
    body.position[1] += body.velocity[1] * dt;
    body.position[2] += body.velocity[2] * dt;
  });

  const secondAcc = bodies.map((_, i) => acceleration(bodies, i));
  bodies.forEach((body, i) => {
    body.velocity[0] += 0.5 * secondAcc[i][0] * dt;
    body.velocity[1] += 0.5 * secondAcc[i][1] * dt;
    body.velocity[2] += 0.5 * secondAcc[i][2] * dt;
    keepInsideBounds(body);
  });
}

function keepInsideBounds(body: SimulationBody) {
  for (let axis = 0; axis < 3; axis++) {
    if (body.position[axis] > THREE_BODY_BOUNDS) {
      body.position[axis] = THREE_BODY_BOUNDS;
      body.velocity[axis] = -Math.abs(body.velocity[axis]) * BOUNDARY_DAMPING;
    } else if (body.position[axis] < -THREE_BODY_BOUNDS) {
      body.position[axis] = -THREE_BODY_BOUNDS;
      body.velocity[axis] = Math.abs(body.velocity[axis]) * BOUNDARY_DAMPING;
    }
  }
}
