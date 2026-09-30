import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Search,Settings,Home as HomeIcon,Plus,Info,Play,ChevronLeft,ChevronRight,Heart,Download,Eye,Clock3,CalendarDays,SlidersHorizontal,ArrowLeft,Share2,Check,UserRound,Bell,Film,MonitorPlay,Menu,X,ExternalLink,Volume2,Maximize,RotateCcw,Dices,ChevronDown,List} from 'lucide-react';
import './styles.css';

const API=import.meta.env.VITE_API_URL||(import.meta.env.DEV?'http://localhost:4000/api':'https://flixstar-api.onrender.com/api');
const IMG=(p,size='w500')=>p?`https://image.tmdb.org/t/p/${size}${p}`:'';
const BG=(p)=>p?`https://image.tmdb.org/t/p/original${p}`:'';
const year=x=>(x?.release_date||x?.first_air_date||'').slice(0,4);
const title=x=>x?.title||x?.name||'Untitled';
const mediaType=x=>x?.media_type||(x?.first_air_date?'tv':'movie');
const GENRES={28:'Action',12:'Adventure',16:'Animation',35:'Comedy',80:'Crime',99:'Documentary',18:'Drama',10751:'Family',14:'Fantasy',36:'History',27:'Horror',10402:'Music',9648:'Mystery',10749:'Romance',878:'Science Fiction',10770:'TV Movie',53:'Thriller',10752:'War',37:'Western',10759:'Action & Adventure',10765:'Sci-Fi & Fantasy',10768:'War & Politics',10766:'Soap',10762:'Kids',10763:'News',10764:'Reality',10767:'Talk'};
const genreName=x=>(x?.genres?.[0]?.name)||GENRES[x?.genre_ids?.[0]]||'Movie';

async function apiFetch(path,options={}){
  let lastError;

  for(let attempt=0;attempt<3;attempt++){
    try{
      const response=await fetch(`${API}${path}`,options);

      if(!response.ok){
        throw new Error(`API ${response.status}`);
      }

      return await response.json();
    }catch(error){
      lastError=error;

      if(attempt<2){
        await new Promise(resolve=>setTimeout(resolve,5000));
      }
    }
  }

  throw lastError;
}

function useRoute(){const [path,setPath]=useState(location.pathname+location.search);useEffect(()=>{const f=()=>setPath(location.pathname+location.search);addEventListener('popstate',f);return()=>removeEventListener('popstate',f)},[]);const nav=p=>{history.pushState({},'',p);setPath(p);window.scrollTo({top:0,behavior:'smooth'})};return {path,nav}}

function App(){
 const {path,nav}=useRoute(); const [query,setQuery]=useState(''); const [menu,setMenu]=useState(false);
 const goSearch=e=>{e.preventDefault();if(query.trim())nav(`/search?q=${encodeURIComponent(query.trim())}`)};
const [lists,setLists]=useState(()=>{
  try{
    const saved=JSON.parse(
      localStorage.getItem('flixstar-lists')||'[]'
    );

    if(!Array.isArray(saved))return [];

    // New list format
    if(
      saved.length &&
      Array.isArray(saved[0]?.items)
    ){
      return saved;
    }

    // Migrate the old single flat list automatically
    if(saved.length){
      return [{
        id:'my-list',
        name:'My List',
        items:saved
      }];
    }

    return [];
  }catch{
    return [];
  }
});

useEffect(()=>{
  localStorage.setItem(
    'flixstar-lists',
    JSON.stringify(lists)
  );
},[lists]);


const toggleList=item=>{
  setLists(prev=>{
    const base=prev.length
      ? prev
      : [{
          id:'my-list',
          name:'My List',
          items:[]
        }];

    // Remember which list the user selected
    const activeId=
      localStorage.getItem('flixstar-active-list') ||
      base[0].id;
