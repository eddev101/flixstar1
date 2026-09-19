import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app=express();
app.use(cors());
app.use(express.json());

const PORT=process.env.PORT||4000;
const KEY=process.env.TMDB_API_KEY;

async function tmdb(path,params={}){
  if(!KEY)throw new Error('TMDB_API_KEY is not configured');
  const u=new URL('https://api.themoviedb.org/3'+path);
  u.searchParams.set('api_key',KEY);
  u.searchParams.set('language','en-US');
  for(const [k,v] of Object.entries(params)){
    if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,v);
  }
  const r=await fetch(u);
  if(!r.ok)throw new Error(`TMDB ${r.status}`);
  return r.json();
}

const safe=fn=>(req,res)=>fn(req,res).catch(e=>res.status(500).json({error:e.message}));
const withType=(data,type)=>({...data,results:(data.results||[]).map(x=>({...x,media_type:x.media_type||type}))});
const PRESETS={
  awards:{
    movie:{sort_by:'vote_average.desc',vote_count_gte:300},
    tv:{sort_by:'vote_average.desc',vote_count_gte:100}
  },

  oscar:{
    movie:{
      with_keywords:'3260',
      sort_by:'popularity.desc'
    }
  },

  psychological:{
    movie:{
      with_genres:'53',
      sort_by:'vote_average.desc',
      vote_count_gte:300
    }
  },

  cannes:{
    movie:{
      with_keywords:'3263',
      sort_by:'popularity.desc'
    }
  },

  halloween:{
    movie:{
      with_genres:'27',
      sort_by:'popularity.desc'
    }
  },

  rt:{
    movie:{
      sort_by:'vote_average.desc',
      vote_count_gte:1000
    }
  },

  mindfuck:{
    movie:{
      with_keywords:'11931',
      sort_by:'vote_average.desc',
      vote_count_gte:100
    }
  },

  'true-story':{
    movie:{
      with_keywords:'9672',
      sort_by:'popularity.desc'
    }
  }
};

async function findKeyword(term){
  const data=await tmdb('/search/keyword',{query:term,page:1});
  return data.results?.[0]?.id||null;
}

async function discover(type,params={}){
  const data=await tmdb(`/discover/${type}`,{include_adult:false,...params});
  return withType(data,type);
}

async function presetParams(type,preset){
  const movie=type==='movie';
  switch(preset){
    case 'awards':{
      const id=await findKeyword('award winner');
      return id?{with_keywords:id,sort_by:'vote_average.desc',vote_count_gte:250}:{sort_by:'vote_average.desc',vote_count_gte:500};
    }
    case 'oscar':{
      const id=await findKeyword('Academy Award for Best Picture');
      return id?{with_keywords:id,sort_by:'popularity.desc'}:{with_keywords:await findKeyword('Academy Award')||undefined,sort_by:'popularity.desc'};
    }
    case 'psychological':{
      const id=await findKeyword('psychological thriller');
      return id?{with_keywords:id,with_genres:53,sort_by:'popularity.desc'}:{with_genres:53,sort_by:'popularity.desc'};
    }
    case 'cannes':{
      const id=await findKeyword('Cannes Film Festival');
      return id?{with_keywords:id,sort_by:'popularity.desc'}:{with_keywords:await findKeyword('Cannes')||undefined,sort_by:'popularity.desc'};
    }
    case 'halloween':{
      const id=await findKeyword('Halloween');
      return id?{with_keywords:id,with_genres:'27',sort_by:'popularity.desc'}:{with_genres:'27',sort_by:'popularity.desc'};
    }
    case 'rt':
      return {sort_by:'vote_average.desc',vote_average_gte:7.5,vote_count_gte:1000};
    case 'mindfuck':{
      const id=await findKeyword('mindfuck');
      return id?{with_keywords:id,sort_by:'popularity.desc'}:{with_genres:'9648|878',sort_by:'vote_average.desc',vote_count_gte:250};
    }
    case 'true-story':{
      const id=await findKeyword('based on true story');
      return id?{with_keywords:id,sort_by:'popularity.desc'}:{with_keywords:await findKeyword('true story')||undefined,sort_by:'popularity.desc'};
    }
    default:
      return {};
  }
}

