import { createClient } from '@supabase/supabase-js';
import type { State } from './data';
import { emptyState, validateBackup } from './data';
const env = (import.meta as unknown as {env:Record<string,string|undefined>}).env;
const url = env.VITE_SUPABASE_URL || '';
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
function isPublicKey(value:string){if(value.startsWith('sb_publishable_'))return true;try{return JSON.parse(atob(value.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{return false;}}
export const configurationError = !url || !key ? 'Cloud storage is not configured. Add the Supabase URL and publishable key in Render, then redeploy.' : !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) || !isPublicKey(key) ? 'Check the Supabase project URL and publishable key. Never use a secret or service-role key in the app.' : '';
export const cloud = configurationError ? null : createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
let revision: number | null = null;
let account: string | null = null;
async function identity() {
 if(!cloud) throw new Error(configurationError);
 const {data,error}=await cloud.auth.getUser();
 if(error||!data.user)throw new Error('Please sign in again.');
 if(account && account!==data.user.id) revision=null;
 account=data.user.id;
 return data.user.id;
}
export function resetCloudSession(){revision=null;account=null;}
function checkedState(raw: unknown): State {
 const parsed=validateBackup(raw);
 const original=raw as State;
 parsed.rides=parsed.rides.map(r=>{
  const source=original.rides.find(x=>x.id===r.id)!;
  if(source.videoId) {
   if(!/^[a-f0-9]{32}$/.test(source.videoId)||typeof source.videoName!=='string') throw new Error('The saved media reference is invalid.');
   return {...r,videoId:source.videoId,videoName:source.videoName};
  }
  return r;
 });
 return parsed;
}
export async function loadCloud(): Promise<State> {
 const id=await identity();
 const {data:member,error:memberError}=await cloud!.from('saddle_members').select('user_id').eq('user_id',id).maybeSingle();
 if(memberError)throw new Error('Cloud setup is incomplete. Ask the app owner to check the database setup.');
 if(!member)throw new Error('This account has not been invited to Saddle School. Ask the app owner for access.');
 const {data,error}=await cloud!.from('saddle_documents').select('payload,version').eq('user_id',id).maybeSingle();
 if(error)throw new Error('Could not load your cloud records. Check your connection and retry.');
 revision=data?.version??0;
 return data?checkedState(data.payload):structuredClone(emptyState);
}
export async function saveCloud(state: State, video?:{id:string;file:Blob}): Promise<void> {
 const id=await identity();
 if(revision===null)throw new Error('Reload your cloud records before saving.');
 if(video){
  const {error}=await cloud!.storage.from('saddle-media').upload(`${id}/${video.id}`,video.file,{contentType:video.file.type,upsert:false});
  if(error)throw new Error('Video upload failed. Your records have not changed. Please retry.');
 }
 const payload=checkedState(state);
 const {data,error}=await cloud!.rpc('save_saddle_document',{expected_version:revision,new_payload:payload,expected_user_id:id});
 if(error){
  if(error.message.includes('SADDLE_CONFLICT'))throw new Error('Another device saved newer records. Your edit has not overwritten them. Copy your unsaved notes, then reload the page and retry.');
  throw new Error('Cloud save failed. Your edit has not been confirmed. Check your connection and retry; do not assume it was saved.');
 }
 revision=Number(data);
}
export async function downloadVideo(id:string):Promise<Blob>{
 const user=await identity();
 if(!/^[a-f0-9]{32}$/.test(id))throw new Error('Invalid clip ID.');
 const {data,error}=await cloud!.storage.from('saddle-media').download(`${user}/${id}`);
 if(error||!data)throw new Error('Could not load this private clip. Check your connection and retry.');
 return data;
}
export async function listVersions():Promise<{version:number;created_at:string}[]> {
 const user=await identity();
 const {data,error}=await cloud!.from('saddle_versions').select('version,created_at').eq('user_id',user).order('version',{ascending:false}).limit(20);
 if(error)throw new Error('Could not load saved history.');return data??[];
}
export async function loadVersion(version:number):Promise<State>{
 const user=await identity();
 const {data,error}=await cloud!.from('saddle_versions').select('payload').eq('user_id',user).eq('version',version).single();
 if(error)throw new Error('Could not load that version.');return checkedState(data.payload);
}
