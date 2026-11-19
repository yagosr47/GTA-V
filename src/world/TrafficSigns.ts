import * as T from "three";
import { box, lit, mat, tex } from "../utils/TextureGenerator";
export const signalized = (x: number, z: number) =>
  (Math.round(x / 52) + Math.round(z / 52)) % 2 === 0;
export function green(vertical: boolean, time: number) {
  const t = time % 18;
  return vertical ? t < 8 : t >= 9 && t < 17;
}
export class TrafficSigns {
  private red = [lit("#fa5260"), lit("#fa5260")];
  private go = [lit("#65ffb0"), lit("#65ffb0")];
  constructor(g: T.Group) {
    const pole = mat("#596172"),
      caseMat = mat("#252733"),
      sign = new T.MeshBasicMaterial({
        map: tex(96, 96, (c) => {
          c.fillStyle = "#b83846";
          c.fillRect(0, 0, 96, 96);
          c.strokeStyle = "#ffead6";
          c.lineWidth = 4;
          c.strokeRect(3, 3, 90, 90);
          c.fillStyle = "#fff5de";
          c.textAlign = "center";
          c.font = "bold 31px sans-serif";
          c.fillText("PARE", 48, 59);
        }),
      });
    const stripe = lit("#c6b9b7");
    for (let x = -208; x < 208; x += 52)
      for (let z = -208; z < 208; z += 52)
        for (const [dx, dz] of [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ]) {
          let px = x - dx * 12 - dz * 9.9,
            pz = z - dz * 12 + dx * 9.9,
            axis = dx === 0 ? 0 : 1;
          box(g, px, 1.7, pz, 0.095, 3.4, 0.095, pole);
          let signaled = signalized(x, z);
          let face = box(
            g,
            px,
            3.25,
            pz,
            signaled ? 0.56 : 0.98,
            signaled ? 1.12 : 0.89,
            0.18,
            signaled ? caseMat : sign,
          );
          face.rotation.y = Math.atan2(-dx, -dz);
          if (signaled)
            for (let k of [0, 1])
              box(
                g,
                px - dx * 0.12,
                3.54 - k * 0.58,
                pz - dz * 0.12,
                dx ? 0.1 : 0.32,
                0.32,
                dx ? 0.32 : 0.1,
                k ? this.go[axis] : this.red[axis],
              );
          box(
            g,
            x - dx * 11.9 - dz * 3.9,
            0.035,
            z - dz * 11.9 + dx * 3.9,
            dx ? 0.25 : 7,
            0.015,
            dx ? 7 : 0.25,
            stripe,
          );
        }
  }
  update(t: number) {
    for (let i = 0; i < 2; i++) {
      let open = green(!i, t);
      this.go[i].color.set(open ? "#50ff9b" : "#193e35");
      this.red[i].color.set(open ? "#4a2633" : "#ff394b");
    }
  }
}
