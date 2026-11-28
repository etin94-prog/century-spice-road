// Decode only artwork requested by the active table. Geometry stays in table coordinates.
const images = new Map();
function artwork(name) {
  if (!images.has(name)) {
    const image = new Image();
    image.src = new URL('./art/worldwide/table/' + name + '.webp', import.meta.url);
    images.set(name, image);
  }
  const image = images.get(name);
  return image.complete && image.naturalWidth ? image : null;
}
export function miniature(g, name, x, y, width, height) {
  const image = artwork(name);
  if (!image) return false;
  const scale = Math.min(width / image.width, height / image.height);
  const w = image.width * scale, h = image.height * scale;
  g.drawImage(image, x - w / 2, y - h / 2, w, h);
  return true;
}
export function material(g, name, opacity, x = 0, y = 0, width = 600, height = 360) {
  const image = artwork(name);
  if (!image) return;
  g.save();
  g.globalAlpha = opacity;
  g.drawImage(image, x, y, width, height);
  g.restore();
}