async function addLogos(items){
  return Promise.all((items||[]).map(async item=>{
    try{
      const type=item.media_type==='tv'?'tv':'movie';
      const images=await tmdb(`/${type}/${item.id}/images`,{
        include_image_language:'en,null'
      });

      const logo=
        images.logos?.find(x=>x.iso_639_1==='en') ||
        images.logos?.find(x=>x.iso_639_1===null) ||
        images.logos?.[0];

      return {
        ...item,
        logo_path:logo?.file_path||null
      };
    }catch{
      return {
        ...item,
        logo_path:null
      };
    }
  }));
}

app.get('/api/home',safe(async(req,res)=>{
  const [trending,topMovies,topTv,netflixMovies,netflixShows,disneyMovies,maxShows,awardMovies,awardShows,oscar,psychological,cannes,halloween,rt,mindBending,trueStory]=await Promise.all([
    tmdb('/trending/all/week'),
    tmdb('/movie/top_rated'),
    tmdb('/tv/top_rated'),
    tmdb('/discover/movie',{with_watch_providers:8,watch_region:'US',with_watch_monetization_types:'flatrate',sort_by:'popularity.desc'}),
    tmdb('/discover/tv',{with_watch_providers:8,watch_region:'US',with_watch_monetization_types:'flatrate',sort_by:'popularity.desc'}),
    tmdb('/discover/movie',{with_watch_providers:337,watch_region:'US',with_watch_monetization_types:'flatrate',sort_by:'popularity.desc'}),
    tmdb('/discover/tv',{with_watch_providers:1899,watch_region:'US',with_watch_monetization_types:'flatrate',sort_by:'popularity.desc'}),
    discover('movie',await presetParams('movie','awards')),
    discover('tv',await presetParams('tv','awards')),
    discover('movie',await presetParams('movie','oscar')),
    discover('movie',await presetParams('movie','psychological')),
    discover('movie',await presetParams('movie','cannes')),
    discover('movie',await presetParams('movie','halloween')),
    discover('movie',await presetParams('movie','rt')),
    discover('movie',await presetParams('movie','mindfuck')),
    discover('movie',await presetParams('movie','true-story'))
  ]);

  const hero=await addLogos(trending.results?.slice(0,8)||[]);

res.json({
  hero,
    trendingMovies:{...trending,results:(trending.results||[]).filter(x=>x.media_type==='movie').slice(0,20).map(x=>({...x,media_type:'movie'}))},
    trendingSeries:{...trending,results:(trending.results||[]).filter(x=>x.media_type==='tv').slice(0,20).map(x=>({...x,media_type:'tv'}))},
    netflixMovies:withType(netflixMovies,'movie'),
    netflixShows:withType(netflixShows,'tv'),
    disneyMovies:withType(disneyMovies,'movie'),
    maxShows:withType(maxShows,'tv'),
    awardWinningMovies:awardMovies,
    awardWinningShows:awardShows,
    topRatedMovies:withType(topMovies,'movie'),
    topRatedSeries:withType(topTv,'tv'),
    oscarBestPicture:oscar,
    psychologicalThrillers:psychological,
    cannesFilmFestival:cannes,
    halloweenTop100:halloween,
    rtBest:rt,
    mindBending,
    trueStory
  });
}));


app.get('/api/trending',safe(async(req,res)=>{
  const data=await tmdb('/trending/all/day');

  res.json({
    ...data,
    results:(data.results||[])
      .filter(x=>x.media_type==='movie'||x.media_type==='tv')
      .slice(0,10)
  });
}));

app.get('/api/trending-movies',safe(async(req,res)=>{
  const data=await tmdb('/trending/movie/day');

  const results=await addLogos(
    (data.results||[]).map(x=>({
      ...x,
      media_type:'movie'
    }))
  );

  res.json({
    ...data,
    results
  });
}));

