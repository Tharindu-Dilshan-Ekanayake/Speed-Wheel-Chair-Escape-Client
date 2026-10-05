// Clip coincident and buried box faces before batching. Colliders keep the original
// boxes; only the visible surface is trimmed, including across material groups.
const EPS = 1e-5
const AXES = ['x', 'y', 'z']
const SIZE = ['w', 'h', 'd']
function subtract(rect, cut) {
  const [a, b, c, d] = rect
  const l = Math.max(a, cut[0]), r = Math.min(b, cut[1])
  const t = Math.max(c, cut[2]), u = Math.min(d, cut[3])
  if (r - l < EPS || u - t < EPS) return [rect]
  return [[a, l, c, d], [r, b, c, d], [l, r, c, t], [l, r, u, d]].filter(([x, y, z, w]) => y - x > EPS && w - z > EPS)
}

export function boxFaces(boxes) {
  return boxes.map((box, index) => {
    if (box.sphere || box.barrel) return null
    const faces = []
    for (let axis = 0; axis < 3; axis++) {
      const u = (axis + 1) % 3, v = (axis + 2) % 3
      for (const sign of [-1, 1]) {
        const plane = box[AXES[axis]] + sign * box[SIZE[axis]] / 2
        let rects = [[box[AXES[u]] - box[SIZE[u]] / 2, box[AXES[u]] + box[SIZE[u]] / 2, box[AXES[v]] - box[SIZE[v]] / 2, box[AXES[v]] + box[SIZE[v]] / 2]]
        if (box.kind !== 'deco') {
          for (let j = 0; j < boxes.length && rects.length; j++) {
            const other = boxes[j]
            // Decorative strips and lights must never punch holes in solid geometry.
            if (index === j || other.kind === 'deco' || other.sphere || other.barrel) continue
            const low = other[AXES[axis]] - other[SIZE[axis]] / 2
            const high = other[AXES[axis]] + other[SIZE[axis]] / 2
            const buried = sign > 0 ? plane >= low - EPS && plane < high - EPS : plane > low + EPS && plane <= high + EPS
            const coincident = j > index && Math.abs(plane - (sign > 0 ? high : low)) < EPS
            if (!buried && !coincident) continue
            const cut = [other[AXES[u]] - other[SIZE[u]] / 2, other[AXES[u]] + other[SIZE[u]] / 2, other[AXES[v]] - other[SIZE[v]] / 2, other[AXES[v]] + other[SIZE[v]] / 2]
            rects = rects.flatMap((rect) => subtract(rect, cut))
          }
        }
        for (const rect of rects) faces.push({ axis, u, v, sign, plane, rect })
      }
    }
    return faces
  })
}
