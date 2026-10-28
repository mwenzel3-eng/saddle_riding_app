import {products,appleGrant,stripeGrant} from '../_shared/purchases.ts';
import type {ApplePurchase} from '../_shared/purchases.ts';
import {actor,admin,grant,stripe,verifyApple,cors,reply,bodyText} from '../_shared/storeRuntime.ts';
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 let user:string;try{user=await actor(req);}catch{return reply(401,{error:'Please sign in again.'});}
 try{
 const body=JSON.parse(await bodyText(req));
 const priceFor=(item:string)=>Deno.env.get(products[item]?.priceEnv||'');
 if(body.action==='status'){
  const items:Record<string,{webPrice?:string;appleReady:boolean}>={};
  for(const [id,p] of Object.entries(products)){
   items[id]={appleReady:!!Deno.env.get('APPLE_APP_ID')};
   if(Deno.env.get('STRIPE_SECRET_KEY')&&Deno.env.get('STRIPE_WEBHOOK_SECRET')&&Deno.env.get('STORE_RETURN_URL')&&Deno.env.get(p.priceEnv)){
    const price=await stripe(`prices/${encodeURIComponent(Deno.env.get(p.priceEnv)!)}`);
    if(price.active&&price.type==='one_time'&&price.currency==='usd'&&price.unit_amount===99)items[id].webPrice=new Intl.NumberFormat('en-US',{style:'currency',currency:price.currency}).format(price.unit_amount/(new Set(['jpy','krw','vnd','clp','xaf','xof','xpf','gnf','rwf','vuv','bif','djf','kmf','pyg','mga']).has(price.currency)?1:100));
   }
  }return reply(200,{items});
 }
 if(body.action==='checkout'){
  const product=products[body.item];if(!product||!priceFor(body.item)||!Deno.env.get('STRIPE_WEBHOOK_SECRET'))return reply(503,{error:'This decoration is not on sale yet.'});
  const already=await admin().from('saddle_entitlements').select('item_id').eq('user_id',user).eq('item_id',body.item).maybeSingle();if(already.error)throw new Error('Could not check owned items.');if(already.data)return reply(409,{error:'You already own this decoration. Reload your stable.'});
  const configuredPrice=await stripe(`prices/${encodeURIComponent(priceFor(body.item)!)}`);if(!configuredPrice.active||configuredPrice.type!=='one_time'||configuredPrice.currency!=='usd'||configuredPrice.unit_amount!==99)return reply(503,{error:'This decoration must be configured as a $0.99 USD one-time purchase.'});
  const returnURL=new URL(Deno.env.get('STORE_RETURN_URL')||'');if(returnURL.protocol!=='https:')throw new Error('Checkout return URL must use HTTPS.');
  const success=new URL(returnURL);success.searchParams.set('checkout_session','{CHECKOUT_SESSION_ID}');
  const params=new URLSearchParams({mode:'payment','line_items[0][price]':priceFor(body.item)!,'line_items[0][quantity]':'1',client_reference_id:user,'metadata[item_id]':body.item,success_url:success.toString().replace('%7BCHECKOUT_SESSION_ID%7D','{CHECKOUT_SESSION_ID}'),cancel_url:returnURL.toString()});
  const session=await stripe('checkout/sessions',params);if(typeof session.url!=='string'||!session.url.startsWith('https://checkout.stripe.com/'))throw new Error('Invalid checkout URL.');return reply(200,{url:session.url});
 }
 if(body.action==='confirmCheckout'){
  if(typeof body.session!=='string'||!/^cs_[A-Za-z0-9_]+$/.test(body.session))return reply(400,{error:'Invalid checkout reference.'});
  const session=await stripe(`checkout/sessions/${body.session}?expand[]=line_items`);const purchase=stripeGrant(session,priceFor);if(purchase.user!==user)return reply(403,{error:'This checkout belongs to another account.'});await grant(user,purchase.item,purchase.receipt);return reply(200,{saved:true});
 }
 if(body.action==='apple'){
  const transaction=await verifyApple(body.signedTransaction) as ApplePurchase;const purchase=appleGrant(transaction,user);await grant(user,purchase.item,purchase.receipt);return reply(200,{saved:true});
 }
 return reply(400,{error:'Unknown store action.'});
 }catch(e){return reply(400,{error:e instanceof Error?e.message:'The purchase could not be verified. Please retry.'});}
});
