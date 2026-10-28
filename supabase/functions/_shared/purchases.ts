export const products:Record<string,{apple:string;priceEnv:string}>={
 heritage:{apple:'com.saddleschool.app.decor.heritage',priceEnv:'STRIPE_PRICE_HERITAGE'},
 crown:{apple:'com.saddleschool.app.decor.crown',priceEnv:'STRIPE_PRICE_CROWN'},
 'avatar-dressage':{apple:'com.saddleschool.app.avatar.dressage',priceEnv:'STRIPE_PRICE_AVATAR_DRESSAGE'},
 'avatar-rosette':{apple:'com.saddleschool.app.avatar.rosette',priceEnv:'STRIPE_PRICE_AVATAR_ROSETTE'},
 'avatar-hunter':{apple:'com.saddleschool.app.avatar.hunter',priceEnv:'STRIPE_PRICE_AVATAR_HUNTER'},
 'avatar-jumper':{apple:'com.saddleschool.app.avatar.jumper',priceEnv:'STRIPE_PRICE_AVATAR_JUMPER'},
 'avatar-classical-dressage':{apple:'com.saddleschool.app.avatar.classicaldressage',priceEnv:'STRIPE_PRICE_AVATAR_CLASSICAL_DRESSAGE'},
 'avatar-cross-country':{apple:'com.saddleschool.app.avatar.crosscountry',priceEnv:'STRIPE_PRICE_AVATAR_CROSS_COUNTRY'},
 'avatar-saddle-seat':{apple:'com.saddleschool.app.avatar.saddleseat',priceEnv:'STRIPE_PRICE_AVATAR_SADDLE_SEAT'},
 'avatar-western-pleasure':{apple:'com.saddleschool.app.avatar.westernpleasure',priceEnv:'STRIPE_PRICE_AVATAR_WESTERN_PLEASURE'},
 'avatar-reining':{apple:'com.saddleschool.app.avatar.reining',priceEnv:'STRIPE_PRICE_AVATAR_REINING'},
 'avatar-barrel':{apple:'com.saddleschool.app.avatar.barrel',priceEnv:'STRIPE_PRICE_AVATAR_BARREL'},
 'avatar-western-trail':{apple:'com.saddleschool.app.avatar.westerntrail',priceEnv:'STRIPE_PRICE_AVATAR_WESTERN_TRAIL'},
 'avatar-arabian-english':{apple:'com.saddleschool.app.avatar.arabianenglish',priceEnv:'STRIPE_PRICE_AVATAR_ARABIAN_ENGLISH'},
 'avatar-arabian-hunter':{apple:'com.saddleschool.app.avatar.arabianhunter',priceEnv:'STRIPE_PRICE_AVATAR_ARABIAN_HUNTER'},
 'avatar-arabian-native':{apple:'com.saddleschool.app.avatar.arabiannative',priceEnv:'STRIPE_PRICE_AVATAR_ARABIAN_NATIVE'},
 'charm-heart':{apple:'com.saddleschool.app.charm.heart',priceEnv:'STRIPE_PRICE_CHARM_HEART'},
 'charm-moon':{apple:'com.saddleschool.app.charm.moon',priceEnv:'STRIPE_PRICE_CHARM_MOON'},
 'charm-horseshoe':{apple:'com.saddleschool.app.charm.horseshoe',priceEnv:'STRIPE_PRICE_CHARM_HORSESHOE'}
};
export type ApplePurchase={appAccountToken?:string;productId?:string;originalTransactionId?:string;revocationDate?:number;type?:string};
export function appleGrant(transaction:ApplePurchase,user:string){
 const item=Object.entries(products).find(([,p])=>p.apple===transaction.productId)?.[0];
 if(!item||transaction.type!=='Non-Consumable'||transaction.appAccountToken?.toLowerCase()!==user.toLowerCase()||!transaction.originalTransactionId||transaction.revocationDate)throw new Error('This purchase cannot be linked to this rider account.');
 return {item,receipt:`apple:${transaction.originalTransactionId}`};
}
export async function verifyStripeSignature(body:string,header:string,secret:string,now=Date.now()){
 const parts=header.split(',').map(v=>v.split('='));const timestamp=parts.find(p=>p[0]==='t')?.[1],signatures=parts.filter(p=>p[0]==='v1').map(p=>p[1]);
 if(!timestamp||!/^\d+$/.test(timestamp)||Math.abs(now/1000-Number(timestamp))>300)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const signature of signatures){if(!/^[a-f0-9]{64}$/.test(signature||''))continue;const bytes=new Uint8Array(signature.match(/../g)!.map(b=>parseInt(b,16)));if(await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(`${timestamp}.${body}`)))return true;}
 return false;
}
export function stripeGrant(session:{mode?:string;payment_status?:string;metadata?:Record<string,string>;client_reference_id?:string;id?:string;line_items?:{data:{quantity?:number;price?:{id:string}}[]}},priceFor:(item:string)=>string|undefined){
 const item=session.metadata?.item_id,user=session.client_reference_id;
 if(session.mode!=='payment'||session.payment_status!=='paid'||!item||!Object.hasOwn(products,item)||!user||!session.id||!session.id.startsWith('cs_')||!/^[a-f0-9-]{36}$/i.test(user)||session.line_items?.data.length!==1||session.line_items.data[0].quantity!==1||session.line_items.data[0].price?.id!==priceFor(item))throw new Error('Invalid or unpaid checkout.');
 return {user,item,receipt:`stripe:${session.id}`};
}
