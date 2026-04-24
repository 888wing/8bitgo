import Phaser from "phaser";

type PixelPalette = Record<string, string>;

interface PixelTextureSpec {
  key: string;
  pixels: readonly string[];
  palette: PixelPalette;
}

function paintPixelTexture(scene: Phaser.Scene, spec: PixelTextureSpec): void {
  if (scene.textures.exists(spec.key)) {
    return;
  }

  const width = spec.pixels[0]?.length ?? 0;
  const height = spec.pixels.length;
  const texture = scene.textures.createCanvas(spec.key, width, height);

  if (!texture) {
    throw new Error(`Unable to create pixel texture: ${spec.key}`);
  }

  const context = texture.getContext();
  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = false;

  for (let y = 0; y < height; y += 1) {
    const row = spec.pixels[y] ?? "";
    for (let x = 0; x < width; x += 1) {
      const colorKey = row[x] ?? ".";
      const color = spec.palette[colorKey];
      if (!color) {
        continue;
      }

      context.fillStyle = color;
      context.fillRect(x, y, 1, 1);
    }
  }

  texture.refresh();
}

export function ensureStarterPixelTextures(scene: Phaser.Scene): void {
  const palette = {
    ".": "",
    B: "#060813",
    C: "#34e7ff",
    D: "#101827",
    E: "#ff6b86",
    G: "#ffd454",
    L: "#b8ff61",
    P: "#f45dff",
    W: "#f7fbff",
    X: "#23030a"
  };

  const textures: PixelTextureSpec[] = [
    {
      key: "8bitgo.player",
      palette,
      pixels: [
        "..WWWW..",
        ".WCCCCW.",
        "WCCWWCCW",
        "WCCCCCCW",
        ".WCDDCW.",
        "..WCCW..",
        ".W.WW.W.",
        "W..WW..W"
      ]
    },
    {
      key: "8bitgo.gem",
      palette,
      pixels: [".GGG.", "GWWWG", "GGLGG", ".GLG.", "..G.."]
    },
    {
      key: "8bitgo.enemy",
      palette,
      pixels: [
        "E..XX..E",
        ".EXEEXE.",
        "EEEEEEEE",
        "EEWEEWEE",
        "EEEEEEEE",
        ".EEXXE.",
        "E.E..E.E",
        "X......X"
      ]
    },
    {
      key: "8bitgo.exit.closed",
      palette,
      pixels: [
        "BBBBBBBBBB",
        "BCCCCCCCCB",
        "BCDDBBDDCB",
        "BCDBBBBDCB",
        "BCDBBBBDCB",
        "BCDBBBBDCB",
        "BCDDWWDDCB",
        "BCCCCCCCCB",
        "BBBBBBBBBB",
        "....BB...."
      ]
    },
    {
      key: "8bitgo.exit.open",
      palette,
      pixels: [
        "LLLLLLLLLL",
        "LWWWWWWWWL",
        "LWLLLLLLWL",
        "LWLLPPLLWL",
        "LWLPBBPLWL",
        "LWLPBBPLWL",
        "LWLLPPLLWL",
        "LWLLLLLLWL",
        "LWWWWWWWWL",
        "LLLLLLLLLL"
      ]
    },
    {
      key: "8bitgo.terminal",
      palette,
      pixels: [
        "BBBBBBBB",
        "BCCCCCCB",
        "BCWWWWCB",
        "BCWPPWCB",
        "BCWPPWCB",
        "BCWWWWCB",
        "BCCCCCCB",
        "BBBBBBBB"
      ]
    },
    {
      key: "8bitgo.glitch",
      palette,
      pixels: [
        "P..P..P.",
        ".P.W.P..",
        "..PWP..P",
        "PPPWWPPP",
        "..PWP..P",
        ".P.W.P..",
        "P..P..P.",
        "..P..P.."
      ]
    }
  ];

  for (const texture of textures) {
    paintPixelTexture(scene, texture);
  }
}
