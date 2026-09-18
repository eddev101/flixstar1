import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Search,Settings,Home as HomeIcon,Plus,Info,Play,ChevronLeft,ChevronRight,Heart,Download,Eye,Clock3,CalendarDays,SlidersHorizontal,ArrowLeft,Share2,Check,UserRound,Film,MonitorPlay,Menu,X,ExternalLink,Volume2,Maximize,RotateCcw,Dices,ChevronDown} from 'lucide-react';
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
 const [lists,setLists]=useState(()=>JSON.parse(localStorage.getItem('flixstar-lists')||'[]'));
 const toggleList=item=>{setLists(prev=>{const exists=prev.some(x=>x.id===item.id&&mediaType(x)===mediaType(item));const n=exists?prev.filter(x=>!(x.id===item.id&&mediaType(x)===mediaType(item))):[...prev,item];localStorage.setItem('flixstar-lists',JSON.stringify(n));return n})};
 const isListed=item=>lists.some(x=>x.id===item.id&&mediaType(x)===mediaType(item));
 if(path.startsWith('/watch/')){
  const [, , type, id] = location.pathname.split('/');
  return <Watch titleId={id} type={type} nav={nav}/>;
}
 if(path.startsWith('/person/'))return <Person id={path.split('/')[2]} nav={nav}/>;
 if(path.startsWith('/movie/'))return <Detail type="movie" id={path.split('/')[2]} nav={nav} listed={isListed} toggleList={toggleList}/>;
 if(path.startsWith('/tv/'))return <Detail type="tv" id={path.split('/')[2]} nav={nav} listed={isListed} toggleList={toggleList}/>;
 if(path.startsWith('/search'))return <SearchPage q={new URLSearchParams(location.search).get('q')||''} nav={nav}/>;
  if(path.startsWith('/recommendations/')){const parts=path.split('/');return <RecommendationsPage type={parts[2]} id={parts[3]} nav={nav}/>;}
 if(path.startsWith('/movies'))
  return <Listing
    type="movie"
    nav={nav}
    title="Movies"
    subtitle="Explore movies worth watching"
    listed={isListed}
    toggleList={toggleList}
/>;
if(path.startsWith('/shows') || path.startsWith('/tv'))
  return <Listing
    type="tv"
    nav={nav}
    title="TV Series"
    subtitle="Discover new TV series to watch"
    listed={isListed}
    toggleList={toggleList}
/>;
 if(path.startsWith('/provider/')){const parts=path.split('/');const id=parts[2];const name=new URLSearchParams(location.search).get('name')||'Provider';return <ProviderPage id={id} name={name} nav={nav}/>;}
 if(path==='/my-list')return <MyList items={lists} nav={nav} toggle={toggleList}/>;
 if(path==='/settings')return <SettingsPage nav={nav}/>;
 return <><Home nav={nav} listed={isListed} toggleList={toggleList}/><Footer nav={nav}/></>;
}

function SiteNav({nav,query='',setQuery,onSearch,active,menu,setMenu}){
  const handleSubmit=e=>{
    e.preventDefault();

    if(onSearch){
      onSearch(e);
      return;
    }

    const value=(query||'').trim();

    if(value){
      nav(`/search?q=${encodeURIComponent(value)}`);
    }else{
      nav('/search');
    }
  };

  return (
    <header className="site-nav">
      <button className="brand" onClick={()=>nav('/')} aria-label="Flixstar">
        <span className="brand-mark">✦</span>
      </button>

      <div className="desktop-nav">
        <NavItem
          icon={<HomeIcon/>}
          text="Home"
          active={active==='home'}
          onClick={()=>nav('/')}
        />

        <NavItem
          text="Movies"
          active={active==='movies'}
          onClick={()=>nav('/movies')}
        />

        <NavItem
          text="Shows"
          active={active==='shows'}
          onClick={()=>nav('/shows')}
        />

        <NavItem
          text="My List"
          active={active==='list'}
          onClick={()=>nav('/my-list')}
        />

        <form className="nav-search" onSubmit={handleSubmit}>
          <Search size={19}/>

          <input
            value={query||''}
            onChange={e=>setQuery?.(e.target.value)}
            placeholder=""
            aria-label="Search"
          />

          <button aria-label="search" type="submit"/>
        </form>

        <button className="nav-icon" onClick={()=>nav('/settings')}>
          <Settings size={19}/>
        </button>
      </div>

      <button
        className="mobile-menu"
        onClick={()=>setMenu?.(!menu)}
      >
        {menu?<X/>:<Menu/>}
      </button>

      {menu&&(
        <div className="mobile-nav">
          <button onClick={()=>nav('/')}>Home</button>
          <button onClick={()=>nav('/movies')}>Movies</button>
          <button onClick={()=>nav('/shows')}>Shows</button>
          <button onClick={()=>nav('/my-list')}>My List</button>
          <button onClick={()=>nav('/settings')}>Settings</button>
        </div>
      )}
    </header>
  );
}
function NavItem({icon,text,active,onClick}){return <button className={`nav-pill ${active?'active':''}`} onClick={onClick}>{icon}{text}</button>}

function readWatchProgress(){
  try{
    return JSON.parse(
      localStorage.getItem('flixstar-watch-progress') || '[]'
    );
  }catch{
    return [];
  }
}

function saveWatchProgress(item){
  const current = readWatchProgress();

  const key = `${item.type}-${item.id}-${item.season||0}-${item.episode||0}`;

  const next = current.filter(x =>
    `${x.type}-${x.id}-${x.season||0}-${x.episode||0}` !== key
  );

  next.push({
    ...item,
    updatedAt: Date.now()
  });

  localStorage.setItem(
    'flixstar-watch-progress',
    JSON.stringify(next)
  );

  window.dispatchEvent(
    new Event('flixstar-watch-progress')
  );
}

function removeWatchProgress(item){
  const current = readWatchProgress();

  const key = `${item.type}-${item.id}-${item.season||0}-${item.episode||0}`;

  const next = current.filter(x =>
    `${x.type}-${x.id}-${x.season||0}-${x.episode||0}` !== key
  );

  localStorage.setItem(
    'flixstar-watch-progress',
    JSON.stringify(next)
  );

  window.dispatchEvent(
    new Event('flixstar-watch-progress')
  );
}

