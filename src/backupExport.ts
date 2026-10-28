import {Capacitor} from '@capacitor/core';
import {Filesystem,Directory,Encoding} from '@capacitor/filesystem';
import {Share} from '@capacitor/share';
export async function exportBackup(text:string,filename:string):Promise<'shared'|'downloaded'> {
 if(Capacitor.isNativePlatform()){
  const saved=await Filesystem.writeFile({path:filename,data:text,directory:Directory.Cache,encoding:Encoding.UTF8});
  try{await Share.share({title:'Saddle School records backup',files:[saved.uri],dialogTitle:'Save your records backup'});}
  finally{await Filesystem.deleteFile({path:filename,directory:Directory.Cache}).catch(()=>{});}
  return 'shared';
 }
 const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return 'downloaded';
}
