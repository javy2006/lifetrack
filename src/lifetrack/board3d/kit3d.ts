/**
 * Shared low-poly building blocks for the 3D board: one unit geometry per shape and
 * one material per colour, so the miniature city stays at a handful of GPU buffers.
 * Everything here is presentation-only and is released by `disposeKit()` when the
 * 3D board unmounts.
 */
import { BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, MeshBasicMaterial, MeshStandardMaterial, OctahedronGeometry, PlaneGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, type BufferGeometry, type Material, type Texture } from 'three';

let geometries: Record<string, BufferGeometry> | null = null;
const materials = new Map<string, MeshStandardMaterial | MeshBasicMaterial>();
const textures = new Map<string, Texture>();

/** Unit shapes: box 1x1x1, cylinder radius 0.5 height 1, sphere radius 0.5, cone radius 0.5 height 1. */
export function geo(): Record<'box' | 'cyl' | 'cylLow' | 'sphere' | 'dome' | 'cone' | 'prism' | 'ring' | 'gem' | 'plane', BufferGeometry> {
  geometries ??= {
    box: new BoxGeometry(1, 1, 1),
    cyl: new CylinderGeometry(0.5, 0.5, 1, 18),
    cylLow: new CylinderGeometry(0.5, 0.5, 1, 8),
    sphere: new SphereGeometry(0.5, 14, 10),
    dome: new SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    cone: new ConeGeometry(0.5, 1, 8),
    // Pitched roof: a 3-sided cylinder lying along X, apex up, normalised to x/z ±0.5 and y 0..1.
    prism: new CylinderGeometry(0.5, 0.5, 1, 3).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2).translate(0, 0.25, 0).scale(1, 1 / 0.75, 1 / 0.866),
    ring: new TorusGeometry(0.5, 0.06, 6, 28),
    gem: new OctahedronGeometry(0.5, 0),
    // Flat 1x1 decal lying on the ground (faces +Y).
    plane: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  };
  return geometries as never;
}

/** Cached matte material for a colour (optionally emissive). */
export function mat(color: string, opts: { emissive?: string; emissiveIntensity?: number; roughness?: number; metalness?: number; map?: Texture } = {}): MeshStandardMaterial {
  const key = `${color}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? 0}|${opts.roughness ?? 0.78}|${opts.metalness ?? 0}|${opts.map?.uuid ?? ''}`;
  let m = materials.get(key) as MeshStandardMaterial | undefined;
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.78, metalness: opts.metalness ?? 0, emissive: opts.emissive ?? '#000000', emissiveIntensity: opts.emissiveIntensity ?? 0, map: opts.map ?? null });
    materials.set(key, m);
  }
  return m;
}

/** Cached unlit decal material (tile captions): transparent, no depth write, not tone mapped. */
export function decal(map: Texture): MeshBasicMaterial {
  const key = `decal|${map.uuid}`;
  let m = materials.get(key) as MeshBasicMaterial | undefined;
  if (!m) { m = new MeshBasicMaterial({ map, transparent: true, depthWrite: false, toneMapped: false }); materials.set(key, m); }
  return m;
}

/** Cached canvas texture; `draw` paints it once. */
export function canvasTexture(key: string, width: number, height: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): Texture {
  let t = textures.get(key);
  if (!t) {
    const c = document.createElement('canvas');
    c.width = width; c.height = height;
    const g = c.getContext('2d');
    if (g) draw(g, width, height);
    t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    textures.set(key, t);
  }
  return t;
}

/** Tower facade: white mullions (tinted by the material colour) around darker glass. */
export function windowTexture(): Texture {
  return canvasTexture('windows', 64, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const cols = 4, rows = 8, cw = w / cols, rh = h / rows;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      g.fillStyle = (r * 7 + c * 3) % 5 === 0 ? '#fff4cf' : '#5f7d8e';
      g.fillRect(c * cw + 3, r * rh + 4, cw - 6, rh - 7);
    }
  });
}

/** Painted tile caption (dark ink on transparent), readable from the isometric camera. */
export function captionTexture(text: string, ink: string): Texture {
  return canvasTexture(`caption|${text}|${ink}`, 256, 80, (g, w, h) => {
    g.fillStyle = ink;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 46;
    g.font = `800 ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    while (g.measureText(text).width > w - 16 && size > 20) { size -= 2; g.font = `800 ${size}px system-ui, -apple-system, 'Segoe UI', sans-serif`; }
    g.fillText(text, w / 2, h / 2 + 2);
  });
}

export function disposeKit(): void {
  if (geometries) Object.values(geometries).forEach((g) => g.dispose());
  geometries = null;
  materials.forEach((m: Material) => m.dispose()); materials.clear();
  textures.forEach((t) => t.dispose()); textures.clear();
}
