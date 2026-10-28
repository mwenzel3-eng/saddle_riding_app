import {avatarSource,charmNames} from './cosmetics';
export function CharmArt({id}:{id:string}){
 return <svg viewBox="0 0 64 76" className={`charm-art ${id}`} aria-hidden="true"><path d="M32 1v15" stroke="#c3a063" strokeWidth="3" strokeDasharray="3 2"/><circle cx="32" cy="19" r="5" fill="none" stroke="#d1ad65" strokeWidth="3"/>{id==='charm-heart'?<path d="M32 66 13 47C1 31 24 21 32 35c8-14 31-4 19 12Z" fill="#c8758c" stroke="#e0b16e" strokeWidth="3"/>:id==='charm-moon'?<path d="M44 27c-29-5-34 39-8 41 10 1 17-5 20-13-22 9-34-16-12-28Z" fill="#d9cced" stroke="#c7a265" strokeWidth="3"/>:<path d="M15 32v18c0 24 34 24 34 0V32H38v19c0 10-12 10-12 0V32Z" fill="#e7c476" stroke="#a37b3c" strokeWidth="2"/>}</svg>;
}
export function CosmeticArt({id,name}:{id:string;name:string}){
 const avatar=avatarSource(id);
 return avatar?<img className="shop-avatar-preview" src={avatar} alt={name}/>:charmNames[id]?<CharmArt id={id}/>:<span className={`shop-decor-preview ${id==='heritage'?'wallpaper-heritage':''}`} aria-hidden="true">{id==='crown'?'👑':''}</span>;
}
