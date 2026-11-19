export const BLOCK = 52,
  ROAD_HALF = 8.5,
  WALK = 9.45;
// Every node belongs to an actual block. Short edges cross a street; long ones follow the curb.
export function sidewalks() {
  const graph = new Map<string, string[]>();
  const key = (x: number, z: number) => `${x.toFixed(2)},${z.toFixed(2)}`;
  const link = (a: string, b: string) => {
    if (!graph.has(a)) graph.set(a, []);
    if (!graph.has(b)) graph.set(b, []);
    graph.get(a)!.push(b);
    graph.get(b)!.push(a);
  };
  for (let i = -4; i < 4; i++)
    for (let j = -4; j < 4; j++) {
      let x = i * BLOCK,
        z = j * BLOCK,
        l = x + WALK,
        r = x + BLOCK - WALK,
        t = z + WALK,
        b = z + BLOCK - WALK;
      link(key(l, t), key(r, t));
      link(key(l, b), key(r, b));
      link(key(l, t), key(l, b));
      link(key(r, t), key(r, b));
      if (i < 3) {
        link(key(r, t), key(r + 2 * WALK, t));
        link(key(r, b), key(r + 2 * WALK, b));
      }
      if (j < 3) {
        link(key(l, b), key(l, b + 2 * WALK));
        link(key(r, b), key(r, b + 2 * WALK));
      }
    }
  return graph;
}
export function inLot(x: number, z: number, w: number, d: number) {
  const margin = (v: number) => Math.abs(v - Math.round(v / BLOCK) * BLOCK);
  return margin(x) - w / 2 >= ROAD_HALF && margin(z) - d / 2 >= ROAD_HALF;
}
