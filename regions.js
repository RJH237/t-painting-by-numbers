"use strict";

export function findRegions(labels, width, height, colourCount) {
  const visited = new Uint8Array(labels.length);
  const queue = new Int32Array(labels.length);
  const regionByPixel = new Uint16Array(labels.length);
  const regionsByLabel = Array.from({ length: colourCount }, () => []);
  const regions = [];

  for (let start = 0; start < labels.length; start += 1) {
    if (visited[start]) continue;
    const label = labels[start];
    let head = 0;
    let tail = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    const cells = [];
    queue[tail++] = start;
    visited[start] = 1;

    while (head < tail) {
      const index = queue[head++];
      cells.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y < height - 1) visit(index + width);
    }

    const centreX = sumX / cells.length;
    const centreY = sumY / cells.length;
    let anchor = cells[0];
    let distance = Infinity;
    for (const index of cells) {
      const x = index % width;
      const y = Math.floor(index / width);
      const nextDistance = (x - centreX) ** 2 + (y - centreY) ** 2;
      if (nextDistance < distance) {
        distance = nextDistance;
        anchor = index;
      }
    }

    const id = regions.length;
    for (const index of cells) regionByPixel[index] = id;
    regionsByLabel[label].push(id);
    regions.push({
      id,
      label,
      cells,
      minX,
      maxX,
      minY,
      maxY,
      anchorX: anchor % width,
      anchorY: Math.floor(anchor / width),
    });

    function visit(index) {
      if (!visited[index] && labels[index] === label) {
        visited[index] = 1;
        queue[tail++] = index;
      }
    }
  }

  return { regions, regionByPixel, regionsByLabel };
}

export function expandLegacyColours(filledColours, regions) {
  const completed = new Set(filledColours);
  return new Set(regions.filter((region) => completed.has(region.label)).map((region) => region.id));
}