app.get('/api/trending-shows',safe(async(req,res)=>{
  const data=await tmdb('/trending/tv/day');

  const results=await addLogos(
    (data.results||[]).map(x=>({
      ...x,
      media_type:'tv'
    }))
  );

  res.json({
    ...data,
    results
  });
}));

app.get('/api/new-seasons',safe(async(req,res)=>{
  const data=await tmdb('/tv/on_the_air');

  const shows=(data.results||[]).slice(0,12);

  const detailed=await Promise.all(
    shows.map(async show=>{
      try{
        const details=await tmdb(`/tv/${show.id}`);

        const episode=details.next_episode_to_air;

        return {
          ...show,
          media_type:'tv',
          season_number:episode?.season_number||details.number_of_seasons||1,
          episode_number:episode?.episode_number||null,
          air_date:episode?.air_date||null
        };
      }catch{
        return {
          ...show,
          media_type:'tv',
          season_number:show.number_of_seasons||1,
          episode_number:null,
          air_date:null
        };
      }
    })
  );

  res.json({
    results:detailed.filter(x=>x.backdrop_path)
  });
}));




app.get('/api/providers',safe(async(req,res)=>{
  const region=req.query.region||'US';
  const [movies,tv]=await Promise.all([
    tmdb('/watch/providers/movie',{watch_region:region}),
    tmdb('/watch/providers/tv',{watch_region:region})
  ]);
  const map=new Map();
  [...(movies.results||[]),...(tv.results||[])].forEach(p=>{
    if(!map.has(p.provider_id))map.set(p.provider_id,{provider_id:p.provider_id,provider_name:p.provider_name,logo_path:p.logo_path});
  });
  res.json({region,providers:[...map.values()]});
}));

app.get('/api/genres',safe(async(req,res)=>{
  const type=req.query.type==='tv'?'tv':'movie';

  const data=await tmdb(
    type==='tv'
      ? '/genre/tv/list'
      : '/genre/movie/list'
  );

  res.json({
    genres:data.genres||[]
  });
}));

app.get('/api/upcoming',safe(async(req,res)=>{
  const page=req.query.page||1;
  const region=req.query.region||'US';

  const data=await tmdb('/movie/upcoming',{
    page,
    region
  });

  res.json({
    ...data,
    results:(data.results||[]).map(x=>({
      ...x,
      media_type:'movie'
    }))
  });
}));


app.get('/api/discover',safe(async(req,res)=>{

  const type=req.query.type==='tv'?'tv':'movie';

  const preset=
    req.query.preset
      ? await presetParams(type,req.query.preset)
      : {};

  const params={
    ...preset,

    page:req.query.page||1,

    /*
     * Normal filters from the Movies/Shows page
     * override preset defaults when supplied.
     */
    sort_by:req.query.sort||preset.sort_by||'popularity.desc',

    with_genres:
      req.query.genre||
      preset.with_genres||
      undefined,

    with_watch_providers:
      req.query.provider||
      undefined,

    watch_region:
      req.query.provider
        ? (req.query.region||'US')
        : undefined,

    with_watch_monetization_types:
      req.query.provider
        ? 'flatrate'
        : undefined
  };

  if(req.query.year){
    params[
      type==='movie'
        ? 'primary_release_year'
        : 'first_air_date_year'
    ]=req.query.year;
  }

  if(req.query.country){
    params.with_origin_country=req.query.country;
  }

  const data=await tmdb(`/discover/${type}`,params);

  res.json({
    ...data,
    results:(data.results||[]).map(x=>({
      ...x,
      media_type:type
    }))
  });

}));


app.get('/api/recommendations',safe(async(req,res)=>{
  const type=req.query.type==='tv'?'tv':'movie';
  const id=req.query.id;
  if(!id)throw new Error('Missing id');
  const data=await tmdb(`/${type}/${id}/recommendations`,{page:req.query.page||1});
  res.json(withType(data,type));
}));

