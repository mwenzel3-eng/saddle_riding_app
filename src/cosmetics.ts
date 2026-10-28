import {avatarWardrobe} from './avatarWardrobe.ts';
export const premiumCosmetics:Record<string,{name:string;kind:'wallpaper'|'sticker'|'avatar'|'charm';apple:string}>={
 heritage:{name:'Heritage plaid wallpaper',kind:'wallpaper',apple:'com.saddleschool.app.decor.heritage'},
 crown:{name:'Golden crown sticker',kind:'sticker',apple:'com.saddleschool.app.decor.crown'},
 'avatar-dressage':{name:'Show ring rider avatar',kind:'avatar',apple:'com.saddleschool.app.avatar.dressage'},
 'avatar-rosette':{name:'Rosette rider avatar',kind:'avatar',apple:'com.saddleschool.app.avatar.rosette'},
 'avatar-hunter':{name:"Hunter rider avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.hunter'},
 'avatar-jumper':{name:"Show jumper avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.jumper'},
 'avatar-classical-dressage':{name:"Dressage rider avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.classicaldressage'},
 'avatar-cross-country':{name:"Cross-country rider avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.crosscountry'},
 'avatar-saddle-seat':{name:"Saddle seat rider avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.saddleseat'},
 'avatar-western-pleasure':{name:"Western pleasure rider avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.westernpleasure'},
 'avatar-reining':{name:"Reining rider avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.reining'},
 'avatar-barrel':{name:"Barrel rider avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.barrel'},
 'avatar-western-trail':{name:"Western trail rider avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.westerntrail'},
 'avatar-arabian-english':{name:"Arabian English pleasure avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.arabianenglish'},
 'avatar-arabian-hunter':{name:"Arabian hunter pleasure avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.arabianhunter'},
 'avatar-arabian-native':{name:"Arabian native costume avatar",kind:'avatar',apple:'com.saddleschool.app.avatar.arabiannative'},
 'charm-heart':{name:'Rose heart charm',kind:'charm',apple:'com.saddleschool.app.charm.heart'},
 'charm-moon':{name:'Moonlight charm',kind:'charm',apple:'com.saddleschool.app.charm.moon'},
 'charm-horseshoe':{name:'Lucky horseshoe charm',kind:'charm',apple:'com.saddleschool.app.charm.horseshoe'}
};
export const avatarIds=Object.keys(avatarWardrobe);
export function avatarSource(id:string|null|undefined){return id&&avatarIds.includes(id)?`/avatars/${id}.svg`:undefined;}
export const charmNames:Record<string,string>={'charm-heart':'Rose heart charm','charm-moon':'Moonlight charm','charm-horseshoe':'Lucky horseshoe charm'};
