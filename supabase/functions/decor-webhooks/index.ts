import {products,stripeGrant,verifyStripeSignature} from '../_shared/purchases.ts';
import type {ApplePurchase} from '../_shared/purchases.ts';
import {grant,revoke,stripe,verifyApple,reply,bodyText} from '../_shared/storeRuntime.ts';
Deno.serve(async req=>{
 if(req.method!=='POST')return reply(405,{error:'Use POST.'});
 try{
  const raw=await bodyText(req),signature=req.headers.get('stripe-signature');
  if(signature){
   const secret=Deno.env.get('STRIPE_WEBHOOK_SECRET');if(!secret||!await verifyStripeSignature(raw,signature,secret))return reply(400,{error:'Invalid signature.'});
   const event=JSON.parse(raw);
   if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){
    const object=event.data.object;if(object.payment_status!=='paid')return reply(200,{received:true});
    const session=await stripe(`checkout/sessions/${encodeURIComponent(object.id)}?expand[]=line_items`);
    const p=stripeGrant(session,item=>Deno.env.get(products[item].priceEnv));await grant(p.user,p.item,p.receipt);
   }else if(event.type==='charge.refunded'&&event.data.object.refunded){
    const intent=event.data.object.payment_intent;if(typeof intent==='string'){const sessions=await stripe(`checkout/sessions?payment_intent=${encodeURIComponent(intent)}`);for(const session of sessions.data||[])await revoke(`stripe:${session.id}`);}
   }
   return reply(200,{received:true});
  }
  const payload=JSON.parse(raw);const note=await verifyApple(payload.signedPayload,true) as {notificationType?:string;data?:{signedTransactionInfo?:string}};
  if(['REFUND','REVOKE'].includes(note.notificationType||'')&&note.data?.signedTransactionInfo){
   const transaction=await verifyApple(note.data.signedTransactionInfo) as ApplePurchase;
   if(transaction.originalTransactionId&&Object.values(products).some(p=>p.apple===transaction.productId))await revoke(`apple:${transaction.originalTransactionId}`);
  }
  return reply(200,{received:true});
 }catch{return reply(500,{error:'Event verification or processing failed.'});}
});
