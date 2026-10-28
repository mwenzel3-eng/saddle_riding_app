import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {SignedDataVerifier,Environment} from 'npm:@apple/app-store-server-library@3.1.0';
import {Buffer} from 'node:buffer';
export const admin=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
export async function actor(req:Request){
 const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token)throw new Error('Please sign in again.');
 const client=admin();const {data,error}=await client.auth.getUser(token);if(error||!data.user)throw new Error('Please sign in again.');
 const membership=await client.from('saddle_members').select('user_id').eq('user_id',data.user.id).maybeSingle();if(membership.error||!membership.data)throw new Error('A Saddle Up account is required.');return data.user.id;
}
export async function grant(user:string,item:string,receipt:string){const {error}=await admin().rpc('saddle_grant_decoration',{target_user:user,target_item:item,receipt});if(error)throw new Error('Purchase could not be saved. Use Restore purchases to retry.');}
export async function revoke(receipt:string){const {error}=await admin().rpc('saddle_revoke_decoration',{receipt});if(error)throw new Error('Purchase revocation failed');}
export async function stripe(path:string,params?:URLSearchParams){const secret=Deno.env.get('STRIPE_SECRET_KEY');if(!secret)throw new Error('Stripe checkout is not configured yet.');const response=await fetch(`https://api.stripe.com/v1/${path}`,{method:params?'POST':'GET',headers:{Authorization:`Bearer ${secret}`,...(params?{'Content-Type':'application/x-www-form-urlencoded'}:{})},body:params,signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('The payment service is unavailable. Please try later.');return response.json();}
let roots:Promise<Buffer[]>|undefined;
async function verifiers(){
 const appId=Number(Deno.env.get('APPLE_APP_ID'));if(!Number.isSafeInteger(appId)||appId<=0)throw new Error('Apple purchases are not configured yet.');
 if(!roots)roots=Promise.all(['https://www.apple.com/certificateauthority/AppleRootCA-G3.cer','https://www.apple.com/certificateauthority/AppleRootCA-G2.cer'].map(async url=>{const response=await fetch(url,{signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('Certificate fetch failed');return Buffer.from(await response.arrayBuffer());})).catch(error=>{roots=undefined;throw error;});
 const certs=await roots;const list=[new SignedDataVerifier(certs,true,Environment.PRODUCTION,'com.saddleschool.app',appId)];if(Deno.env.get('APPLE_ALLOW_SANDBOX')==='true')list.push(new SignedDataVerifier(certs,true,Environment.SANDBOX,'com.saddleschool.app'));return list;
}
export async function verifyApple(signed:string,notification=false){if(typeof signed!=='string'||signed.length>100000)throw new Error('Invalid Apple transaction.');for(const verifier of await verifiers()){try{return notification?await verifier.verifyAndDecodeNotification(signed):await verifier.verifyAndDecodeTransaction(signed);}catch{}}throw new Error('Apple purchase verification failed.');}
export const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
export const reply=(status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
export async function bodyText(req:Request){const reader=req.body?.getReader();if(!reader)throw new Error('Missing request.');let length=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>200000){await reader.cancel();throw new Error('Request too large.');}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);}
