// Muted cloth-binding colours for the generated book covers.
const PALETTES = [
  ["#7b2d26", "#5a1f1a"], // burgundy
  ["#224f43", "#18342e"], // library green
  ["#2c3e66", "#1d2a47"], // navy
  ["#8a5a1f", "#654113"], // ochre
  ["#5b3a63", "#3f2745"], // plum
  ["#3d5a5c", "#2a3f41"], // slate teal
  ["#9a4a2b", "#72351e"], // rust
  ["#4a5436", "#343b25"], // olive
];

const hash = (text) => {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h;
};

// The same title always gets the same colour.
export const coverColors = (title = "") => PALETTES[hash(title) % PALETTES.length];
