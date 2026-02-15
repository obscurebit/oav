import { BaseScene } from "./base-scene";
import fragSrc from "../shaders/outro.frag";

export class OutroScene extends BaseScene {
  readonly id = "outro";
  protected readonly fragSrc = fragSrc;
}
