import { BaseScene } from "./base-scene";
import fragSrc from "../shaders/intro.frag";

export class IntroScene extends BaseScene {
  readonly id = "intro";
  protected readonly fragSrc = fragSrc;
}