function formatTime(seconds){
  const total = Math.max(0, Math.floor(Number(seconds)||0));

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  if(h){
    return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  return `${m}:${String(s).padStart(2,'0')}`;
}

function Home({nav,listed,toggleList}){
  const [d,setD]=useState(null);
  const [apiError,setApiError]=useState(false);
  const [hero,setHero]=useState(0);
  const [watchProgress,setWatchProgress]=useState(()=>readWatchProgress());
  const [becauseId,setBecauseId]=useState(null);
  const [becauseData,setBecauseData]=useState(null);
  const [becauseOpen,setBecauseOpen]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    apiFetch('/home')
      .then(data=>{if(!cancelled)setD(data)})
      .catch(()=>{if(!cancelled)setApiError(true)});
    return()=>{cancelled=true};
  },[]);

  useEffect(()=>{
    const refresh=()=>setWatchProgress(readWatchProgress());
    addEventListener('flixstar-watch-progress',refresh);
    addEventListener('storage',refresh);
    return()=>{removeEventListener('flixstar-watch-progress',refresh);removeEventListener('storage',refresh)};
  },[]);

  const heroItems=d?.hero||[];

  useEffect(()=>{
    if(heroItems.length>1){
      const t=setInterval(()=>setHero(x=>(x+1)%Math.min(heroItems.length,8)),8000);
      return()=>clearInterval(t);
    }
  },[heroItems.length]);

  const watchedItems=watchProgress
    .filter(x=>x?.id&&x?.progress>0)
    .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));

  useEffect(()=>{
    if(!becauseId&&watchedItems[0])setBecauseId(`${watchedItems[0].type}-${watchedItems[0].id}`);
  },[watchedItems.length]);

  useEffect(()=>{
    if(!becauseId){setBecauseData(null);return;}
    const selected=watchedItems.find(x=>`${x.type}-${x.id}`===becauseId);
    if(!selected)return;
    let cancelled=false;
    apiFetch(`/recommendations?type=${selected.type}&id=${selected.id}`)
      .then(data=>{if(!cancelled)setBecauseData(data)})
      .catch(()=>{if(!cancelled)setBecauseData({results:[]})});
    return()=>{cancelled=true};
  },[becauseId,watchProgress.length]);

  if(!d){
    return <main className="home">
     <SiteNav nav={nav}/>
      <section className="home-loading">
        <div className="spinner"/>
        <h2>{apiError?'Flixstar is taking a little longer':'Loading Flixstar…'}</h2>
        <p>{apiError?'Flixstar server did not respond after a few attempts. Refresh the page to try again.':'Flixstar server is starting. This can take a few seconds.'}</p>
      </section>
    </main>;
  }

  const h=heroItems[hero]||{};
  const selectedWatched=watchedItems.find(x=>`${x.type}-${x.id}`===becauseId);
  const continueItems=watchProgress.filter(x=>x?.id&&x?.progress>0&&x?.progress<.95).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
  const continueContent=continueItems.map(x=>({...x,media_type:x.type,title:x.title,name:x.name,poster_path:x.poster_path}));

  return <main className="home">
    <section className="home-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(4,12,12,.34) 0%,rgba(4,12,12,.08) 52%,rgba(4,12,12,.2) 100%),linear-gradient(0deg,rgba(3,12,12,.9),transparent 52%),url(${BG(h.backdrop_path)})`}}>
      <SiteNav nav={nav}/>
      <div className="hero-inner">
        <div className="hero-kicker">{mediaType(h)==='tv'?'TV SERIES':'MOVIE'}</div>
        <div className="hero-title">{h.logo_path?<img src={IMG(h.logo_path,'w500')} alt={title(h)}/>:<h1>{title(h)}</h1>}</div>
        <div className="hero-meta"><b>★ {h.vote_average?.toFixed(1)||'—'}/10</b><span>•</span><span>{year(h)||'—'}</span><span>•</span><span>{genreName(h)}</span></div>
        <p>{h.overview||'Discover something new to watch.'}</p>
        <div className="hero-actions">
          <button className="white-btn" onClick={()=>nav(`/${mediaType(h)}/${h.id}`)}><Play fill="currentColor" size={18}/> Play</button>
          <div className="glass-group">
            <button onClick={()=>toggleList(h)} aria-label={listed(h)?'Remove from list':'Add to list'} className="hero-icon-btn">{listed(h)?<Check size={21}/>:<Plus size={22}/>}</button>
            <i></i>
            <button onClick={()=>nav(`/${mediaType(h)}/${h.id}`)} aria-label="Movie information" className="hero-icon-btn"><Info size={20}/></button>
          </div>
        </div>
      </div>
      <div className="dots">{heroItems.slice(0,8).map((_,i)=><button key={i} aria-label={`Slide ${i+1}`} className={i===hero?'dot on':'dot'} onClick={()=>setHero(i)}/>)}</div>
    </section>

    

    <div className="home-body">
      
      {continueContent.length>0&&
      <ContinueWatching
        items={continueItems}
        nav={nav}
      />
    }

    <ProviderShelf nav={nav}/>

      {watchedItems.length>0&&becauseData?.results?.length>0&&<BecauseWatchedShelf
        watched={watchedItems}
        selected={selectedWatched}
        open={becauseOpen}
        setOpen={setBecauseOpen}
        setSelected={item=>{setBecauseId(`${item.type}-${item.id}`);setBecauseOpen(false)}}
        items={becauseData.results}
        nav={nav}
      />}

      <Shelf title="Trending Movies" items={d?.trendingMovies?.results||[]} nav={nav} viewAll={{type:'movie',sort:'popularity.desc',trending:true}}/>
      <Shelf title="Trending Series" items={d?.trendingSeries?.results||[]} nav={nav} viewAll={{type:'tv',sort:'popularity.desc',trending:true}}/>
      <ProviderSwitchShelf title="Movies on Netflix" type="movie" defaultProvider="8" nav={nav}/>
      <ProviderSwitchShelf title="TV Series on Netflix" type="tv" defaultProvider="8" nav={nav}/>
      <Shelf title="Award Winning Movies" items={d?.awardWinningMovies?.results||[]} nav={nav} viewAll={{type:'movie',preset:'awards'}}/>
      <Shelf title="Award Winning Shows" items={d?.awardWinningShows?.results||[]} nav={nav} viewAll={{type:'tv',preset:'awards'}}/>
      <Shelf title="Top Rated Movies" items={d?.topRatedMovies?.results||[]} nav={nav} viewAll={{type:'movie',sort:'vote_average.desc'}}/>
      <Shelf title="Top Rated Series" items={d?.topRatedSeries?.results||[]} nav={nav} viewAll={{type:'tv',sort:'vote_average.desc'}}/>
      <Shelf title="Oscar Nominees for Best Picture" items={d?.oscarBestPicture?.results||[]} nav={nav} viewAll={{type:'movie',preset:'oscar'}}/>
      <Shelf title="Psychological Thrillers" items={d?.psychologicalThrillers?.results||[]} nav={nav} viewAll={{type:'movie',preset:'psychological'}}/>
      <Shelf title="Cannes Film Festival" items={d?.cannesFilmFestival?.results||[]} nav={nav} viewAll={{type:'movie',preset:'cannes'}}/>
      <Shelf title="Halloween's Top 100" items={d?.halloweenTop100?.results||[]} nav={nav} viewAll={{type:'movie',preset:'halloween'}}/>
      <Shelf title="Rotten Tomatoes: Best Movies of All Time" items={d?.rtBest?.results||[]} nav={nav} viewAll={{type:'movie',preset:'rt'}}/>
      <Shelf title="Mindf*ck Movies" items={d?.mindBending?.results||[]} nav={nav} viewAll={{type:'movie',preset:'mindfuck'}}/>
      <Shelf title="Based on a True Story" items={d?.trueStory?.results||[]} nav={nav} viewAll={{type:'movie',preset:'true-story'}}/>
    </div>
  </main>;
}

function ContinueWatching({items,nav}){

  const [manage,setManage]=useState(false);

  if(!items?.length)return null;

  const openItem=(item)=>{
    const params=new URLSearchParams();

    if(item.type==='tv'){
      params.set('season',String(item.season||1));
      params.set('episode',String(item.episode||1));
    }

    if(item.timestamp>0){
      params.set('progress',String(Math.floor(item.timestamp)));
    }

    const query=params.toString();

    nav(
      `/watch/${item.type}/${item.id}`+
      (query ? `?${query}` : '')
    );
  };

  return (
    <section className="continue-section">

      <div className="continue-head">

        <h2>Continue Watching</h2>

        <button
          className={`continue-manage ${manage?'active':''}`}
          onClick={()=>setManage(x=>!x)}
          aria-label="Manage Continue Watching"
        >
          ✎
        </button>

      </div>

      <div className="continue-row">

        {items
          .slice()
          .sort(
            (a,b)=>
              (b.updatedAt||0)-
              (a.updatedAt||0)
          )
          .slice(0,10)
          .map(item=>{

            const percent=Math.min(
              100,
              Math.max(
                0,
                Number(item.progress||0)*100
              )
            );

            const remaining=Math.max(
              0,
              Number(item.duration||0)-
              Number(item.timestamp||0)
            );

            return (
              <article
                className="continue-card"
                key={`${item.type}-${item.id}-${item.season||0}-${item.episode||0}`}
              >

                <button
                  className="continue-poster"
                  onClick={()=>{
                    if(!manage)openItem(item);
                  }}
                >

                  {item.backdrop_path ? (
                  <img
                    src={IMG(item.backdrop_path,'w780')}
                    alt={item.title||item.name}
                  />
                ) : item.poster_path ? (
                  <img
                    src={IMG(item.poster_path,'w500')}
                    alt={item.title||item.name}
                  />
                ) : (
                  <div className="poster-empty">
                    FLIXSTAR
                  </div>
                )}

                  <div className="continue-overlay">

                    <span className="continue-play">
                      <Play
                        fill="currentColor"
                        size={25}
                      />
                    </span>

                  </div>

                  <div className="continue-progress">
                    <span
                      style={{
                        width:`${percent}%`
                      }}
                    />
                  </div>

                </button>

                <div className="continue-info">

                  <div className="continue-title">
                    {item.title||item.name}
                  </div>

                  {item.type==='tv' && (
                    <div className="continue-episode">
                      S{item.season} E{item.episode}
                    </div>
                  )}

                  <div className="continue-time">

                    <Clock3 size={14}/>

                    {remaining>0
                      ? `${formatTime(remaining)} left`
                      : `${Math.round(percent)}% watched`
                    }

                  </div>

                </div>

                {manage && (
                  <button
                    className="continue-remove"
                    onClick={()=>{
                      removeWatchProgress(item);
                    }}
                    aria-label={`Remove ${item.title||item.name}`}
                  >
                    ×
                  </button>
                )}

              </article>
            );
          })}

      </div>

    </section>
  );
}

