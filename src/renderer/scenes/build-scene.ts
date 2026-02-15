import { BaseScene } from "./base-scene";
import fragSrc from "../shaders/build.frag";

export class BuildScene extends BaseScene {
  readonly id = "build";
  protected readonly fragSrc = fragSrc;
}
