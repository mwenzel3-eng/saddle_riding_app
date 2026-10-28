import test from 'node:test';
import assert from 'node:assert/strict';
import {milestones,showCount,completedRides} from './milestones.ts';
import {newRide,localDate} from './data.ts';
test('multiple classes at the same event count as one show, future events do not count',()=>{
 const rows=[{show_name:' Spring Show ',show_date:'2026-01-01',venue:'Arena'},{show_name:'spring show',show_date:'2026-01-01',venue:'arena'},{show_name:'Next Show',show_date:'2099-01-01',venue:'Arena'}];
 assert.equal(showCount(rows,'2026-01-02'),1);
});
test('badge thresholds reflect records rather than saved badge claims',()=>{
 const badges=milestones(10,1,0);assert.ok(badges.find(b=>b.id==='rides-10')?.earned);assert.equal(badges.find(b=>b.id==='rides-25')?.earned,false);assert.ok(badges.find(b=>b.id==='shows-1')?.earned);assert.equal(badges.find(b=>b.id==='ribbons-1')?.earned,false);
 assert.equal(milestones(0,0,0).filter(b=>b.earned).length,0);
});
test('ride milestones respect horse and exclude future ride dates',()=>{
 const a={...newRide('a'),date:localDate()},b={...newRide('b'),date:'2099-01-01'};
 assert.equal(completedRides([a,b]),1);assert.equal(completedRides([a,b],'b'),0);
});