function ProviderSwitchShelf({title,type,defaultProvider,nav}){
  const [providers,setProviders]=useState([]);
  const [provider,setProvider]=useState(defaultProvider);
  const [items,setItems]=useState([]);
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    Promise.all([apiFetch('/providers?region=US'),apiFetch(`/discover?type=${type}&provider=${defaultProvider}&page=1`)])
      .then(([p,d])=>{if(!cancelled){setProviders(p.providers||[]);setItems(d.results||[])}})
      .catch(()=>{})
    return()=>{cancelled=true};
  },[type,defaultProvider]);

  useEffect(()=>{
    if(provider===defaultProvider)return;
    let cancelled=false;
    apiFetch(`/discover?type=${type}&provider=${provider}&page=1`).then(d=>{if(!cancelled)setItems(d.results||[])}).catch(()=>{if(!cancelled)setItems([])});
    return()=>{cancelled=true};
  },[provider,type,defaultProvider]);

  const current=providers.find(p=>String(p.provider_id)===String(provider));
  if(!items.length)return null;
  const heading=`${type==='tv'?'TV Series':'Movies'} on`;
  return <section className="shelf provider-switch-shelf">
    <div className="shelf-head">
      <div className="provider-title-wrap">
        <h2>{heading}</h2>
        <div className="provider-picker-wrap">
          <button className="provider-picker" onClick={()=>setOpen(!open)} aria-label="Choose provider">{current?.provider_name||'Netflix'} <ChevronRight size={14} className={open?'picker-open':''}/></button>
          {open&&<div className="provider-picker-menu">{providers.slice(0,16).map(p=><button key={p.provider_id} onClick={()=>{setProvider(String(p.provider_id));setOpen(false)}}>{p.logo_path&&<img src={IMG(p.logo_path,'w92')} alt=""/>}<span>{p.provider_name}</span></button>)}</div>}
        </div>
      </div>
      <button onClick={()=>nav(`/${type==='tv'?'shows':'movies'}?provider=${provider}`)}>View all <ChevronRight size={16}/></button>
    </div>
    <div className="poster-row">{items.slice(0,10).map((x,i)=><Poster key={`${mediaType(x)}-${x.id}-${i}`} item={x} nav={nav}/>)}</div>
  </section>;
}
function ProviderPage({id,name,nav}){
  const [movies,setMovies]=useState({results:[]});
  const [shows,setShows]=useState({results:[]});
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    Promise.all([
      apiFetch(`/discover?type=movie&provider=${encodeURIComponent(id)}&page=1`),
      apiFetch(`/discover?type=tv&provider=${encodeURIComponent(id)}&page=1`)
    ]).then(([m,t])=>{if(!cancelled){setMovies(m);setShows(t);setLoading(false)}}).catch(()=>{if(!cancelled)setLoading(false)});
    return()=>{cancelled=true};
  },[id]);
  return <><SiteNav nav={nav}/>
    <main className="provider-page">
      <button className="provider-back" onClick={()=>nav('/')}><ArrowLeft size={17}/> Home</button>
      <div className="provider-page-head"><div><div className="detail-label">STREAMING PROVIDER</div><h1>{name}</h1><p>Movies and TV series available on {name}.</p></div></div>
      {loading?<div className="provider-loading"><div className="spinner"/><p>Loading {name} titles…</p></div>:<>
        <section className="provider-results"><div className="section-heading"><h2>Movies on {name}</h2></div>{movies.results?.length?<div className="poster-grid">{movies.results.map((x,i)=><Poster item={x} nav={nav} key={`m-${x.id}-${i}`}/>)}</div>:<p className="provider-empty">No movies found.</p>}</section>
        <section className="provider-results"><div className="section-heading"><h2>TV Series on {name}</h2></div>{shows.results?.length?<div className="poster-grid">{shows.results.map((x,i)=><Poster item={x} nav={nav} key={`t-${x.id}-${i}`}/>)}</div>:<p className="provider-empty">No TV series found.</p>}</section>
      </>}
    </main><Footer nav={nav}/></>;
}

function ProviderShelf({nav}){
  const [providers,setProviders]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;
    apiFetch('/providers?region=US')
      .then(data=>{if(!cancelled)setProviders(data.providers||[]);})
      .catch(()=>{if(!cancelled)setProviders([]);})
      .finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true};
  },[]);

  if(loading&&!providers.length)return <section className="provider-shelf"><div className="shelf-head"><h2>Browse by Provider</h2></div><div className="provider-row provider-loading-row"><div className="spinner"/></div></section>;
  if(!providers.length)return null;

  return <section className="provider-shelf">
    <div className="shelf-head"><h2>Browse by Provider</h2></div>
    <div className="provider-row">
      {providers.map(p=><button className="provider-card" key={p.provider_id} onClick={()=>nav(`/provider/${p.provider_id}?name=${encodeURIComponent(p.provider_name)}`)} title={p.provider_name}>
        {p.logo_path?<img src={IMG(p.logo_path,'w200')} alt={p.provider_name}/>:<span className="provider-logo">{p.provider_name?.slice(0,2)}</span>}
        <small>{p.provider_name}</small>
      </button>)}
    </div>
  </section>;
}



function BecauseWatchedShelf({watched,selected,open,setOpen,setSelected,items,nav}){
  return <section className="shelf because-shelf">
    <div className="shelf-head">
      <div className="because-title-wrap">
        <h2>Because you watched</h2>
        <div className="because-picker-wrap">
          <button className="because-picker" onClick={()=>setOpen(!open)}>{selected?.title||selected?.name||'Choose a title'} <ChevronRight size={15} className={open?'picker-open':''}/></button>
          {open&&<div className="because-menu">
            {watched.map(item=><button key={`${item.type}-${item.id}`} onClick={()=>setSelected(item)}>{item.title||item.name}</button>)}
          </div>}
        </div>
      </div>
      <button onClick={()=>selected&&nav(`/recommendations/${selected.type}/${selected.id}`)}>View all <ChevronRight size={16}/></button>
    </div>
    <div className="poster-row">{items.slice(0,10).map((x,i)=><Poster key={`${mediaType(x)}-${x.id}-${i}`} item={x} nav={nav}/>)}</div>
  </section>;
}


function Shelf({title,items,nav,compact,viewAll}){
  if(!items?.length)return null;
  const go=()=>{
    if(!viewAll)return nav('/movies');
    const type=viewAll.type||'movie';
    const params=new URLSearchParams();
    if(viewAll.provider)params.set('provider',viewAll.provider);
    if(viewAll.sort)params.set('sort',viewAll.sort);
    if(viewAll.preset)params.set('preset',viewAll.preset);
    if(viewAll.trending)params.set('trending','1');
    nav(`/${type==='tv'?'shows':'movies'}${params.toString()?`?${params}`:''}`);
  };
  return <section className={`shelf ${compact?'compact':''}`}><div className="shelf-head"><h2>{title}</h2>{viewAll&&<div><button onClick={go}>View all <ChevronRight size={16}/></button></div>}</div><div className="poster-row">{items.slice(0,10).map((x,i)=><Poster key={`${mediaType(x)}-${x.id}-${i}`} item={x} nav={nav}/>)}</div></section>
}
function Poster({item,nav,wide=false}){
  const type=mediaType(item);

  return (
    <button
      className={`poster-card ${wide?'wide':''}`}
      onClick={()=>nav(`/${type}/${item.id}`)}
    >
      <div className="poster-img">
        {item.poster_path
          ? <img src={IMG(item.poster_path)} alt=""/>
          : <div className="poster-empty">FLIXSTAR</div>
        }

        {item.vote_average>0&&
          <span className="mini-rating">
            ★ {item.vote_average.toFixed(1)}
          </span>
        }

        <span className="poster-hover">
          <span className="poster-hover-play">
            <Play fill="currentColor" size={24}/>
          </span>

          <span className="poster-hover-info">
            <b>{title(item)}</b>
            <span>
              {year(item)||'—'} <i>★</i> {item.vote_average?.toFixed(1)||'—'}
            </span>
          </span>
        </span>
      </div>
    </button>
  );
}

function RecommendationsPage({type,id,nav}){
  const [data,setData]=useState({results:[]});
  const [source,setSource]=useState(null);
  useEffect(()=>{
    let cancelled=false;
    Promise.all([apiFetch(`/recommendations?type=${type}&id=${id}`),apiFetch(`/${type}/${id}`)])
      .then(([r,d])=>{if(!cancelled){setData(r);setSource(d)}})
      .catch(()=>{});
    return()=>{cancelled=true};
  },[type,id]);
  return <><SiteNav nav={nav} active={type==='tv'?'shows':'movies'} query="" setQuery={()=>{}} onSearch={()=>{}} menu={false} setMenu={()=>{}}/><main className="listing-page"><PageTitle title={source?`Because you watched ${title(source)}`:'Recommended for you'} subtitle={source?`More movies and series based on ${title(source)}.`:''}/><div className="poster-grid">{data.results?.map((x,i)=><Poster item={x} nav={nav} key={`${x.id}-${i}`}/>)}</div></main><Footer nav={nav}/></>
}

