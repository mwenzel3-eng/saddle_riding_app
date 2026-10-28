import test from 'node:test';
import assert from 'node:assert/strict';
import {appleGrant,stripeGrant,verifyStripeSignature,products} from '../supabase/functions/_shared/purchases.ts';
const user='11111111-1111-4111-8111-111111111111';
test('Apple grants require the signed account token, supported product, and unrevoked non-consumable',()=>{
 const tx={appAccountToken:user,productId:'com.saddleschool.app.decor.crown',originalTransactionId:'123',type:'Non-Consumable'};
 assert.deepEqual(appleGrant(tx,user),{item:'crown',receipt:'apple:123'});
 for(const change of [{appAccountToken:'other'},{productId:'unrelated'},{revocationDate:1},{type:'Consumable'}])assert.throws(()=>appleGrant({...tx,...change},user));
});
test('Stripe grants require a paid one-time session, the configured price and one item',()=>{
 const session={mode:'payment',payment_status:'paid',client_reference_id:user,id:'cs_test_123',metadata:{item_id:'heritage'},line_items:{data:[{quantity:1,price:{id:'price_123'}}]}};
 assert.equal(stripeGrant(session,()=> 'price_123').item,'heritage');
 for(const change of [{payment_status:'unpaid'},{client_reference_id:'forged'},{mode:'subscription'},{metadata:{item_id:'unknown'}},{line_items:{data:[{quantity:1,price:{id:'wrong'}}]}}])assert.throws(()=>stripeGrant({...session,...change},()=> 'price_123'));
});
test('Stripe signatures reject tampering and stale replays',async()=>{
 const body='{"type":"checkout.session.completed"}',secret='test-secret',timestamp=Math.floor(Date.now()/1000);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${timestamp}.${body}`)));const signature=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');const header=`t=${timestamp},v1=${signature}`;
 assert.equal(await verifyStripeSignature(body,header,secret),true);assert.equal(await verifyStripeSignature(body+' ',header,secret),false);assert.equal(await verifyStripeSignature(body,header,secret,Date.now()+600000),false);assert.equal(await verifyStripeSignature(body,'t=bad,v1=x',secret),false);
});

test('every paid avatar and horse charm has matching web and native product configuration',async()=>{
 const {premiumCosmetics}=await import('../src/cosmetics.ts');
 const {avatarWardrobe}=await import('../src/avatarWardrobe.ts');
 for(const [id,item] of Object.entries(avatarWardrobe))assert.equal(!!products[id],item.premium,`Avatar purchase registration mismatch: ${id}`);
 const native=await (await import('node:fs/promises')).readFile('ios/App/App/SceneDelegate.swift','utf8');
 assert.deepEqual(Object.keys(products).sort(),Object.keys(premiumCosmetics).sort());
 for(const [id,item] of Object.entries(products)){
  assert.equal(item.apple,premiumCosmetics[id].apple);assert.ok(native.includes('"'+item.apple+'"'));
  const result=appleGrant({appAccountToken:user,productId:item.apple,originalTransactionId:id,type:'Non-Consumable'},user);assert.equal(result.item,id);
 }
});
