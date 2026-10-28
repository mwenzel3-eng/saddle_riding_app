import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../supabase/functions/video-critique/handler.ts';
const frames=Array.from({length:12},(_,i)=>({seconds:i+1,image:'data:image/jpeg;base64,YQ=='}));
const request=(body={frames,focus:'seat'},auth=true)=>new Request('https://example.test',{method:'POST',headers:auth?{Authorization:'Bearer test'}:{},body:JSON.stringify(body)});
function setup(overrides={}){let calls=0;let payload;let reserved=false;const handler=createHandler({authorize:async()=> 'member',quota:async(_user,reserve)=>{const allowed=!reserved;if(reserve&&allowed)reserved=true;return {allowed,reason:allowed?null:'cooldown',limit:5,remaining:reserved?4:5,resetsAt:'2026-10-30T00:00:00Z',retryAfterSeconds:60};},key:()=> 'test-key',model:()=> 'test-model',fetch:async(_url,options)=>{calls++;payload=JSON.parse(options.body);return Response.json({status:'completed',output:[{content:[{type:'output_text',text:'At 1s: visible rider.'}]}]});},...overrides});return {handler,get calls(){return calls;},get payload(){return payload;}};}
test('rejects unauthenticated and uninvited calls without calling AI',async()=>{const a=setup();assert.equal((await a.handler(request(undefined,false))).status,401);assert.equal(a.calls,0);const b=setup({authorize:async()=>null});assert.equal((await b.handler(request())).status,403);assert.equal(b.calls,0);});
test('missing secret returns actionable setup error',async()=>{const s=setup({key:()=>undefined});const r=await s.handler(request());assert.equal(r.status,503);assert.match((await r.json()).error,/OPENAI_API_KEY/);assert.equal(s.calls,0);});
test('rejects arbitrary image URLs and excessive frame counts',async()=>{const s=setup();for(const body of [{frames:[...frames,frames[0]]},{frames:frames.map(f=>({...f,image:'https://attacker.test'}))}])assert.equal((await s.handler(request(body))).status,400);assert.equal(s.calls,0);});
test('sends timestamped images with storage disabled and throttles repeat requests',async()=>{const s=setup();const r=await s.handler(request());assert.equal(r.status,200);assert.match((await r.json()).critique,/1s/);assert.equal(s.payload.store,false);assert.equal(s.payload.input[0].content.filter(x=>x.type==='input_image').length,12);assert.equal((await s.handler(request())).status,429);assert.equal(s.calls,1);});
test('handles provider errors and incomplete output',async()=>{for(const response of [()=>new Response('{}',{status:401}),()=>Response.json({status:'incomplete',output:[]})]){const s=setup({fetch:async()=>response()});assert.equal((await s.handler(request())).status,502);}});

test('daily exhaustion and quota storage outages never call the provider',async()=>{
 for(const quota of [async()=>({allowed:false,reason:'daily_limit',limit:5,remaining:0,resetsAt:'2026-10-30T00:00:00Z',retryAfterSeconds:100}),async()=>{throw new Error('offline');}]){
  const s=setup({quota});const response=await s.handler(request());assert.ok([429,503].includes(response.status));assert.equal(s.calls,0);
 }
});
test('usage status does not consume allowance or need an API key',async()=>{
 let reservations=0;const s=setup({key:()=>undefined,quota:async(_user,reserve)=>{if(reserve)reservations++;return {allowed:true,limit:5,remaining:5,retryAfterSeconds:0,resetsAt:'2026-10-30T00:00:00Z'};}});
 const response=await s.handler(request({action:'usage'}));assert.equal(response.status,200);assert.equal((await response.json()).usage.remaining,5);assert.equal(reservations,0);assert.equal(s.calls,0);
});
test('failed provider attempts retain reserved usage in the error',async()=>{
 const s=setup({fetch:async()=>{throw new Error('timeout');}});const response=await s.handler(request());assert.equal(response.status,502);assert.equal((await response.json()).usage.remaining,4);
});
