import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {createHandler} from './handler.ts';
import type {CritiqueEntry} from './handler.ts';

Deno.serve(createHandler({
 key:()=>Deno.env.get('OPENAI_API_KEY'),
 model:()=>Deno.env.get('OPENAI_MODEL')||'gpt-4.1-mini',
 fetch,
 saveCritique:async(user:string,entry:CritiqueEntry)=>{
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.from('saddle_critiques').insert({...entry,user_id:user}).select('id,created_at').single();
  if(error||!data)throw new Error('Critique save failed');
  return data;
 },
 quota:async(user:string,reserve:boolean)=>{
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await admin.rpc('saddle_critique_quota',{target_user_id:user,reserve});
  if(error||!data||typeof data.allowed!=='boolean'||!Number.isInteger(data.remaining)||!Number.isInteger(data.limit)||!Number.isFinite(data.retryAfterSeconds)||typeof data.resetsAt!=='string')throw new Error('Quota unavailable');
  return data;
 },
 authorize:async(token:string)=>{
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.getUser(token.slice(7));
  if(error||!data.user)return null;
  const member=await client.from('saddle_members').select('user_id').eq('user_id',data.user.id).maybeSingle();
  return !member.error&&member.data?data.user.id:null;
 }
}));
