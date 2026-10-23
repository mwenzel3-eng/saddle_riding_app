export function uid(): string { const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join(""); }
export type Horse = { id: string; name: string; breed: string; birthYear: string; relationship: string; discipline: string; notes: string; tack: string; photo: string; archived: boolean };
export type Rider = { name: string; level: string; goal: string };
export type Ride = { id: string; horseId: string; date: string; minutes: number; gait: string; exercises: string; notes: string; focus: string; balance: string; hands: string; videoId?: string; videoName?: string };
export type State = { version: 1; rider: Rider; horses: Horse[]; rides: Ride[]; completed: string[] };
export const emptyState: State = { version: 1, rider: { name: '', level: 'Beginner', goal: '' }, horses: [], rides: [], completed: [] };
export const newHorse = (): Horse => ({ id: uid(), name: '', breed: '', birthYear: '', relationship: 'Lesson horse', discipline: 'English flatwork', notes: '', tack: '', photo: '', archived: false });
export function localDate(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export const newRide = (horseId: string): Ride => ({ id: uid(), horseId, date: localDate(), minutes: 30, gait: 'Walk / trot', exercises: '', notes: '', focus: '', balance: 'Not assessed', hands: 'Not assessed' });
export function validateBackup(value: unknown): State {
  const fail = (): never => { throw new Error('This is not a valid Saddle School backup. Your current records have not changed.'); };
  if (!value || typeof value !== 'object') return fail();
  const s = value as Record<string, unknown>;
  if (s.version !== 1 || !s.rider || typeof s.rider !== 'object' || !Array.isArray(s.horses) || !Array.isArray(s.rides) || !Array.isArray(s.completed)) return fail();
  const strings = (o: unknown, fields: string[]) => !!o && typeof o === 'object' && fields.every(k => typeof (o as Record<string, unknown>)[k] === 'string');
  if (!strings(s.rider, ['name','level','goal'])) return fail();
  if (!s.horses.every(h => strings(h, ['id','name','breed','birthYear','relationship','discipline','notes','tack','photo']) && typeof h.archived === 'boolean' && h.id && h.name.trim() && (!h.photo || /^data:image\/(jpeg|png|webp);base64,/.test(h.photo)))) return fail();
  const ids = new Set(s.horses.map(h => h.id));
  if (ids.size !== s.horses.length) return fail();
  if (!s.rides.every(r => strings(r, ['id','horseId','date','gait','exercises','notes','focus','balance','hands']) && r.id && ids.has(r.horseId) && Number.isInteger(r.minutes) && r.minutes >= 1 && r.minutes <= 600 && /^\d{4}-\d{2}-\d{2}$/.test(r.date) && !Number.isNaN(Date.parse(r.date)))) return fail();
  if (new Set(s.rides.map(r=>r.id)).size !== s.rides.length || !s.completed.every(x=>typeof x === 'string')) return fail();
  // Restore an allowlisted schema; uploaded clips are deliberately not part of JSON backups.
  const rider = s.rider as Rider;
  return { version: 1, rider: { name:rider.name, level:rider.level, goal:rider.goal }, horses: s.horses.map(h => ({id:h.id, name:h.name, breed:h.breed, birthYear:h.birthYear, relationship:h.relationship, discipline:h.discipline, notes:h.notes, tack:h.tack, photo:h.photo, archived:h.archived})), rides: s.rides.map(r => ({id:r.id, horseId:r.horseId, date:r.date, minutes:r.minutes, gait:r.gait, exercises:r.exercises, notes:r.notes, focus:r.focus, balance:r.balance, hands:r.hands})), completed: [...s.completed] as string[] };
}
export function exportable(state: State): State { return validateBackup(state); }