app.get('/api/search',safe(async(req,res)=>{

  const query=(req.query.query||'').trim();

  if(!query){
    return res.json({
      page:1,
      total_pages:0,
      total_results:0,
      results:[]
    });
  }

  // Get the first page so we know how many pages exist
  const first=await tmdb('/search/multi',{
    query,
    page:1,
    include_adult:false
  });

  const totalPages=Math.min(first.total_pages||1,20);

  const pages=[first];

  // Fetch the remaining pages in small batches
  for(let start=2;start<=totalPages;start+=5){

    const batch=[];

    for(
      let page=start;
      page<=Math.min(start+4,totalPages);
      page++
    ){
      batch.push(
        tmdb('/search/multi',{
          query,
          page,
          include_adult:false
        })
      );
    }

    const batchResults=await Promise.all(batch);

    pages.push(...batchResults);
  }

  const results=pages.flatMap(page=>page.results||[]);

  res.json({
    page:1,
    total_pages:totalPages,
    total_results:first.total_results||results.length,
    results
  });

}));

app.get('/api/movie/:id',safe(async(req,res)=>{
  const id=req.params.id;

  const [details,credits,videos,images,recommendations]=await Promise.all([
  tmdb(`/movie/${id}`),
  tmdb(`/movie/${id}/credits`),
  tmdb(`/movie/${id}/videos`),
  tmdb(`/movie/${id}/images`,{
    include_image_language:'en,null'
  }),
  tmdb(`/movie/${id}/recommendations`)
]);

let collection=null;

if(details.belongs_to_collection?.id){
  try{
    collection=await tmdb(
      `/collection/${details.belongs_to_collection.id}`
    );
  }catch{
    collection=null;
  }
}

  const trailer=
    (videos.results||[]).find(v=>
      v.site==='YouTube' &&
      v.type==='Trailer' &&
      v.official
    ) ||
    (videos.results||[]).find(v=>
      v.site==='YouTube' &&
      v.type==='Trailer'
    ) ||
    (videos.results||[]).find(v=>
      v.site==='YouTube'
    );

    const trailers=(videos.results||[])
  .filter(v=>v.site==='YouTube' && v.type==='Trailer')
  .sort((a,b)=>{
    if(a.official!==b.official)return a.official?-1:1;
    return new Date(b.published_at||0)-new Date(a.published_at||0);
  })
  .slice(0,8);

  const logo=
    (images.logos||[]).find(x=>x.iso_639_1==='en') ||
    (images.logos||[])[0] ||
    null;

  res.json({
    ...details,

    credits,

    trailer:trailer||null,

    trailers,

    logo_path:logo?.file_path||null,

    recommendations,

    collection
  });
}));
app.get('/api/tv/:id',safe(async(req,res)=>{
  const id=req.params.id;

  const [details,credits,images,recommendations,contentRatings]=await Promise.all([
    tmdb(`/tv/${id}`),
    tmdb(`/tv/${id}/credits`),
    tmdb(`/tv/${id}/images`,{
      include_image_language:'en,null'
    }),
    tmdb(`/tv/${id}/recommendations`),
    tmdb(`/tv/${id}/content_ratings`)
  ]);

  const logo=
    (images.logos||[]).find(x=>x.iso_639_1==='en') ||
    (images.logos||[])[0] ||
    null;

  res.json({
    ...details,
    credits,
    recommendations,
    content_ratings:contentRatings.results||[],
    logo_path:logo?.file_path||null
  });
}));
app.get('/api/tv/:id/season/:season',safe(async(req,res)=>res.json(await tmdb(`/tv/${req.params.id}/season/${req.params.season}`))));
app.get('/api/person/:id',safe(async(req,res)=>res.json(await tmdb(`/person/${req.params.id}`,{append_to_response:'combined_credits,images'}))));
// ---------------------------------------------------------
// PLAYBACK PROVIDERS
// ---------------------------------------------------------

function buildPlaybackUrl(template, data) {
  if (!template) return null;

  return template
    .replaceAll('{tmdbId}', encodeURIComponent(String(data.tmdbId)))
    .replaceAll('{imdbId}', encodeURIComponent(String(data.imdbId || '')))
    .replaceAll('{title}', encodeURIComponent(String(data.title || '')))
    .replaceAll('{year}', encodeURIComponent(String(data.year || '')));
}

