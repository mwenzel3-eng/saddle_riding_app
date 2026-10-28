export type Frame = {seconds:number;image:string};
export async function extractFrames(blob:Blob):Promise<Frame[]> {
 if(blob.size>50*1024*1024)throw new Error('Choose a video under 50 MB.');
 const url=URL.createObjectURL(blob),video=document.createElement('video');
 video.muted=true;video.playsInline=true;video.preload='auto';
 function wait(event:string, action:()=>void):Promise<void>{return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>done(new Error('Video decoding timed out. Try an MP4 clip.')),15000);
  const ok=()=>done();const fail=()=>done(new Error('This video cannot be read. Try exporting it as MP4.'));
  function done(error?:Error){clearTimeout(timer);video.removeEventListener(event,ok);video.removeEventListener('error',fail);error?reject(error):resolve();}
  video.addEventListener(event,ok,{once:true});video.addEventListener('error',fail,{once:true});action();
 });}
 try {
  await wait('loadeddata',()=>{video.src=url;video.load();});
  if(!Number.isFinite(video.duration)||video.duration<=0||video.duration>60)throw new Error('Choose a clip between 1 and 60 seconds.');
  const canvas=document.createElement('canvas'),scale=Math.min(1,960/Math.max(video.videoWidth,video.videoHeight));
  canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  const ctx=canvas.getContext('2d');if(!ctx||!canvas.width||!canvas.height)throw new Error('Could not read video frames.');
  const frames:Frame[]=[];
  for(let i=0;i<12;i++){
   const seconds=(video.duration-.05)*(i+.5)/12;
   await wait('seeked',()=>{video.currentTime=seconds;});
   ctx.drawImage(video,0,0,canvas.width,canvas.height);
   frames.push({seconds:Math.round(seconds*100)/100,image:canvas.toDataURL('image/jpeg',.75)});
  }
  return frames;
 } finally {video.removeAttribute('src');video.load();URL.revokeObjectURL(url);}
}
