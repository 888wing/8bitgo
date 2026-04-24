import type { AssetManifest } from "../8bitgo/core/assetManifest";
import { spriteForgeManifest } from "./spriteForge.generated";

export const assetManifest: AssetManifest = {
  assets: [...spriteForgeManifest.assets],
  animations: [...(spriteForgeManifest.animations ?? [])]
};