app.get('/api/playback/movie/:id', safe(async (req, res) => {
  const id = req.params.id;

  const movie = await tmdb(`/movie/${id}`, {
    append_to_response: 'external_ids'
  });

  const imdbId = movie.external_ids?.imdb_id || null;
  const releaseYear = (movie.release_date || '').slice(0, 4);

  /*
   * Configure your authorized playback providers with environment
   * variables.
   *
   * Example:
   *
   * PLAYBACK_MOVIE_PROVIDER_1_NAME=My Provider
   * PLAYBACK_MOVIE_PROVIDER_1_URL=https://your-provider.example/movie/{tmdbId}
   *
   * PLAYBACK_MOVIE_PROVIDER_2_NAME=Backup Provider
   * PLAYBACK_MOVIE_PROVIDER_2_URL=https://your-other-provider.example/movie/{imdbId}
   */

  const providers = [];

  for (let i = 1; i <= 10; i++) {
    const name = process.env[`PLAYBACK_MOVIE_PROVIDER_${i}_NAME`];
    const template = process.env[`PLAYBACK_MOVIE_PROVIDER_${i}_URL`];

    if (!name || !template) continue;

    const url = buildPlaybackUrl(template, {
      tmdbId: id,
      imdbId,
      title: movie.title,
      year: releaseYear
    });

    if (url) {
      providers.push({
        id: `provider-${i}`,
        name,
        url
      });
    }
  }

  res.json({
    id: movie.id,
    tmdbId: String(movie.id),
    imdbId,
    title: movie.title,
    year: releaseYear,
    providers
  });
}));

app.get('/api/playback/tv/:id', safe(async (req,res)=>{

  const id=req.params.id;

  const seasonParam=String(req.query.season||'').trim();
  const episodeParam=String(req.query.episode||'').trim();

  console.log('TV playback request:',{
    id,
    seasonParam,
    episodeParam,
    fullUrl:req.originalUrl
  });

  if(!seasonParam || !episodeParam){

    return res.status(400).json({
      error:'Season and episode are required',
      received:{
        season:req.query.season,
        episode:req.query.episode
      }
    });

  }

  const season=parseInt(seasonParam,10);
  const episode=parseInt(episodeParam,10);

  if(
    !Number.isInteger(season) ||
    !Number.isInteger(episode) ||
    season<1 ||
    episode<1
  ){

    return res.status(400).json({
      error:'Invalid season or episode',
      received:{
        season:seasonParam,
        episode:episodeParam
      }
    });

  }

  const tv=await tmdb(`/tv/${id}`,{
    append_to_response:'external_ids'
  });

  const imdbId=tv.external_ids?.imdb_id||null;

  const providers=[];

  for(let i=1;i<=10;i++){

    const name=
      process.env[`PLAYBACK_TV_PROVIDER_${i}_NAME`];

    const template=
      process.env[`PLAYBACK_TV_PROVIDER_${i}_URL`];

    console.log(
      `TV provider ${i}:`,
      name,
      template
    );

    if(!name||!template)continue;

    const url=template
      .replaceAll(
        '{tmdbId}',
        encodeURIComponent(String(id))
      )
      .replaceAll(
        '{imdbId}',
        encodeURIComponent(String(imdbId||''))
      )
      .replaceAll(
        '{season}',
        encodeURIComponent(String(season))
      )
      .replaceAll(
        '{episode}',
        encodeURIComponent(String(episode))
      );

    providers.push({
      id:`provider-${i}`,
      name,
      url
    });

  }

  console.log('TV playback providers:',providers);

  res.json({
    id:tv.id,
    tmdbId:String(tv.id),
    imdbId,
    title:tv.name,
    season,
    episode,
    providers
  });

}));

app.get('/api/health',(req,res)=>res.json({ok:true,name:'Flixstar'}));

app.listen(PORT,()=>console.log(`Flixstar API running on http://localhost:${PORT}`));
