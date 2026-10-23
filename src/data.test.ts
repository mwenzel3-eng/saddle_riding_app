import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,validateBackup,exportable,localDate,newHorse,newRide} from './data.ts';
test('backup preserves horse photos and ride ownership, removes video handles',()=>{
 const horse={...newHorse(),name:'Willow',photo:'data:image/jpeg;base64,YQ=='};
 const ride={...newRide(horse.id),videoId:'clip123',videoName:'ride.mov'};
 const input={...structuredClone(emptyState),horses:[horse],rides:[ride]};
 const restored=validateBackup(JSON.parse(JSON.stringify(exportable(input))));
 assert.equal(restored.horses[0].photo,horse.photo);assert.equal(restored.rides[0].horseId,horse.id);assert.equal(restored.rides[0].videoId,undefined);
});
test('rejects missing horse links and duplicate horse ids without mutating input',()=>{
 const horse={...newHorse(),name:'Willow'};
 const state={...structuredClone(emptyState),horses:[horse],rides:[newRide('unknown')]};
 const before=JSON.stringify(state);assert.throws(()=>validateBackup(state));assert.equal(JSON.stringify(state),before);
 assert.throws(()=>validateBackup({...state,horses:[horse,horse],rides:[]}));
});
test('rejects invalid photos and out-of-range rides',()=>{
 const horse={...newHorse(),name:'Willow',photo:'javascript:alert(1)'};
 assert.throws(()=>validateBackup({...emptyState,horses:[horse]}));
 horse.photo='';assert.throws(()=>validateBackup({...emptyState,horses:[horse],rides:[{...newRide(horse.id),minutes:-5}]}));
});
test('uses local calendar date rather than UTC conversion',()=>{
 const date=new Date(2026,0,2,23,58);assert.equal(localDate(date),'2026-01-02');
});
