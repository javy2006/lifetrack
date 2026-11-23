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
export function geo(): Record<'box' | 'cyl' | 'cylLow' | 'sphere' | 'dome' | 'cone' | 'prism' | 'ring' | 'gem' | 'plane' | 'frustum', BufferGeometry> {
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
    // Tapered cylinder (skirts, vases): top radius 0.3, bottom 0.5, height 1.
    frustum: new CylinderGeometry(0.3, 0.5, 1, 20),
    // Flat 1x1 decal lying on the ground (faces +Y).
    plane: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  };
  return geometries as ReturnType<typeof geo>;
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

type IconDrawer = (g: CanvasRenderingContext2D) => void;
/** Simple category glyphs drawn in a 100x100 box (stroke/fill colour set by the caller). */
const ICONS: Record<string, IconDrawer> = {
  salary: (g) => { g.beginPath(); g.arc(50, 50, 36, 0, Math.PI * 2); g.stroke(); g.font = '800 34px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RM', 50, 53); },
  savings: (g) => { g.save(); g.strokeStyle = '#f7f3e8'; g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(50, 76 - i * 20, 34, 13, 0, 0, Math.PI * 2); g.fill(); g.stroke(); } g.restore(); },
  medical: (g) => { g.fillRect(38, 14, 24, 72); g.fillRect(14, 38, 72, 24); },
  accident: (g) => { g.beginPath(); g.moveTo(50, 10); g.lineTo(92, 86); g.lineTo(8, 86); g.closePath(); g.stroke(); g.fillRect(45, 36, 10, 28); g.fillRect(45, 70, 10, 9); },
  family: (g) => { g.beginPath(); g.moveTo(50, 12); g.lineTo(90, 48); g.lineTo(78, 48); g.lineTo(78, 88); g.lineTo(22, 88); g.lineTo(22, 48); g.lineTo(10, 48); g.closePath(); g.fill(); },
  protection: (g) => { g.beginPath(); g.moveTo(50, 8); g.lineTo(86, 22); g.quadraticCurveTo(84, 70, 50, 92); g.quadraticCurveTo(16, 70, 14, 22); g.closePath(); g.fill(); },
  lucky: (g) => { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 17 : 42, a = -Math.PI / 2 + (i * Math.PI) / 5; g.lineTo(50 + Math.cos(a) * r, 52 + Math.sin(a) * r); } g.closePath(); g.fill(); },
  rest: (g) => { g.beginPath(); g.arc(50, 50, 36, 0.35 * Math.PI, 1.65 * Math.PI); g.arc(66, 42, 30, 1.55 * Math.PI, 0.45 * Math.PI, true); g.closePath(); g.fill(); },
};

/** Painted tile face: category icon above the caption, dark ink on transparent. */
export function captionTexture(text: string, ink: string, category = ''): Texture {
  return canvasTexture(`caption|${text}|${ink}|${category}`, 256, 256, (g, w) => {
    g.fillStyle = ink; g.strokeStyle = ink; g.lineWidth = 9; g.lineJoin = 'round';
    const icon = ICONS[category];
    if (icon) { g.save(); g.translate(w / 2 - 46, 22); g.scale(0.92, 0.92); icon(g); g.restore(); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // Non-Latin captions (Chinese, Tamil) start larger: two CJK characters at the Latin size read too small.
    let size = /[^\u0000-\u007f]/.test(text) ? 66 : 50;
    const font = () => `800 ${size}px system-ui, -apple-system, 'Segoe UI', 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans Tamil', 'Nirmala UI', 'Latha', sans-serif`;
    g.font = font();
    while (g.measureText(text).width > w - 20 && size > 22) { size -= 2; g.font = font(); }
    g.fillText(text, w / 2, 178);
  });
}

export function disposeKit(): void {
  if (geometries) Object.values(geometries).forEach((g) => g.dispose());
  geometries = null;
  materials.forEach((m: Material) => m.dispose()); materials.clear();
  textures.forEach((t) => t.dispose()); textures.clear();
}
