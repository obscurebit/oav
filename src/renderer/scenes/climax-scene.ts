import { BaseScene } from "./base-scene";
import fragSrc from "../shaders/climax.frag";

export class ClimaxScene extends BaseScene {
  readonly id = "climax";
  protected readonly fragSrc = fragSrc;
}