function UpcomingMovies({nav}){
  const [movies,setMovies]=useState([]);
  const [offset,setOffset]=useState(0);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;

    apiFetch('/upcoming?region=US&page=1')
      .then(data=>{
        if(!cancelled){
          setMovies(data.results||[]);
          setLoading(false);
        }
      })
      .catch(()=>{
        if(!cancelled){
          setMovies([]);
          setLoading(false);
        }
      });

    return()=>{cancelled=true};
  },[]);

  if(loading){
    return (
      <section className="upcoming-section">
        <div className="section-heading">
          <h2>Upcoming</h2>
        </div>

        <div className="upcoming-loading">
          <div className="spinner"/>
        </div>
      </section>
    );
  }

  if(!movies.length)return null;

  const visible=movies.slice(offset,offset+5);

  const next=()=>{
    if(offset+5<movies.length){
      setOffset(x=>Math.min(x+3,movies.length-5));
    }
  };

  const previous=()=>{
    if(offset>0){
      setOffset(x=>Math.max(x-3,0));
    }
  };

  return (
    <section className="upcoming-section">
      <div className="section-heading">
        <h2>Upcoming</h2>
      </div>

      <div className="upcoming-carousel">

        <button
          className="upcoming-arrow upcoming-arrow-left"
          onClick={previous}
          disabled={offset===0}
          aria-label="Previous upcoming movies"
        >
          <ChevronLeft size={27}/>
        </button>

        <div className="upcoming-row">
          {visible.map((movie,i)=>(
            <button
              className="upcoming-card"
              key={`${movie.id}-${i}`}
              onClick={()=>nav(`/movie/${movie.id}`)}
            >
              <div className="upcoming-image">

                {movie.backdrop_path
                  ? <img
                      src={IMG(movie.backdrop_path,'w780')}
                      alt={title(movie)}
                    />
                  : <div className="upcoming-empty"/>
                }

                <div className="upcoming-hover">
                  <b>{title(movie)}</b>

                  <span>
                    <CalendarDays size={13}/>
                    {movie.release_date
                      ? new Date(movie.release_date).toLocaleDateString(
                          'en-US',
                          {
                            month:'short',
                            day:'numeric'
                          }
                        )
                      : 'TBA'
                    }
                  </span>
                </div>

                <span className="coming-soon">
                  Coming Soon
                </span>

              </div>
            </button>
          ))}
        </div>

        <button
          className="upcoming-arrow upcoming-arrow-right"
          onClick={next}
          disabled={offset+5>=movies.length}
          aria-label="Next upcoming movies"
        >
          <ChevronRight size={27}/>
        </button>

      </div>
    </section>
  );
}

function MoviesHero({nav,listed,toggleList}){
  const [movies,setMovies]=useState([]);
  const [hero,setHero]=useState(0);

  useEffect(()=>{
    let cancelled=false;

    apiFetch('/trending-movies')
      .then(data=>{
        if(!cancelled){
          setMovies((data.results||[]).slice(0,8));
        }
      })
      .catch(()=>{
        if(!cancelled)setMovies([]);
      });

    return()=>{cancelled=true};
  },[]);

  useEffect(()=>{
    if(movies.length>1){
      const t=setInterval(()=>{
        setHero(x=>(x+1)%Math.min(movies.length,8));
      },8000);

      return()=>clearInterval(t);
    }
  },[movies.length]);

  if(!movies.length)return null;

  const h=movies[hero]||{};

  return (
    <section
      className="home-hero"
      style={{
        backgroundImage:
          `linear-gradient(90deg,rgba(4,12,12,.34) 0%,rgba(4,12,12,.08) 52%,rgba(4,12,12,.2) 100%),linear-gradient(0deg,rgba(3,12,12,.9),transparent 52%),url(${BG(h.backdrop_path)})`
      }}
    >

      <SiteNav nav={nav}/>

      <div className="hero-inner">

        <div className="hero-kicker">
          MOVIE
        </div>

        <div className="hero-title">
          {h.logo_path
            ? <img src={IMG(h.logo_path,'w500')} alt={title(h)}/>
            : <h1>{title(h)}</h1>
          }
        </div>

        <div className="hero-meta">
          <b>★ {h.vote_average?.toFixed(1)||'—'}/10</b>
          <span>•</span>
          <span>{year(h)||'—'}</span>
          <span>•</span>
          <span>{genreName(h)}</span>
        </div>

        <p>
          {h.overview||'Discover something new to watch.'}
        </p>

        <div className="hero-actions">

          <button
            className="white-btn"
            onClick={()=>nav(`/movie/${h.id}`)}
          >
            <Play fill="currentColor" size={18}/>
            Play
          </button>

          <div className="glass-group">

            <button
              onClick={()=>toggleList(h)}
              aria-label={
                listed(h)
                  ? 'Remove from list'
                  : 'Add to list'
              }
              className="hero-icon-btn"
            >
              {listed(h)
                ? <Check size={21}/>
                : <Plus size={22}/>
              }
            </button>

            <i></i>

            <button
              onClick={()=>nav(`/movie/${h.id}`)}
              aria-label="Movie information"
              className="hero-icon-btn"
            >
              <Info size={20}/>
            </button>

          </div>

        </div>

      </div>

      <div className="dots">
        {movies.slice(0,8).map((_,i)=>(
          <button
            key={i}
            aria-label={`Slide ${i+1}`}
            className={i===hero?'dot on':'dot'}
            onClick={()=>setHero(i)}
          />
        ))}
      </div>

    </section>
  );
}

function ShowsHero({nav,listed,toggleList}){
  const [shows,setShows]=useState([]);
  const [hero,setHero]=useState(0);

  useEffect(()=>{
    let cancelled=false;

    apiFetch('/trending-shows')
      .then(data=>{
        if(!cancelled){
          setShows((data.results||[]).slice(0,8));
        }
      })
      .catch(()=>{
        if(!cancelled)setShows([]);
      });

    return()=>{cancelled=true};
  },[]);

  useEffect(()=>{
    if(shows.length>1){
      const t=setInterval(()=>{
        setHero(x=>(x+1)%Math.min(shows.length,8));
      },8000);

      return()=>clearInterval(t);
    }
  },[shows.length]);

  const h=shows[hero]||{};

  return (
    <section
      className="home-hero"
      style={h.backdrop_path ? {
        backgroundImage:
          `linear-gradient(90deg,rgba(4,12,12,.34) 0%,rgba(4,12,12,.08) 52%,rgba(4,12,12,.2) 100%),linear-gradient(0deg,rgba(3,12,12,.9),transparent 52%),url(${BG(h.backdrop_path)})`
      } : undefined}
    >

      <SiteNav nav={nav}/>

      {shows.length>0 && (
        <>
          <div className="hero-inner">

            <div className="hero-kicker">
              TV SERIES
            </div>

            <div className="hero-title">
            {h.logo_path
              ? <img src={IMG(h.logo_path,'w500')} alt={title(h)}/>
              : <h1>{title(h)}</h1>
            }
          </div>

            <div className="hero-meta">
              <b>
                ★ {h.vote_average?.toFixed(1)||'—'}/10
              </b>

              <span>•</span>

              <span>{year(h)||'—'}</span>

              <span>•</span>

              <span>{genreName(h)}</span>
            </div>

            <p>
              {h.overview||'Discover something new to watch.'}
            </p>

            <div className="hero-actions">

              <button
                className="white-btn"
                onClick={()=>nav(`/tv/${h.id}`)}
              >
                <Play fill="currentColor" size={18}/>
                Play
              </button>

              <div className="glass-group">

                <button
                  onClick={()=>toggleList(h)}
                  aria-label={
                    listed(h)
                      ? 'Remove from list'
                      : 'Add to list'
                  }
                  className="hero-icon-btn"
                >
                  {listed(h)
                    ? <Check size={21}/>
                    : <Plus size={22}/>
                  }
                </button>

                <i></i>

                <button
                  onClick={()=>nav(`/tv/${h.id}`)}
                  aria-label="Series information"
                  className="hero-icon-btn"
                >
                  <Info size={20}/>
                </button>

              </div>

            </div>

          </div>

          <div className="dots">
            {shows.slice(0,8).map((_,i)=>(
              <button
                key={i}
                aria-label={`Slide ${i+1}`}
                className={i===hero?'dot on':'dot'}
                onClick={()=>setHero(i)}
              />
            ))}
          </div>
        </>
      )}

    </section>
  );
}

