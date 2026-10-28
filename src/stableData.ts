import {cloud} from './cloud';
export type ShowResult={id:string;user_id:string;horse_id:string;show_name:string;show_date:string;venue:string;class_name:string;division:string;placing:number|null;score:string;ribbon:string;notes:string;photo:string};
export type Sticker={item_id:string;x:number;y:number};
export type Decor={wallpaper_id:string;stickers:Sticker[];charms?:string[];story:string};
export type CatalogItem={id:string;name:string;kind:'wallpaper'|'sticker'|'avatar'|'charm';premium:boolean};
export type HorseSnapshot={name:string;photo:string;breed:string;discipline:string;decor:Decor|null;results:ShowResult[];rides:number};
export const stickerArt:Record<string,string>={ribbon:'🎀',heart:'💚',star:'⭐',horseshoe:'🧲',crown:'👑'};
export const ribbons=['Blue','Red','Yellow','White','Pink','Green','Purple','Brown','Champion','Reserve champion','Participation'];
export const emptyDecor:Decor={wallpaper_id:'meadow',stickers:[],charms:[],story:''};
export function requireCloud(){if(!cloud)throw new Error('Cloud storage is not configured.');return cloud;}
export function check(error:{message:string}|null){if(error)throw new Error(error.message);}
export {showCount,milestones,completedRides} from './milestones';
