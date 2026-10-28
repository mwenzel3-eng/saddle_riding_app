// Extend the app's established SVG portrait system. Does not modify the original five assets.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../',import.meta.url),rows=JSON.parse(await readFile(new URL('config/avatar-wardrobe.json',root),'utf8'));
await mkdir(new URL('public/avatars/',root),{recursive:true});
function portrait(v){
 const {skin,hair,jacket,accent,background,hat,outfit,hairStyle}=v;
 const hairBack=hairStyle==='ponytail'?`<path d="M164 116c53 7 31 61 53 81-34 3-57-15-49-46Z" fill="${hair}"/>`:hairStyle==='braid'?`<path d="M170 132q21 10 10 27 15 15 1 27 12 15-1 28 7 11-2 22" fill="none" stroke="${hair}" stroke-width="19" stroke-linecap="round"/>`:hairStyle==='bun'?`<circle cx="173" cy="132" r="21" fill="${hair}"/>`:'';
 const helmet=`<path d="M75 101c0-43 21-70 53-70s53 27 53 70" fill="${outfit==='protector'?jacket:'#263740'}"/><path d="M82 93c5-34 20-52 46-52s41 18 46 52" fill="none" stroke="${outfit==='protector'?accent:'#52666d'}" stroke-width="5"/><path d="M70 99q58-18 116 0l-4 12q-54-12-108 0Z" fill="#17272f"/><path d="M128 39v51" stroke="${accent}" stroke-width="3"/><path d="M84 120l13 41 31 14 31-14 13-41" fill="none" stroke="#26363d" stroke-width="3"/>`;
 const western=`<path d="M86 75 92 32q8-12 29 1l7 7 9-7q23-13 29 0l6 42" fill="${outfit==='show-western'?'#352a3c':'#c9ac7a'}"/><path d="M47 72q25 9 45 1 36-10 72 0 21 8 45-1-11 32-81 30T47 72Z" fill="${outfit==='show-western'?'#49334d':'#d8bf91'}"/><path d="M88 72q40-10 80 0" fill="none" stroke="${accent}" stroke-width="8"/>`;
 const derby=`<path d="M84 83V64c0-31 18-41 44-41s44 10 44 41v19" fill="#30313a"/><path d="M84 75h88v12H84Z" fill="${accent}"/><ellipse cx="128" cy="88" rx="64" ry="10" fill="#24262d"/>`;
 const clothBack=`<path d="M79 67q-7 47-9 119l-18 40 50-11 26-34 27 34 49 11-18-40q-2-72-9-119Z" fill="#f4ebd8" stroke="#d6c8a9" stroke-width="2"/>`;
 const headcloth=`<path d="M78 83q2-52 50-52t50 52q-25-23-50-24-26 1-50 24Z" fill="#fbf3e2"/><path d="M79 70q48-26 98 0" fill="none" stroke="#3c3330" stroke-width="8"/><path d="M82 81q-5 51-7 99M174 81q5 51 7 99" fill="none" stroke="#d5c5a1" stroke-width="3"/>`;
 const shirt=`<path d="M88 178l40 30 40-30 14 78H74Z" fill="#fff7e9"/>`;
 const tie=`<path d="m119 204 9 10 9-10-9-9Z" fill="${accent}"/><path d="m122 214-6 42h24l-6-42" fill="${accent}"/>`;
 const stock=`<path d="m104 184 24 19 24-19-7 31-17 17-17-17Z" fill="#fff9ed"/><path d="m113 202 30 12M113 214l30-12" stroke="#d9d9d0" stroke-width="2"/><circle cx="128" cy="213" r="4" fill="${accent}"/>`;
 const collar=`<path d="m102 182 26 21-17 13-16-27m59-7-26 21 17 13 16-27" fill="#fff8eb"/>`;
 const lapels=`<path d="m99 177 29 79-42-35 9-15-12-14Zm58 0-29 79 42-35-9-15 12-14Z" fill="${jacket}" stroke="#ffffff30" stroke-width="2"/>`;
 let clothes=shirt+tie+collar+lapels;
 if(outfit==='stock')clothes=shirt+stock+lapels;
 if(outfit==='polo')clothes=`<path d="m105 180 23 20 23-20 10 13-19 25-14-17-14 17-19-25Z" fill="${accent}"/><path d="M128 204v39" stroke="#f2e4d0" stroke-width="3"/><circle cx="133" cy="221" r="2" fill="#fff3e2"/>`;
 if(outfit==='suit')clothes=shirt+`<path d="m105 180 23 23 23-23 12 76H93Z" fill="#d3c6ad"/>`+tie+collar+lapels+`<path d="M133 230v26" stroke="#49433e" stroke-width="2"/>`;
 if(['western','plaid','show-western','western-vest'].includes(outfit)){
  clothes=`<path d="m104 179 24 20 24-20 13 13-20 20-17-11-17 11-20-20Z" fill="${accent}"/><path d="M128 209v47" stroke="#ffffff80" stroke-width="3"/><path d="m52 205 30 12 21-12m50 0 21 12 30-12" fill="none" stroke="${accent}" stroke-width="4"/>`;
  for(const y of [220,234,248])clothes+=`<circle cx="134" cy="${y}" r="2.5" fill="#f6e6c8"/>`;
  if(outfit==='western'||outfit==='plaid')clothes+=`<path d="m110 190 18 10 18-10-4 17-14 9-14-9Zm16 24-8 24 18-7 4-18" fill="${accent}"/>`;
  if(outfit==='plaid')clothes+=`<path d="M65 218h45m36 0h45M58 238h55m30 0h55M85 206v50m85-50v50" stroke="#ffffff40" stroke-width="5"/>`;
  if(outfit==='western-vest')clothes+=`<path d="m94 180 26 30-6 46H54v-29q2-26 40-47m68 0-26 30 6 46h60v-29q-2-26-40-47" fill="${accent}" stroke="#d9b98d" stroke-width="2"/>`;
  if(outfit==='show-western')for(const [x,y] of [[66,213],[81,219],[96,213],[160,213],[175,219],[190,213],[70,234],[186,234]])clothes+=`<path d="m${x} ${y-4} 3 4-3 4-3-4Z" fill="#f4d9ac"/>`;
 }
 if(outfit==='protector')clothes=`<path d="M91 177h22l15 29 15-29h22l27 79H64Z" fill="#283b43" stroke="#9bafaf" stroke-width="3"/><path d="M128 205v51M78 220h100M71 240h114" stroke="#657a7e" stroke-width="3"/><path d="M99 179v22m58-22v22" stroke="${accent}" stroke-width="6"/>`;
 if(outfit==='native')clothes=`<path d="m96 177 32 27 32-27 42 79H54Z" fill="${jacket}"/><path d="m100 180 28 26-19 50m47-76-28 26 19 50" fill="none" stroke="${accent}" stroke-width="10"/><path d="m100 180 28 26-19 50m47-76-28 26 19 50" fill="none" stroke="#fae8b7" stroke-width="2" stroke-dasharray="4 6"/><path d="M57 244h51m40 0h51" stroke="${accent}" stroke-width="4"/>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img"><title>${v.name}</title><rect width="256" height="256" rx="128" fill="${background}"/><circle cx="128" cy="122" r="104" fill="none" stroke="${accent}" opacity=".4" stroke-width="2"/>${hat==='headcloth'?clothBack:''}${hairBack}<path d="M40 256v-23c0-35 37-61 88-61s88 26 88 61v23" fill="${jacket}"/><path d="M106 157v28l22 22 22-22v-28" fill="${skin}"/>${clothes}<ellipse cx="128" cy="119" rx="42" ry="52" fill="${skin}"/><path d="M87 111c5-13 10-20 14-29 18 16 39 24 68 23V89c-6-25-22-37-42-37s-39 20-40 59" fill="${hair}"/><path d="M109 120h1m36 0h1" stroke="#332c29" stroke-width="5" stroke-linecap="round"/><path d="M119 146q9 7 18 0" fill="none" stroke="#8b5143" stroke-width="3" stroke-linecap="round"/>${hat==='helmet'?helmet:hat==='western'?western:hat==='derby'?derby:headcloth}</svg>\n`;
}
for(const row of rows.filter(r=>r.outfit))await writeFile(new URL(`public/avatars/${row.id}.svg`,root),portrait(row));
const metadata=Object.fromEntries(rows.map(({id,name,collection,description,premium})=>[id,{name,collection,description,premium}]));
await writeFile(new URL('src/avatarWardrobe.ts',root),`// Generated from config/avatar-wardrobe.json by scripts/build-rider-avatars.mjs.\nexport type AvatarCollection='Everyday'|'English'|'Western'|'Arabian';\nexport const avatarWardrobe:Record<string,{name:string;collection:AvatarCollection;description:string;premium:boolean}>=${JSON.stringify(metadata,null,2)};\n`);
console.log(`Generated ${rows.filter(r=>r.outfit).length} new SVG portraits; ${rows.length} total wardrobe choices.`);