function NewSeasonsAiring({nav}){
  const [shows,setShows]=useState([]);
  const [offset,setOffset]=useState(0);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;

    apiFetch('/new-seasons')
      .then(data=>{
        if(!cancelled){
          setShows(data.results||[]);
          setLoading(false);
        }
      })
      .catch(()=>{
        if(!cancelled){
          setShows([]);
          setLoading(false);
        }
      });

    return()=>{cancelled=true};
  },[]);

  if(loading){
    return (
      <section className="upcoming-section">
        <div className="section-heading">
          <h2>New Seasons Airing</h2>
        </div>

        <div className="upcoming-loading">
          <div className="spinner"/>
        </div>
      </section>
    );
  }

  if(!shows.length)return null;

  const visible=shows.slice(offset,offset+5);

  const next=()=>{
    if(offset+5<shows.length){
      setOffset(x=>Math.min(x+3,shows.length-5));
    }
  };

  const previous=()=>{
    if(offset>0){
      setOffset(x=>Math.max(x-3,0));
    }
  };

  return (
    <section className="upcoming-section">
      <div className="section-heading">
        <h2>New Seasons Airing</h2>
      </div>

      <div className="upcoming-carousel">

        <button
          className="upcoming-arrow upcoming-arrow-left"
          onClick={previous}
          disabled={offset===0}
          aria-label="Previous new seasons"
        >
          <ChevronLeft size={27}/>
        </button>

        <div className="upcoming-row">

          {visible.map((show,i)=>(
            <button
              className="upcoming-card"
              key={`${show.id}-${i}`}
              onClick={()=>nav(`/tv/${show.id}`)}
            >
              <div className="upcoming-image">

                {show.backdrop_path
                  ? (
                    <img
                      src={IMG(show.backdrop_path,'w780')}
                      alt={title(show)}
                    />
                  )
                  : <div className="upcoming-empty"/>
                }

                <div className="upcoming-hover">

                  <b>{title(show)}</b>

                  <span>
  <CalendarDays size={13}/>

  {show.episode_number
    ? `Ep ${show.episode_number} · `
    : ''
  }

  {show.air_date
    ? new Date(show.air_date).toLocaleDateString(
        'en-US',
        {
          month:'short',
          day:'numeric'
        }
      )
    : 'Airing now'
  }
</span>

                </div>

                <span className="coming-soon">
                  Season {show.season_number}
                </span>

              </div>
            </button>
          ))}

        </div>

        <button
          className="upcoming-arrow upcoming-arrow-right"
          onClick={next}
          disabled={offset+5>=shows.length}
          aria-label="Next new seasons"
        >
          <ChevronRight size={27}/>
        </button>

      </div>
    </section>
  );
}


