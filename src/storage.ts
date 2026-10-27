import { openDB } from 'idb';
import type { State } from './data';
import { emptyState } from './data';
import {saveCloud} from './cloud';
const db = openDB('saddle-school-web-v1', 1, { upgrade(d) { d.createObjectStore('records'); d.createObjectStore('videos'); } });
export async function loadLegacyState(): Promise<State> { return (await (await db).get('records', 'state')) ?? structuredClone(emptyState); }
export async function legacyVideo(id:string):Promise<Blob|undefined> {return (await db).get('videos',id);}
export { loadCloud as loadState, downloadVideo as getVideo } from './cloud';
export async function saveState(state: State, video?:{id:string;file:Blob}, _removeVideo?:string) {
  await saveCloud(state,video);
}
export async function replaceState(state: State) { await saveCloud(state); }
export async function photoData(file: File): Promise<string> {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP photo. Convert HEIC photos to JPG first.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Choose a photo under 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    const scale = Math.min(1, 1000 / Math.max(image.width,image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width*scale); canvas.height = Math.round(image.height*scale);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Could not process photo.');
    ctx.drawImage(image,0,0,canvas.width,canvas.height); return canvas.toDataURL('image/jpeg',0.82);
  } finally { URL.revokeObjectURL(url); }
}
