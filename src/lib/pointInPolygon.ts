import { LOTES, type Lote } from "./lots";

function raycast(point: [number, number], polygon: [number, number][]): boolean {
  const [px, py] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function detectLote(lat: number, lng: number): Lote | null {
  for (const lote of LOTES) {
    if (lote.loteNum && raycast([lat, lng], lote.coords)) return lote;
  }
  return null;
}