function Listing({
  type,
  nav,
  title:heading,
  subtitle,
  listed,
  toggleList
}){
  const [page,setPage]=useState(1);
  const params=new URLSearchParams(location.search);

  const [filter,setFilter]=useState({
    genre:params.get('genre')||'',
    sort:params.get('sort')||'popularity.desc',
    year:params.get('year')||'',
    country:params.get('country')||'',
    provider:params.get('provider')||''
  });

  const [data,setData]=useState({results:[]});
  const [genres,setGenres]=useState([]);
  const [providers,setProviders]=useState([]);
  const [showGenre,setShowGenre]=useState(false);
  const [showSort,setShowSort]=useState(false);
  const [showProvider,setShowProvider]=useState(false);
  const [showCountry,setShowCountry]=useState(false);

  useEffect(()=>{
    apiFetch(`/genres?type=${type}`)
      .then(x=>setGenres(x.genres||[]))
      .catch(()=>{});

    apiFetch('/providers?region=US')
      .then(x=>setProviders(x.providers||[]))
      .catch(()=>{});
  },[type]);

  useEffect(()=>{
    const qs=new URLSearchParams({
      type,
      page,
      ...filter
    });

    apiFetch(`/discover?${qs}`)
      .then(setData)
      .catch(()=>setData({results:[]}));
  },[type,page,filter]);

  const changeFilter=(key,value)=>{
    setPage(1);
    setFilter(prev=>({...prev,[key]:value}));
  };

  const randomize=()=>{
    const randomPage=Math.floor(Math.random()*20)+1;
    setPage(randomPage);
    setFilter(prev=>({...prev,sort:'popularity.desc'}));
  };

  const sortOptions=[
    ['popularity.desc','Popular'],
    ['vote_average.desc','Top Rated'],
    [type==='movie'?'primary_release_date.desc':'first_air_date.desc','Newest'],
    [type==='movie'?'primary_release_date.asc':'first_air_date.asc','Oldest']
  ];

  const currentSort=sortOptions.find(x=>x[0]===filter.sort)?.[1]||'Popular';

  return (
  <>
    {type==='movie' ? (
  <MoviesHero
    nav={nav}
    listed={listed}
    toggleList={toggleList}
  />
) : (
  <ShowsHero
    nav={nav}
    listed={listed}
    toggleList={toggleList}
  />
)}

    

      

      <main className="listing-page">


  <PageTitle
    title={heading}
    subtitle={subtitle}
  />

 {type==='movie'
  ? <UpcomingMovies nav={nav}/>
  : <NewSeasonsAiring nav={nav}/>
}

  <div className="filter-bar">

          {/* Random */}
          <button
            className="filter-chip"
            onClick={randomize}
          >
            <Dices size={15}/>
            Random
          </button>

          {/* Genre */}
          <div className="filter-dropdown">
            <button
              className={`filter-chip ${filter.genre?'selected':''}`}
              onClick={()=>setShowGenre(x=>!x)}
            >
              {filter.genre
                ? genres.find(g=>String(g.id)===String(filter.genre))?.name||'Genre'
                : 'Genre'
              }
              <ChevronDown size={14}/>
            </button>

            {showGenre&&(
              <div className="filter-menu">
                <button onClick={()=>{
                  changeFilter('genre','');
                  setShowGenre(false);
                }}>
                  All Genres
                </button>

                {genres.map(g=>(
                  <button
                    key={g.id}
                    className={String(filter.genre)===String(g.id)?'active':''}
                    onClick={()=>{
                      changeFilter('genre',String(g.id));
                      setShowGenre(false);
                    }}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Year */}
          <div className="filter-dropdown">
            <select
              value={filter.year}
              onChange={e=>changeFilter('year',e.target.value)}
            >
              <option value="">Year</option>

              {Array.from(
                {length:30},
                (_,i)=>2026-i
              ).map(y=>(
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="filter-dropdown">
            <button
              className="filter-chip"
              onClick={()=>setShowSort(x=>!x)}
            >
              {currentSort}
              <ChevronDown size={14}/>
            </button>

            {showSort&&(
              <div className="filter-menu">
                {sortOptions.map(([value,label])=>(
                  <button
                    key={value}
                    className={filter.sort===value?'active':''}
                    onClick={()=>{
                      changeFilter('sort',value);
                      setShowSort(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Provider */}
          <div className="filter-dropdown">
            <button
              className={`filter-chip ${filter.provider?'selected':''}`}
              onClick={()=>setShowProvider(x=>!x)}
            >
              {filter.provider
                ? providers.find(
                    p=>String(p.provider_id)===String(filter.provider)
                  )?.provider_name||'Provider'
                : 'Provider'
              }
              <ChevronDown size={14}/>
            </button>

            {showProvider&&(
              <div className="filter-menu provider-filter-menu">

                <button onClick={()=>{
                  changeFilter('provider','');
                  setShowProvider(false);
                }}>
                  All Providers
                </button>

                {providers.map(p=>(
                  <button
                    key={p.provider_id}
                    className={
                      String(filter.provider)===String(p.provider_id)
                        ? 'active'
                        : ''
                    }
                    onClick={()=>{
                      changeFilter(
                        'provider',
                        String(p.provider_id)
                      );
                      setShowProvider(false);
                    }}
                  >
                    {p.logo_path&&(
                      <img
                        src={IMG(p.logo_path,'w200')}
                        alt=""
                      />
                    )}
                    <span>{p.provider_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Country */}
          <div className="filter-dropdown">
            <button
              className={`filter-chip ${filter.country?'selected':''}`}
              onClick={()=>setShowCountry(x=>!x)}
            >
              {filter.country==='US'
                ? 'USA'
                : filter.country==='GB'
                ? 'UK'
                : filter.country==='KR'
                ? 'South Korea'
                : filter.country==='JP'
                ? 'Japan'
                : 'Country'
              }
              <ChevronDown size={14}/>
            </button>

            {showCountry&&(
              <div className="filter-menu">
                <button onClick={()=>{
                  changeFilter('country','');
                  setShowCountry(false);
                }}>
                  All Countries
                </button>

                {[
                  ['US','USA'],
                  ['GB','UK'],
                  ['KR','South Korea'],
                  ['JP','Japan'],
                  ['FR','France'],
                  ['DE','Germany'],
                  ['IN','India'],
                  ['ES','Spain']
                ].map(([code,name])=>(
                  <button
                    key={code}
                    className={filter.country===code?'active':''}
                    onClick={()=>{
                      changeFilter('country',code);
                      setShowCountry(false);
                    }}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Results */}
        <div className="poster-grid">
          {data.results?.map((x,i)=>(
            <Poster
              item={x}
              nav={nav}
              key={`${x.id}-${i}`}
            />
          ))}
        </div>

        {!data.results?.length&&(
          <div className="listing-empty">
            <h3>No titles found</h3>
            <p>Try changing your filters.</p>
          </div>
        )}

        <div className="pager">
          <button
            disabled={page<=1}
            onClick={()=>setPage(page-1)}
          >
            <ChevronLeft/>
          </button>

          <span>{page}</span>

          <button
            disabled={
              !data.total_pages ||
              page>=Math.min(data.total_pages,20)
            }
            onClick={()=>setPage(page+1)}
          >
            <ChevronRight/>
          </button>
        </div>

      </main>

      <Footer nav={nav}/>
    </>
  );
}
function PageTitle({title,subtitle}){return <div className="page-title"><h1>{title}</h1><p>{subtitle}</p></div>}

function SearchPage({q,nav}){

  const [search,setSearch]=useState(q||'');
  const [results,setResults]=useState([]);
  const [trending,setTrending]=useState([]);
  const [loading,setLoading]=useState(false);

  /* Load Trending Today */
  useEffect(()=>{
    apiFetch('/trending')
      .then(data=>{
        setTrending(data.results||[]);
      })
      .catch(()=>{
        setTrending([]);
      });
  },[]);

  /* Live search */
  useEffect(()=>{
    const value=search.trim();

    if(!value){
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer=setTimeout(()=>{
      apiFetch(`/search?query=${encodeURIComponent(value)}`)
        .then(data=>{
          setResults(data.results||[]);
        })
        .catch(()=>{
          setResults([]);
        })
        .finally(()=>{
          setLoading(false);
        });
    },250);

    return()=>clearTimeout(timer);

  },[search]);

  const hasSearch=search.trim().length>0;

  const people=results
  .filter(x=>x.media_type==='person' && x.profile_path);

  const moviesAndTv=results
    .filter(x=>x.media_type==='movie'||x.media_type==='tv');

  return (
    <main className="search-page">

      <section className="search-hero">

        <SiteNav
          nav={nav}
          query={search}
          setQuery={setSearch}
          onSearch={e=>e.preventDefault()}
          active=""
          menu={false}
          setMenu={()=>{}}
        />

        <div className="search-hero-content">

          <h1>Find your next favorite story</h1>

          <form
            className="search-main-form"
            onSubmit={e=>e.preventDefault()}
          >

            <Search size={23}/>

            <input
              type="text"
              value={search}
              onChange={e=>setSearch(e.target.value)}
              placeholder="Search movies, shows, people..."
              autoFocus
            />

            {search && (
              <button
                type="button"
                onClick={()=>setSearch('')}
                aria-label="Clear search"
              >
                <X size={20}/>
              </button>
            )}

          </form>

        </div>


        {!hasSearch ? (

          /* TRENDING */
          <section className="search-trending">

            <h2>Trending Today</h2>

            <div className="search-trending-row">

              {trending.map((item,i)=>(
                <Poster
                  key={`${item.media_type}-${item.id}-${i}`}
                  item={item}
                  nav={nav}
                />
              ))}

            </div>

          </section>

        ) : (

          /* LIVE SEARCH RESULTS */
          <section className="search-results">

            {loading ? (

              <div className="search-loading">
                <span>Searching...</span>
              </div>

            ) : (

              <>

                {/* PEOPLE */}
                {people.length>0 && (
                  <section className="search-people">

                    <div className="search-results-head">
                      <h2>People</h2>
                    </div>

                    <div className="search-people-row">

                      {people.map(person=>(
                        <button
                          className="search-person-card"
                          key={person.id}
                          onClick={()=>nav(`/person/${person.id}`)}
                        >

                          <div className="search-person-image">

                            <img
                              src={IMG(person.profile_path,'w185')}
                              alt={person.name}
                            />

                          </div>

                          <strong>{person.name}</strong>

                        </button>
                      ))}

                    </div>

                  </section>
                )}


                {/* MOVIES & TV */}
                {moviesAndTv.length>0 && (
                  <section className="search-media">

                    <div className="search-results-head">
                      <h2>Movies & TV</h2>
                    </div>

                    <div className="poster-grid">

                      {moviesAndTv.map((item,i)=>(
                        <Poster
                          key={`${item.media_type}-${item.id}-${i}`}
                          item={item}
                          nav={nav}
                        />
                      ))}

                    </div>

                  </section>
                )}


                {/* NOTHING FOUND */}
                {!people.length && !moviesAndTv.length && (
                  <div className="search-empty">

                    <Search size={42}/>

                    <h3>No results found</h3>

                    <p>
                      We couldn't find anything matching “{search}”
                    </p>

                  </div>
                )}

              </>

            )}

          </section>

        )}

      </section>

    </main>
  );
}

function Detail({type,id,nav,listed,toggleList}){
  const [d,setD]=useState(null);
  const [tab,setTab]=useState('info');
  const [trailerOpen,setTrailerOpen]=useState(false);useEffect(()=>{apiFetch(`/${type}/${id}`).then(setD)},[type,id]);if(!d)return <Loading/>;const t=title(d);return <><div className="detail-page" style={{backgroundImage:`linear-gradient(90deg,rgba(7,8,10,.9) 0%,rgba(7,8,10,.52) 45%,rgba(7,8,10,.88) 100%),linear-gradient(0deg,#070809 0%,transparent 45%),url(${BG(d.backdrop_path)})`}}><SiteNav nav={nav}/>
  <div className="detail-inner"><button className="back" onClick={()=>nav(type==='movie'?'/movies':'/shows')}><ArrowLeft size={19}/></button><div className="detail-copy">
   {d.logo_path ? (
  <img
    className={`detail-logo ${type==='tv'?'tv-detail-logo':''}`}
    src={IMG(d.logo_path,'w500')}
    alt={t}
  />
) : (
  <h1>{t}</h1>
)}

<div className="detail-meta">
  <span>{year(d)}</span>

  {type==='tv' ? (
    <span className="certification">
      {d.content_ratings?.find(x=>x.iso_3166_1==='US')?.rating||'TV-MA'}
    </span>
  ) : (
    <span>
      {d.runtime
        ? `${Math.floor(d.runtime/60)}h ${d.runtime%60}m`
        : ''}
    </span>
  )}

  <span>★ {d.vote_average?.toFixed(1)||'—'}</span>

  {d.genres?.slice(0,3).map(g=>(
    <span key={g.id}>{g.name}</span>
  ))}
</div>
<div className="detail-buttons">

  <button
  className="white-btn"
  onClick={()=>{
    if(type==='tv'){
      nav(`/watch/tv/${id}?season=1&episode=1`);
    }else{
      nav(`/watch/movie/${id}`);
    }
  }}
>
  <Play fill="currentColor" size={18}/>
  Play
</button>

  <button
    className="circle-btn"
    onClick={()=>toggleList(d)}
    title={listed(d)?'Remove from My List':'Add to My List'}
  >
    {listed(d)
      ? <Check size={20}/>
      : <Plus size={20}/>
    }
  </button>

  <button
    className="circle-btn"
    title="Download"
  >
    <Download size={20}/>
  </button>

  <button
    className="circle-btn"
    onClick={()=>{
      localStorage.setItem(
        `flixstar-watched-${type}-${id}`,
        'true'
      );
      window.dispatchEvent(new Event('flixstar-watched'));
    }}
    title="Mark as watched"
  >
    <Eye size={20}/>
  </button>

  <button
    className="circle-btn"
    onClick={()=>{
      if(navigator.share){
        navigator.share({
          title:t,
          text:`Check out ${t} on Flixstar`
        }).catch(()=>{});
      }
    }}
    title="Share"
  >
    <Share2 size={20}/>
  </button>

</div><p className="detail-overview">{d.overview}</p><div className="credits-line">
  <b>{type==='tv'?'Creator':'Director'}</b>{' '}
  {type==='tv'
    ? (d.created_by?.map(x=>x.name).join(', ')||'—')
    : (d.credits?.crew?.find(c=>c.job==='Director')?.name||'—')
  }
</div></div>
<aside className={`facts ${type==='tv'?'tv-facts':''}`}>
  {type==='tv' ? (
    <>
      <div>
        <span>Status</span>
        <b>{d.status||'—'}</b>
      </div>

      <div>
        <span>Language</span>
        <b>{d.original_language?.toUpperCase()||'—'}</b>
      </div>

      <div>
        <span>First Aired</span>
        <b>{d.first_air_date||'—'}</b>
      </div>

      <div>
        <span>Last Aired</span>
        <b>{d.last_air_date||'—'}</b>
      </div>

      <div>
        <span>Seasons</span>
        <b>{d.number_of_seasons||0}</b>
      </div>

      <div>
        <span>Episodes</span>
        <b>{d.number_of_episodes||0}</b>
      </div>
    </>
  ) : (
    <>
      <div>
        <span>Runtime</span>
        <b>
          {d.runtime
            ? `${Math.floor(d.runtime/60)}h ${d.runtime%60}m`
            : '—'}
        </b>
      </div>

      <div>
        <span>Language</span>
        <b>{d.original_language?.toUpperCase()||'—'}</b>
      </div>

      <div>
        <span>Release Date</span>
        <b>
          {d.release_date
            ? new Date(d.release_date).toLocaleDateString('en-US',{
                month:'short',
                day:'numeric',
                year:'numeric'
              })
            : '—'}
        </b>
      </div>

      <div>
        <span>Budget</span>
        <b>
          {d.budget
            ? `$${d.budget.toLocaleString()}`
            : '—'}
        </b>
      </div>

      {d.production_companies?.length>0 && (
        <div className="production-companies">
          {d.production_companies
            .filter(company=>company.logo_path)
            .slice(0,4)
            .map(company=>(
              <img
                key={company.id}
                src={IMG(company.logo_path,'w200')}
                alt={company.name}
                title={company.name}
              />
            ))}
        </div>
      )}
    </>
  )}

  {type==='tv' && d.networks?.length>0 && (
    <div className="detail-network-logos">
      {d.networks
        .filter(n=>n.logo_path)
        .slice(0,2)
        .map(n=>(
          <img
            key={n.id}
            src={IMG(n.logo_path,'w200')}
            alt={n.name}
          />
        ))}
    </div>
  )}
</aside></div></div>
{type==='tv'&&<Episodes d={d} nav={nav}/>}

<section className="below-detail" id="cast">
  {d.credits?.cast?.length>0&&
    <CastRow cast={d.credits.cast} nav={nav}/>
  }

  {type==='movie'&&d.trailers?.length>0&&
    <TrailerSection
      trailers={d.trailers}
      onOpen={setTrailerOpen}
    />
  }

  <Recommendation
    title="You Might Also Like"
    items={d.recommendations?.results?.length
      ? d.recommendations.results
      : d.similar?.results||[]
    }
    nav={nav}
  />
</section>

{trailerOpen&&(
  <div
    className="trailer-modal"
    onClick={()=>setTrailerOpen(null)}
  >
    <div
      className="trailer-modal-box"
      onClick={e=>e.stopPropagation()}
    >
      <button
        className="trailer-close"
        onClick={()=>setTrailerOpen(null)}
        aria-label="Close trailer"
      >
        <X size={22}/>
      </button>

      <div className="trailer-player">
        <iframe
          src={`https://www.youtube.com/embed/${trailerOpen.key}?autoplay=1&rel=0`}
          title={trailerOpen.name}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div className="trailer-modal-info">
        <h3>{trailerOpen.name}</h3>

        <span>
          {trailerOpen.type}
          {trailerOpen.official?' · Official':''}
        </span>
      </div>
    </div>
  </div>
)}
<Footer nav={nav}/></>}

function Episodes({d,nav}){
  const [season,setSeason]=useState(1);
  const [eps,setEps]=useState([]);
  const [sort,setSort]=useState('oldest');

  useEffect(()=>{
    apiFetch(`/tv/${d.id}/season/${season}`)
      .then(x=>setEps(x.episodes||[]))
      .catch(()=>setEps([]));
  },[d.id,season]);

  const visibleEpisodes=[...eps].sort((a,b)=>
    sort==='oldest'
      ? a.episode_number-b.episode_number
      : b.episode_number-a.episode_number
  );

  return (
    <section className="episodes-wrap">

      <div className="episodes-head">
        <h2>Episodes</h2>

        <div className="episode-controls">

          <button className="episode-control">
            <SlidersHorizontal size={15}/>
            Ratings
          </button>

          <button
            className="episode-control"
            onClick={()=>setSort(x=>x==='oldest'?'newest':'oldest')}
          >
            ↕ {sort==='oldest'?'Oldest':'Newest'}
          </button>

          <button className="episode-control">
            <Eye size={15}/>
            Mark watched
          </button>

          <select
            className="episode-season"
            value={season}
            onChange={e=>setSeason(Number(e.target.value))}
          >
            {Array.from(
              {length:d.number_of_seasons||1},
              (_,i)=>(
                <option value={i+1} key={i}>
                  Season {i+1}
                </option>
              )
            )}
          </select>

        </div>
      </div>

      <div className="episode-grid">
        {visibleEpisodes.map(e=>(
          <button
            className="episode-card"
            key={e.id}
            onClick={()=>
              nav(
                `/watch/tv/${d.id}?season=${season}&episode=${e.episode_number}`
              )
            }
          >

            <div className="episode-thumb">

              {e.still_path ? (
                <img
                  src={IMG(e.still_path,'w780')}
                  alt=""
                />
              ) : (
                <div className="episode-empty"/>
              )}

              <span className="episode-number">
                E{e.episode_number}
              </span>

              <span className="episode-watch">
                <Eye size={17}/>
              </span>

              {e.runtime && (
                <span className="episode-runtime">
                  {e.runtime}m
                </span>
              )}

            </div>

            <div className="episode-content">
              <h3>{e.name}</h3>

              <p>
                {e.overview||'Episode description unavailable.'}
              </p>
            </div>

          </button>
        ))}
      </div>

    </section>
  );
}
function CastRow({cast,nav}){
  if(!cast?.length)return null;

  return (
    <section className="cast-section">

      <div className="section-heading">
        <h2>Cast</h2>
      </div>

      <div className="cast-scroll">
        {cast.map(c=>(
          <button
            className="cast-card"
            key={c.id}
            onClick={()=>nav(`/person/${c.id}`)}
          >

            <div className="cast-photo">
              {c.profile_path
                ? (
                  <img
                    src={IMG(c.profile_path,'w185')}
                    alt={c.name}
                  />
                )
                : <UserRound size={40}/>
              }
            </div>

            <b>{c.name}</b>

            <span>{c.character||'—'}</span>

          </button>
        ))}
      </div>

    </section>
  );
}

function TrailerSection({trailers,onOpen}){
  if(!trailers?.length)return null;

  return (
    <section className="trailers-section">
      <div className="section-heading">
        <h2>Trailers</h2>
      </div>

      <div className="trailers-scroll">
        {trailers.map((trailer,i)=>(
          <button
            className="trailer-card"
            key={trailer.id||trailer.key||i}
            onClick={()=>onOpen(trailer)}
          >
            <div className="trailer-image">
              <img
                src={`https://img.youtube.com/vi/${trailer.key}/hqdefault.jpg`}
                alt={trailer.name}
              />

              <div className="trailer-gradient"/>

              <span className="trailer-play">
                <Play fill="currentColor" size={22}/>
              </span>

              <div className="trailer-info">
                <b>{trailer.name}</b>
                <span>
                  {trailer.type}
                  {trailer.official?' · Official':''}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function Recommendation({title,items,nav}){
  if(!items?.length)return null;

  return (
    <section className="rec-section">

      <div className="section-heading">
        <h2>{title}</h2>

        <div className="rec-controls">
          <button
            onClick={()=>{
              document
                .querySelector('.rec-scroll')
                ?.scrollBy({
                  left:-700,
                  behavior:'smooth'
                });
            }}
          >
            <ChevronLeft size={18}/>
          </button>

          <button
            onClick={()=>{
              document
                .querySelector('.rec-scroll')
                ?.scrollBy({
                  left:700,
                  behavior:'smooth'
                });
            }}
          >
            <ChevronRight size={18}/>
          </button>
        </div>
      </div>

      <div className="rec-scroll">
        {items.map((x,i)=>(
          <Poster
            key={`${x.id}-${i}`}
            item={x}
            nav={nav}
          />
        ))}
      </div>

    </section>
  );
}

function Person({id,nav}){const [d,setD]=useState(null);useEffect(()=>{apiFetch(`/person/${id}`).then(setD)},[id]);if(!d)return <Loading/>;return <><SiteNav nav={nav}/><main className="person-page"><div className="person-head"><div className="person-photo">{d.profile_path?<img src={IMG(d.profile_path,'w500')}/>:<UserRound size={70}/>}</div><div><h1>{d.name}</h1><div className="person-meta"><span>Born {d.birthday||'—'}</span><span>{d.place_of_birth||'—'}</span></div><p>{d.biography||'Biography unavailable.'}</p><button className="read-more">Read More</button></div></div><section><div className="film-head"><h2>Filmography</h2><div><button className="switch active">Movies</button><button className="switch">TV Shows</button></div></div><div className="poster-row">{(d.combined_credits?.cast||[]).sort((a,b)=>year(b).localeCompare(year(a))).slice(0,12).map((x,i)=><Poster item={x} nav={nav} key={`${x.id}-${i}`}/>)}</div></section></main></>}

function MyList({items,nav,toggle}){return <><SiteNav nav={nav} active="list"/><main className="my-list-page"><PageTitle title="My Lists" subtitle="Save movies and shows you want to watch later"/><div className="list-tabs"><button className="active">My List</button><button>Watched</button></div>{items.length?<div className="poster-grid">{items.map((x,i)=><div className="list-item" key={`${x.id}-${i}`}><Poster item={x} nav={nav}/><button onClick={()=>toggle(x)} className="remove-list">×</button></div>)}</div>:<div className="empty-list"><Heart/><h3>No items yet</h3><p>Add movies and shows to your list using the + button.</p><button className="white-btn" onClick={()=>nav('/movies')}>Explore Movies</button></div>}</main></>}
function SettingsPage({nav}){return <><SiteNav nav={nav}/><main className="settings-page"><PageTitle title="Settings" subtitle="Manage your Flixstar preferences"/><div className="settings-card"><div className="setting"><div><b>Account</b><p>Guest account</p></div><button className="small-btn">Sign in</button></div><div className="setting"><div><b>Appearance</b><p>Dark mode</p></div><span className="toggle on"></span></div><div className="setting"><div><b>Autoplay</b><p>Play the next episode automatically</p></div><span className="toggle"></span></div><div className="setting"><div><b>Playback quality</b><p>Auto</p></div><button className="small-btn">Auto</button></div></div></main></>}
function Watch({titleId,type,nav}) {

  const qs=new URLSearchParams(location.search);

  const season=qs.get('season');
  const episode=qs.get('episode');

  // Resume position coming from Continue Watching
  const resumeProgress=Math.max(
    0,
    Number(qs.get('progress')||0)
  );

  const [d,setD]=useState(null);
  const [playback,setPlayback]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const [activeProvider,setActiveProvider]=useState(null);

  useEffect(()=>{
    let cancelled=false;

    async function load(){

      setLoading(true);
      setError('');

      try{

        const detailsPath=`/${type}/${titleId}`;

        let playbackPath;

        if(type==='movie'){

          playbackPath=`/playback/movie/${titleId}`;

        }else{

          if(!season || !episode){
            throw new Error(
              'TV playback requires season and episode'
            );
          }

          playbackPath=
            `/playback/tv/${titleId}`+
            `?season=${encodeURIComponent(season)}`+
            `&episode=${encodeURIComponent(episode)}`;
        }

        console.log('Playback request:',playbackPath);

        const [details,player]=await Promise.all([
          apiFetch(detailsPath),
          apiFetch(playbackPath)
        ]);

        if(cancelled)return;

        setD(details);
        setPlayback(player);

        if(player?.providers?.length){
          setActiveProvider(player.providers[0]);
        }

      }catch(err){

        if(cancelled)return;

        console.error('Watch page error:',err);

        setError(
          err.message ||
          'Unable to load playback providers.'
        );

      }finally{

        if(!cancelled){
          setLoading(false);
        }

      }
    }

    load();

    return()=>{
      cancelled=true;
    };

  },[titleId,type,season,episode]);


  const t=d?title(d):'Loading';


  /*
    ==========================================
    SAVE PLAYER PROGRESS
    ==========================================
  */

  useEffect(()=>{

    const handlePlayerMessage=(event)=>{

  let message=event.data;

  // Some players send the whole message as a JSON string
  if(typeof message==='string'){
    try{
      message=JSON.parse(message);
    }catch{
      return;
    }
  }

  if(!message || typeof message!=='object'){
    return;
  }

  // The player wraps progress inside data
  let data=message.data;

  if(typeof data==='string'){
    try{
      data=JSON.parse(data);
    }catch{
      return;
    }
  }

  if(!data || typeof data!=='object'){
    return;
  }

  // Only handle actual player progress events
  if(
    message.type &&
    message.type!=='PLAYER_EVENT'
  ){
    return;
  }

  if(
    data.event &&
    data.event!=='timeupdate'
  ){
    return;
  }

  const timestamp=Number(
    data.timestamp ??
    data.currentTime ??
    data.position
  );

  const duration=Number(
    data.duration ??
    data.totalDuration
  );

  if(
    !Number.isFinite(timestamp) ||
    !Number.isFinite(duration) ||
    duration<=0 ||
    timestamp<0
  ){
    return;
  }

  const watchedFraction=Math.min(
    1,
    Math.max(
      0,
      timestamp/duration
    )
  );

  const watchedItem={

    id:String(titleId),

    type,

    title:t,

    name:t,

    poster_path:d?.poster_path||null,

    backdrop_path:d?.backdrop_path||null,

    timestamp,

    duration,

    progress:watchedFraction,

    ...(type==='tv' && {
      season:Number(season)||1,
      episode:Number(episode)||1
    })

  };

  console.log(
    'Flixstar playback progress:',
    watchedItem
  );

  // Remove finished titles
  if(watchedFraction>=0.95){

    removeWatchProgress(watchedItem);

    return;

  }

  saveWatchProgress(watchedItem);

};


    window.addEventListener(
      'message',
      handlePlayerMessage
    );


    return()=>{

      window.removeEventListener(
        'message',
        handlePlayerMessage
      );

    };

  },[
    titleId,
    type,
    season,
    episode,
    t,
    d?.poster_path
  ]);


  /*
    ==========================================
    BUILD PROVIDER URL WITH RESUME POSITION
    ==========================================
  */

  const getProviderUrl=(provider)=>{

    if(!provider?.url){
      return '';
    }

    if(!resumeProgress){
      return provider.url;
    }

    try{

      const url=new URL(provider.url);

      url.searchParams.set(
        'progress',
        String(Math.floor(resumeProgress))
      );

      return url.toString();

    }catch{

      return provider.url;

    }

  };


  if(loading){

    return(
      <main className="watch-page">

        <div className="watch-loading">

          <div className="spinner"/>

          <span>Loading player...</span>

        </div>

      </main>
    );

  }


  return(
    <main className="watch-page">

      <div className="watch-top">

        <button
          onClick={()=>nav(`/${type}/${titleId}`)}
        >
          <ArrowLeft size={22}/>
        </button>

        <span>

          {t}

          {type==='tv' && season && episode
            ? ` • S${season} E${episode}`
            : ''
          }

        </span>

        <button

          onClick={()=>{

            const url=getProviderUrl(
              activeProvider
            );

            if(url){

              window.open(
                url,
                '_blank',
                'noopener,noreferrer'
              );

            }

          }}

          disabled={!activeProvider}

        >

          <ExternalLink size={18}/>

        </button>

      </div>


      <div className="player">

        {activeProvider ? (

          <iframe

            key={getProviderUrl(activeProvider)}

            title={`${t} player`}

            src={getProviderUrl(activeProvider)}

            allowFullScreen

            allow="autoplay; fullscreen; picture-in-picture"

            referrerPolicy="no-referrer-when-downgrade"

          />

        ):(

          <div className="player-empty">

            <MonitorPlay size={42}/>

            <h2>No player available</h2>

            <p>
              There is currently no configured
              playback provider for this title.
            </p>

          </div>

        )}

      </div>


      {error && (

        <div className="watch-error">
          {error}
        </div>

      )}


      {playback?.providers?.length>0 && (

        <section className="server-section">

          <div className="server-heading">

            <h2>Servers</h2>

            <p>
              Choose a playback provider
            </p>

          </div>


          <div className="server-list">

            {playback.providers.map(provider=>(

              <button

                key={provider.id}

                className={
                  `server-button ${
                    activeProvider?.id===provider.id
                      ? 'active'
                      : ''
                  }`
                }

                onClick={()=>{

                  setActiveProvider(provider);

                }}

              >

                <MonitorPlay size={17}/>

                <span>{provider.name}</span>

                {activeProvider?.id===provider.id && (

                  <Check size={16}/>

                )}

              </button>

            ))}

          </div>

        </section>

      )}


      <div className="watch-info">

        <h1>{t}</h1>

        {type==='tv' && season && episode && (

          <p>
            Season {season}, Episode {episode}
          </p>

        )}

        {d?.overview && (

          <p>{d.overview}</p>

        )}

      </div>

    </main>
  );
}
function Loading(){return <div className="loading"><div className="spinner"/></div>}
function Footer({nav}){return <footer><button onClick={()=>nav('/')}>✦ FLIXSTAR</button><span>Discover • Watch • Save</span><div><button>Privacy</button><button>Terms</button></div></footer>}
createRoot(document.getElementById('root')).render(<App/>);
