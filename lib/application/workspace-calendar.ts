import type { WorkspaceView } from './workspace';
export function calendarRange(date:string){
 const today=new Date(date+'T12:00:00Z');
 const monday=new Date(today);monday.setUTCDate(today.getUTCDate()-((today.getUTCDay()+6)%7));
 const sunday=new Date(monday);sunday.setUTCDate(monday.getUTCDate()+6);
 return {start:monday.toISOString().slice(0,10),end:sunday.toISOString().slice(0,10),blanks:(new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1)).getUTCDay()+6)%7,days:new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()+1,0)).getUTCDate()};
}
export function revenueSeries(store:WorkspaceView,date:string){
 const today=new Date(date+'T12:00:00Z');
 return Array.from({length:6},(_,i)=>{
  const month=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth()-5+i,1)).toISOString().slice(0,7);
  return {label:month,value:store.payments.filter(p=>p.date.startsWith(month)).reduce((sum,p)=>sum+p.amount,0)};
 });
}
