import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Episode, Series, Product, Theme, CartItem } from "@/types";

interface PlayerStore {
  ep: Episode|null; series: Series|null; playing: boolean;
  progress: number; duration: number; volume: number; rate: number;
  setEp:(ep:Episode,s:Series)=>void; setPlaying:(v:boolean)=>void;
  setProgress:(v:number)=>void; setDuration:(v:number)=>void;
  setVolume:(v:number)=>void; setRate:(v:number)=>void;
  next:()=>void; prev:()=>void;
}
export const usePlayer = create<PlayerStore>()(persist((set,get)=>({
  ep:null, series:null, playing:false, progress:0, duration:0, volume:0.8, rate:1,
  setEp:(ep,s)=>set({ep,series:s,playing:true,progress:0}),
  setPlaying:(v)=>set({playing:v}),
  setProgress:(v)=>set({progress:v}),
  setDuration:(v)=>set({duration:v}),
  setVolume:(v)=>set({volume:v}),
  setRate:(v)=>set({rate:v}),
  next:()=>{
    const {ep,series}=get(); if(!ep||!series) return;
    const idx=series.episodes.findIndex(e=>e._id===ep._id);
    if(idx<series.episodes.length-1) set({ep:series.episodes[idx+1],playing:true,progress:0});
  },
  prev:()=>{
    const {ep,series}=get(); if(!ep||!series) return;
    const idx=series.episodes.findIndex(e=>e._id===ep._id);
    if(idx>0) set({ep:series.episodes[idx-1],playing:true,progress:0});
  },
}),{name:"naad-player",partialize:(s)=>({volume:s.volume,rate:s.rate})}));

interface CartStore {
  items:CartItem[];
  add:(p:Product,qty?:number)=>void; remove:(id:string)=>void;
  qty:(id:string,q:number)=>void; clear:()=>void;
  total:()=>number; count:()=>number;
}
export const useCart = create<CartStore>()(persist((set,get)=>({
  items:[],
  add:(p,qty=1)=>set(s=>{
    const ex=s.items.find(i=>i.product._id===p._id);
    return ex ? {items:s.items.map(i=>i.product._id===p._id?{...i,quantity:i.quantity+qty}:i)}
              : {items:[...s.items,{product:p,quantity:qty}]};
  }),
  remove:(id)=>set(s=>({items:s.items.filter(i=>i.product._id!==id)})),
  qty:(id,q)=>set(s=>({items:q<=0?s.items.filter(i=>i.product._id!==id):s.items.map(i=>i.product._id===id?{...i,quantity:q}:i)})),
  clear:()=>set({items:[]}),
  total:()=>get().items.reduce((a,i)=>a+i.product.price*i.quantity,0),
  count:()=>get().items.reduce((a,i)=>a+i.quantity,0),
}),{name:"naad-cart"}));

interface AppStore {
  theme:Theme; setTheme:(t:Theme)=>void;
  liked:string[]; toggleLike:(id:string)=>void;
}
export const useApp = create<AppStore>()(persist((set,get)=>({
  theme:"midnight", setTheme:(t)=>set({theme:t}),
  liked:[], toggleLike:(id)=>set(s=>({liked:s.liked.includes(id)?s.liked.filter(x=>x!==id):[...s.liked,id]})),
}),{name:"naad-app"}));
