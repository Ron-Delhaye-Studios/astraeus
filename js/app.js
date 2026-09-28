
    let PERSON=null;
    const PROFILE_KEY='astraeus.profile.v1';
    function saveProfile(p){try{localStorage.setItem(PROFILE_KEY,JSON.stringify(p));}catch(e){}}
    function loadProfile(){try{const r=localStorage.getItem(PROFILE_KEY);return r?JSON.parse(r):null;}catch(e){return null;}}
    function clearProfile(){try{localStorage.removeItem(PROFILE_KEY);}catch(e){}}
    function prefillForm(p){if(!p)return;const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null&&v!=='')el.value=v;};set('fullName',p.fullName);set('birthPlace',p.place);set('birthDate',p.date);set('birthTime',p.time);set('birthTz',p.tz);set('birthLat',p.lat);set('birthLon',p.lon);}
    const TAROT_FILES=['tarot-00-fool','tarot-01-magician','tarot-02-high-priestess','tarot-03-empress','tarot-04-emperor','tarot-05-hierophant','tarot-06-lovers','tarot-07-chariot','tarot-08-strength','tarot-09-hermit','tarot-10-wheel','tarot-11-justice','tarot-12-hanged-man','tarot-13-death','tarot-14-temperance','tarot-15-devil','tarot-16-tower','tarot-17-star','tarot-18-moon','tarot-19-sun','tarot-20-judgement','tarot-21-world'];
    const PLANET_ART={Sun:'planet-sun',Moon:'planet-moon',Mercury:'planet-mercury',Venus:'planet-venus',Mars:'planet-mars',Jupiter:'planet-jupiter',Saturn:'planet-saturn',Uranus:'planet-uranus',Neptune:'planet-neptune',Pluto:'planet-pluto'};
    function zodiacFile(name){return 'art/zodiac-'+name.toLowerCase()+'.svg';}
    function sigilFile(v){const m=[11,22,33].includes(v)?v:(((v-1)%9)+9)%9+1;return 'art/sigil-'+m+'.svg';}
    function tarotFile(i){return 'art/'+TAROT_FILES[i]+'.svg';}
    function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
    const BODIES=['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
    const GLYPH={Sun:'☉',Moon:'☽',Mercury:'☿',Venus:'♀',Mars:'♂',Jupiter:'♃',Saturn:'♄',Uranus:'♅',Neptune:'♆',Pluto:'♇'};
    const SIGNS=[
      ['Aries','♈','Fire','Cardinal'],['Taurus','♉','Earth','Fixed'],['Gemini','♊','Air','Mutable'],['Cancer','♋','Water','Cardinal'],
      ['Leo','♌','Fire','Fixed'],['Virgo','♍','Earth','Mutable'],['Libra','♎','Air','Cardinal'],['Scorpio','♏','Water','Fixed'],
      ['Sagittarius','♐','Fire','Mutable'],['Capricorn','♑','Earth','Cardinal'],['Aquarius','♒','Air','Fixed'],['Pisces','♓','Water','Mutable']
    ];
    const ASPECTS=[['conjunction',0,'☌'],['opposition',180,'☍'],['trine',120,'△'],['square',90,'□'],['sextile',60,'✶']];
    const NATAL_ORB={Sun:8,Moon:8,Mercury:6,Venus:6,Mars:6,Jupiter:6,Saturn:6,Uranus:5,Neptune:5,Pluto:5};
    let transitMoment=new Date(), tarotDraw=1;
    let natal={}, asc=0, natalAsp=[], PYTH, CHALD, LIFE, BDAY, ATT, lifeRaw=0;

    const mod=(n,m)=>((n%m)+m)%m;
    const angularDistance=(a,b)=>{const d=Math.abs(a-b)%360;return Math.min(d,360-d)};
    function signOf(lon){const i=Math.floor(mod(lon,360)/30),deg=mod(lon,30);return {i,name:SIGNS[i][0],glyph:SIGNS[i][1],element:SIGNS[i][2],mode:SIGNS[i][3],deg};}
    function fmtPos(lon,retro=false){const s=signOf(lon);return `${s.deg.toFixed(1)}° ${s.name}${retro?' ℞':''}`}
    function eclipticLongitude(name,date){
      if(name==='Moon') return mod(Astronomy.EclipticGeoMoon(date).lon,360);
      const v=Astronomy.GeoVector(Astronomy.Body[name],date,true);
      return mod(Astronomy.Ecliptic(v).elon,360);
    }
    function positions(date){
      const yesterday=new Date(date.getTime()-86400000);
      return Object.fromEntries(BODIES.map(name=>{
        const lon=eclipticLongitude(name,date), prev=eclipticLongitude(name,yesterday);
        let motion=mod(lon-prev+180,360)-180;
        return [name,{lon,retro:!['Sun','Moon'].includes(name)&&motion<0,motion}];
      }));
    }
    function obliquity(date){const jd=date.getTime()/86400000+2440587.5,T=(jd-2451545)/36525;return 23.43929111-0.013004167*T-1.6389e-7*T*T+5.036e-7*T*T*T;}
    function ascendant(date,lat,lon){
      const theta=mod(Astronomy.SiderealTime(date)*15+lon,360)*Math.PI/180;
      const phi=lat*Math.PI/180, eps=obliquity(date)*Math.PI/180;
      return mod(Math.atan2(-Math.cos(theta),Math.sin(theta)*Math.cos(eps)+Math.tan(phi)*Math.sin(eps))*180/Math.PI,360);
    }
    function houseFor(lon,ascLon){const first=Math.floor(ascLon/30);return mod(Math.floor(lon/30)-first,12)+1;}
    function natalAspects(pos){
      const out=[];
      for(let i=0;i<BODIES.length;i++)for(let j=i+1;j<BODIES.length;j++){
        const a=BODIES[i],b=BODIES[j],d=angularDistance(pos[a].lon,pos[b].lon);
        for(const [name,angle,glyph] of ASPECTS){const orb=Math.abs(d-angle),max=Math.min(NATAL_ORB[a],NATAL_ORB[b]);if(orb<=max)out.push({a,b,name,angle,glyph,orb,type:'natal'});}
      }
      return out.sort((a,b)=>a.orb-b.orb);
    }
    function transitAspects(transit,natal){
      const out=[];
      BODIES.forEach(a=>BODIES.forEach(b=>{const d=angularDistance(transit[a].lon,natal[b].lon);ASPECTS.forEach(([name,angle,glyph])=>{const orb=Math.abs(d-angle);if(orb<=2.5)out.push({a,b,name,angle,glyph,orb,type:'transit'});});}));
      return out.sort((a,b)=>a.orb-b.orb);
    }

    function reduceNumber(n){const steps=[n];while(n>9 && ![11,22,33].includes(n)){n=String(n).split('').reduce((a,b)=>a+Number(b),0);steps.push(n);}return {value:n,steps};}
    const pythMap=Object.fromEntries('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c,i)=>[c,i%9+1]));
    const chaldGroups=['','AIJQY','BKR','CGLS','DMT','EHN','UVWX','OZ','FP'];
    const chaldMap={};chaldGroups.forEach((g,n)=>[...g].forEach(c=>chaldMap[c]=n));
    function nameCalc(map){const clean=PERSON.fullName.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(),letters=[...clean].filter(c=>/[A-Z]/.test(c)),vowels=new Set(['A','E','I','O','U']);const total=letters.reduce((s,c)=>s+map[c],0),soul=letters.filter(c=>vowels.has(c)).reduce((s,c)=>s+map[c],0),personality=total-soul;return {total,soul,personality,expr:reduceNumber(total),soulR:reduceNumber(soul),persR:reduceNumber(personality),breakdown:letters.map(c=>`${c}${map[c]}`).join(' + ')};}

    const PLANET_THEME={Sun:'identity and creative direction',Moon:'needs and emotional rhythm',Mercury:'thought and communication',Venus:'values and relationship',Mars:'action and assertion',Jupiter:'meaning and expansion',Saturn:'structure and responsibility',Uranus:'change and liberation',Neptune:'imagination and permeability',Pluto:'depth and transformation'};
    const ASPECT_TONE={conjunction:'concentrates',opposition:'polarizes',trine:'supports',square:'pressurizes',sextile:'opens'};
    function toLocalInput(date){const p=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;}
    function secondaryProgressedDate(target){const years=(target-PERSON.birthUtc)/(365.2422*86400000);return new Date(PERSON.birthUtc.getTime()+years*86400000);}
    function progressedPositions(target){return positions(secondaryProgressedDate(target));}
    function solarArcPositions(target){const progressed=progressedPositions(target),arc=mod(progressed.Sun.lon-natal.Sun.lon,360);return {arc,pos:Object.fromEntries(BODIES.map(b=>[b,{lon:mod(natal[b].lon+arc,360),retro:false,motion:0}]))};}
    function closestContacts(source,target,maxOrb=2,skipSame=true){
      const hits=[];
      BODIES.forEach(a=>BODIES.forEach(b=>{if(skipSame&&a===b)return;const d=angularDistance(source[a].lon,target[b].lon);ASPECTS.forEach(([name,angle,glyph])=>{const orb=Math.abs(d-angle);if(orb<=maxOrb)hits.push({a,b,name,glyph,orb});});}));
      return hits.sort((a,b)=>a.orb-b.orb);
    }
    function nearestContacts(source,target,count=3,skipSame=true){
      const all=[];
      BODIES.forEach(a=>BODIES.forEach(b=>{if(skipSame&&a===b)return;const d=angularDistance(source[a].lon,target[b].lon);ASPECTS.forEach(([name,angle,glyph])=>all.push({a,b,name,glyph,orb:Math.abs(d-angle)}));}));
      return all.sort((a,b)=>a.orb-b.orb).slice(0,count);
    }
    function currentNumbers(date){const uy=reduceNumber(date.getFullYear()).value,py=reduceNumber(PERSON.birthMonth+PERSON.birthDay+uy),pm=reduceNumber(py.value+(date.getMonth()+1)),pd=reduceNumber(pm.value+date.getDate());return {uy,py,pm,pd};}
    function dignity(body,lon){
      const s=signOf(lon).name;
      const domicile={Sun:['Leo'],Moon:['Cancer'],Mercury:['Gemini','Virgo'],Venus:['Taurus','Libra'],Mars:['Aries','Scorpio'],Jupiter:['Sagittarius','Pisces'],Saturn:['Capricorn','Aquarius']};
      const detriment={Sun:['Aquarius'],Moon:['Capricorn'],Mercury:['Sagittarius','Pisces'],Venus:['Aries','Scorpio'],Mars:['Taurus','Libra'],Jupiter:['Gemini','Virgo'],Saturn:['Cancer','Leo']};
      const exalt={Sun:'Aries',Moon:'Taurus',Mercury:'Virgo',Venus:'Pisces',Mars:'Capricorn',Jupiter:'Cancer',Saturn:'Libra'};
      const fall={Sun:'Libra',Moon:'Scorpio',Mercury:'Pisces',Venus:'Virgo',Mars:'Cancer',Jupiter:'Capricorn',Saturn:'Aries'};
      if((domicile[body]||[]).includes(s))return'Domicile';if(exalt[body]===s)return'Exalted';if((detriment[body]||[]).includes(s))return'Detriment';if(fall[body]===s)return'Fall';return'Neutral';
    }
    function transitState(contact,date){const later=positions(new Date(date.getTime()+21600000)),dNow=contact.orb,dLater=Math.abs(angularDistance(later[contact.a].lon,natal[contact.b].lon)-ASPECTS.find(x=>x[0]===contact.name)[1]);return dLater<dNow?'applying':'separating';}
    function dailyCard(date){const key=date.toISOString().slice(0,10),seed=xmur3(`${PERSON.fullName}|${PERSON.birthUtc.toISOString()}|${key}|ASTRAEUS-DAILY-V1`)(),rng=mulberry32(seed),index=Math.floor(rng()*TAROT.length),reversed=rng()<.5;return {card:TAROT[index],reversed,seed,key};}
    const NUM_THEMES={1:'Initiation · independence · direction',2:'Partnership · patience · attunement',3:'Expression · imagination · connection',4:'Structure · craft · reliability',5:'Movement · freedom · adaptation',6:'Care · responsibility · harmony',7:'Inquiry · discernment · inner study',8:'Power · stewardship · consequence',9:'Completion · service · perspective',11:'Illumination · intuition · sensitivity',22:'Vision made practical · lasting systems',33:'Compassion · teaching · service'};
    function tzOffsetMinutes(tz,instant){const dtf=new Intl.DateTimeFormat('en-US',{timeZone:tz,hour12:false,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});const p={};dtf.formatToParts(instant).forEach(x=>{p[x.type]=x.value;});const asUTC=Date.UTC(+p.year,+p.month-1,+p.day,(+p.hour)%24,+p.minute,+p.second);return Math.round((asUTC-instant.getTime())/60000);}
    function wallToUtc(tz,y,mo,d,h,mi){let guess=Date.UTC(y,mo-1,d,h,mi);for(let i=0;i<3;i++){guess=Date.UTC(y,mo-1,d,h,mi)-tzOffsetMinutes(tz,new Date(guess))*60000;}return new Date(guess);}
    function offsetLabel(hours){const sign=hours>=0?'+':'−',abs=Math.abs(hours),h=Math.floor(abs),m=Math.round((abs-h)*60);return `UTC${sign}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;}
    function preparePerson(fromProfile){
      let fullName,place,date,time,tz,lat,lon;
      if(fromProfile){
        fullName=fromProfile.fullName;place=fromProfile.place;date=fromProfile.date;time=fromProfile.time;tz=fromProfile.tz;lat=fromProfile.lat;lon=fromProfile.lon;
        if(!fullName||!place||!date||!time||!tz||!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('Saved birth data is incomplete. Please re-enter it.');
      }else{
        fullName=document.getElementById('fullName').value.trim().toUpperCase();place=document.getElementById('birthPlace').value.trim();
        date=document.getElementById('birthDate').value;time=document.getElementById('birthTime').value;tz=document.getElementById('birthTz').value;
        const manual=!document.getElementById('manualCoordsWrap').hidden;
        lat=manual?Number(document.getElementById('birthLatM').value):Number(document.getElementById('birthLat').value);
        lon=manual?Number(document.getElementById('birthLonM').value):Number(document.getElementById('birthLon').value);
        if(!fullName||!/[A-Za-zÀ-ž]/.test(fullName)||!place||!date||!time||!tz)throw new Error('Complete every field so the calculation has an unambiguous starting point.');
        if(!Number.isFinite(lat)||!Number.isFinite(lon))throw new Error('Pick your birth city from the search results, or use “Enter coordinates manually”.');
        if(lat<-90||lat>90||lon<-180||lon>180)throw new Error('Latitude must be −90 to 90 and longitude must be −180 to 180.');
      }
      const [year,month,day]=date.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
      const birthUtc=wallToUtc(tz,year,month,day,hour,minute);
      if(Number.isNaN(birthUtc.getTime())||birthUtc>new Date())throw new Error('Check the birth date and time. Future dates cannot be cast.');
      const offsetMin=tzOffsetMinutes(tz,birthUtc),offset=offsetMin/60;
      PERSON={fullName,place,birthUtc,lat,lon,birthMonth:month,birthDay:day,birthYear:year,utcOffset:offset,tz,birthLocal:`${date} · ${time} · ${tz.replace(/_/g,' ')} (${offsetLabel(offset)})`};
      saveProfile({fullName,place,date,time,tz,lat,lon});
      natal=positions(PERSON.birthUtc);asc=ascendant(PERSON.birthUtc,PERSON.lat,PERSON.lon);natalAsp=natalAspects(natal);
      PYTH=nameCalc(pythMap);CHALD=nameCalc(chaldMap);lifeRaw=[...date].filter(c=>/\d/.test(c)).reduce((sum,c)=>sum+Number(c),0);LIFE=reduceNumber(lifeRaw);BDAY=reduceNumber(day);ATT=reduceNumber(month+day);tarotDraw=1;
      const sun=signOf(natal.Sun.lon);
      const medal=document.getElementById('orbitMedal');medal.src=zodiacFile(sun.name);medal.alt=sun.name+' zodiac medallion';medal.hidden=false;document.getElementById('orbitSign').style.display='none';
      document.getElementById('heroName').textContent=fullName;document.getElementById('heroBirth').textContent=PERSON.birthLocal;document.getElementById('heroPlace').textContent=place;
      document.getElementById('orbitElement').textContent=`${sun.element.toUpperCase()} · ${sun.mode.toUpperCase()}`;
      document.getElementById('ledgerName').textContent=fullName;document.getElementById('ledgerBirth').textContent=PERSON.birthLocal;document.getElementById('ledgerUtc').textContent=PERSON.birthUtc.toISOString().replace('.000','');document.getElementById('ledgerPlace').textContent=`${place} · ${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
      const now=new Date();document.getElementById('moment').value=toLocalInput(now);renderAnchors();renderTransit(now);renderNumerology();renderTarot();
      document.getElementById('setup').hidden=true;document.getElementById('experience').hidden=false;window.scrollTo({top:0,behavior:'smooth'});
    }
    const whyData={
      daily:{title:'How is the daily report built?',body:'ASTRAEUS calculates five independent lenses for the selected moment: transit-to-natal contacts, secondary progressions, solar-arc directions, a date-specific numerology plus tarot layer, and the Chinese five-elements day pillar. It surfaces convergence without converting symbolism into certainty.',calc:()=>{const pd=secondaryProgressedDate(transitMoment),sa=solarArcPositions(transitMoment),nums=currentNumbers(transitMoment);return `Transit instant: ${transitMoment.toISOString()}\nSecondary progressed instant: ${pd.toISOString()}\nSolar arc: ${sa.arc.toFixed(3)}°\nPersonal year / month / day: ${nums.py.value} / ${nums.pm.value} / ${nums.pd.value}\nAspect orbs: transits ≤ 2.5° · progressions ≤ 1.25° · solar arcs ≤ 1.25°`; }},
      bazi:{title:'How is the Five Elements pillar calculated?',body:'The day pillar comes from the unbroken 60-day JiaZi count, anchored to 1900-01-01 (JiaXu) and cross-checked against 2000-01-01 (WuWu) and the reference 2026-09-28 Wood Snake day. The month and year pillars follow the Sun\u2019s ecliptic longitude across the 24 solar terms, computed in-page by the astronomy engine; the month stem uses the WuHuDun rule and the year turns at LiChun. Hidden stems, NaYin, the 12 day officers, trine frames, travel stars, and clashes are fixed classical tables. The day-pillar hexagram is ASTRAEUS\u2019s own documented rotation of the King Wen sequence — an interpretive layer, not classical doctrine — calibrated so the Wood Snake day reads hexagram 5 (Waiting). Nothing here predicts an event.',calc:()=>{const r=BaZi.reading(transitMoment,sunLongitude);return `Moment: ${transitMoment.toISOString()}\nSun ecliptic longitude: ${r.sunLongitude.toFixed(3)}°\nDay pillar: ${r.day.hanzi} ${r.day.pinyin} (cycle index ${r.day.index})\nMonth pillar: ${r.month.hanzi} ${r.month.pinyin}\nYear pillar: ${r.year.hanzi} ${r.year.pinyin}\nDay officer: ${r.officer.h} ${r.officer.en} (index ${r.officerIndex})\nHexagram: ${r.hexagram.number} ${r.hexagram.pinyin} (ASTRAEUS rotation)`;}},
      sun:{title:()=>`Why ${signOf(natal.Sun.lon).name} Sun?`,body:'The Sun’s geocentric tropical longitude at birth determines its zodiac sign. This is a coordinate result first; interpretive language is added afterward.',calc:()=>{const sign=signOf(natal.Sun.lon),start=sign.i*30,end=start+30;return `Birth UTC: ${PERSON.birthUtc.toISOString()}\nSun longitude: ${natal.Sun.lon.toFixed(5)}°\n${start}°–${end}° = ${sign.name}\nWithin-sign degree: ${sign.deg.toFixed(2)}°`;}},
      moon:{title:'Why this lunar phase?',body:'The phase is the angular difference between the geocentric Moon and Sun. Illumination is derived from that angle, not downloaded from a forecast.',calc:()=>{const p=Astronomy.MoonPhase(transitMoment),ill=(1-Math.cos(p*Math.PI/180))/2;return `Moment: ${transitMoment.toISOString()}\nPhase angle: ${p.toFixed(4)}°\nIllumination = (1 − cos(angle)) ÷ 2\nIlluminated fraction: ${(ill*100).toFixed(1)}%`; }},
      asc:{title:()=>`Why ${signOf(asc).name} rising?`,body:'The Ascendant is the eastern intersection of the local horizon and ecliptic at the birth instant. Whole-sign house 1 is the full zodiac sign containing that point.',calc:()=>`Birth UTC: ${PERSON.birthUtc.toISOString()}\nLocation: ${PERSON.lat.toFixed(5)}°, ${PERSON.lon.toFixed(5)}°\nGreenwich sidereal time: ${Astronomy.SiderealTime(PERSON.birthUtc).toFixed(6)} h\nObliquity: ${obliquity(PERSON.birthUtc).toFixed(6)}°\nAscendant: ${asc.toFixed(5)}° = ${fmtPos(asc)}`},
      life:{title:()=>`Why Life Path ${LIFE.value}?`,body:'The Life Path uses every digit of the birth date. Digits are summed and reduced; 11, 22, and 33 are preserved if encountered.',calc:()=>{const digits=`${String(PERSON.birthMonth).padStart(2,'0')}${String(PERSON.birthDay).padStart(2,'0')}${PERSON.birthYear}`.split('');return `${String(PERSON.birthMonth).padStart(2,'0')} / ${String(PERSON.birthDay).padStart(2,'0')} / ${PERSON.birthYear}\n${digits.join('+')} = ${lifeRaw}\n${LIFE.steps.join(' → ')}`;}},
      aspects:{title:'Why these aspects?',body:'For each transit and natal body, the shortest angular separation is compared with five major aspect angles. Only contacts within a strict 2.5° transit orb are shown.',calc:()=>`Aspects tested: 0° conjunction · 60° sextile · 90° square · 120° trine · 180° opposition\nTransit orb: ≤ 2.5°\nCoordinates: geocentric tropical, true ecliptic of date`},
      numerology:{title:'Why do the systems differ?',body:'Pythagorean numerology cycles letters through 1–9. Chaldean numerology uses a different historical sound-based mapping and does not assign 9 to letters. The app shows both rather than forcing agreement.',calc:()=>`Pythagorean total: ${PYTH.total} → ${PYTH.expr.steps.join(' → ')}\nChaldean total: ${CHALD.total} → ${CHALD.expr.steps.join(' → ')}\nMaster numbers 11, 22, 33 remain unreduced.`},
      tarot:{title:'Why these cards?',body:'This is a reproducible symbolic draw, not fortune-telling. A seeded generator shuffles the 22 Major Arcana; changing the draw number produces another checkable arrangement.',calc:()=>document.getElementById('tarotSeed').textContent},
      synthesis:{title:'Why this reflection?',body:'The sentence is a restrained synthesis of the closest measured transit contacts. It describes a possible reflective lens; it does not forecast an event or assert causation.',calc:()=>{const a=transitAspects(positions(transitMoment),natal).slice(0,3);return a.map(x=>`${x.a} ${x.name} natal ${x.b} · orb ${x.orb.toFixed(2)}°`).join('\n');}}
    };

    function renderAnchors(){
      const items=[
        {k:'Core',sym:signOf(natal.Sun.lon).glyph,big:`${fmtPos(natal.Sun.lon)}`,label:`Sun · ${signOf(natal.Sun.lon).element.toLowerCase()} + ${signOf(natal.Sun.lon).mode.toLowerCase()}`,why:'sun'},
        {k:'Instinct',sym:signOf(natal.Moon.lon).glyph,big:`${fmtPos(natal.Moon.lon)}`,label:`Moon · ${signOf(natal.Moon.lon).element.toLowerCase()} + ${signOf(natal.Moon.lon).mode.toLowerCase()}`,why:null},
        {k:'Approach',sym:'ASC',symClass:'asc',big:`${fmtPos(asc)}`,label:`${signOf(asc).name} is whole-sign house 1 · begins at 0°`,why:'asc'},
        {k:'Life path',sym:'№',big:String(LIFE.value),label:NUM_THEMES[LIFE.value]||'A symbolic numerology anchor',why:'life'},
      ];
      document.getElementById('anchorGrid').innerHTML=items.map((x,i)=>`<article class="card ${i===3?'ink':''}"><p class="kicker">${x.k}</p><div class="summary-card"><div class="symbol ${x.symClass||''}">${x.sym}</div><div><p class="big" style="font-size:30px">${x.big}</p><p class="label">${x.label}</p>${x.why?`<button class="why" data-why="${x.why}" ${i===3?'style="color:#7ed4ca"':''}>Why?</button>`:''}</div></div></article>`).join('');
    }
    function chartSvg(transit){
      const cx=300,cy=300,outer=260,inner=155;
      let svg=`<svg viewBox="0 0 600 600" role="img" aria-label="Natal wheel with current transits"><circle cx="300" cy="300" r="280" fill="var(--surface-2)"/><circle cx="300" cy="300" r="260" fill="var(--surface)" stroke="var(--line)"/><circle cx="300" cy="300" r="155" fill="none" stroke="var(--line)"/>`;
      for(let i=0;i<12;i++){
        const a=(i*30-90)*Math.PI/180,x1=cx+inner*Math.cos(a),y1=cy+inner*Math.sin(a),x2=cx+outer*Math.cos(a),y2=cy+outer*Math.sin(a);
        const mid=(i*30+15-90)*Math.PI/180,tx=cx+232*Math.cos(mid),ty=cy+232*Math.sin(mid);
        const house=mod(i-Math.floor(asc/30),12)+1;
        svg+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--line)"/><text x="${tx}" y="${ty+7}" text-anchor="middle" font-size="24" fill="var(--muted)">${SIGNS[i][1]}</text><text x="${cx+178*Math.cos(mid)}" y="${cy+178*Math.sin(mid)+4}" text-anchor="middle" font-size="11" fill="var(--muted)">H${house}</text>`;
      }
      natalAsp.slice(0,14).forEach(a=>{const p1=(natal[a.a].lon-90)*Math.PI/180,p2=(natal[a.b].lon-90)*Math.PI/180;svg+=`<line x1="${cx+130*Math.cos(p1)}" y1="${cy+130*Math.sin(p1)}" x2="${cx+130*Math.cos(p2)}" y2="${cy+130*Math.sin(p2)}" stroke="${['square','opposition'].includes(a.name)?'var(--hot)':'var(--teal)'}" stroke-opacity=".32"/>`;});
      BODIES.forEach((b,idx)=>{const a=(natal[b].lon-90)*Math.PI/180,r=135-(idx%2)*15;svg+=`<circle cx="${cx+r*Math.cos(a)}" cy="${cy+r*Math.sin(a)}" r="16" fill="var(--ink)"/><text x="${cx+r*Math.cos(a)}" y="${cy+r*Math.sin(a)+7}" text-anchor="middle" font-size="19" fill="var(--bg)">${GLYPH[b]}</text>`;});
      BODIES.forEach((b,idx)=>{const a=(transit[b].lon-90)*Math.PI/180,r=278-(idx%2)*15;svg+=`<circle cx="${cx+r*Math.cos(a)}" cy="${cy+r*Math.sin(a)}" r="12" fill="var(--gold)"/><text x="${cx+r*Math.cos(a)}" y="${cy+r*Math.sin(a)+5}" text-anchor="middle" font-size="14" fill="#071018">${GLYPH[b]}</text>`;});
      const aa=(asc-90)*Math.PI/180;svg+=`<line x1="${cx+150*Math.cos(aa)}" y1="${cy+150*Math.sin(aa)}" x2="${cx+278*Math.cos(aa)}" y2="${cy+278*Math.sin(aa)}" stroke="var(--gold)" stroke-width="3"/><text x="300" y="292" text-anchor="middle" font-size="13" fill="var(--muted)">NATAL INSIDE</text><text x="300" y="312" text-anchor="middle" font-size="13" fill="var(--gold)">TRANSITS OUTSIDE</text><text x="300" y="334" text-anchor="middle" font-size="11" fill="var(--muted)">ASC ${fmtPos(asc)}</text></svg>`;
      return svg;
    }
    function planetRows(pos,natalMode=false){return BODIES.map(b=>`<div class="planet-row"><img class="planet-medal" src="art/${PLANET_ART[b]}.svg" alt="" width="40" height="40" loading="lazy"><strong>${b} <span class="planet-glyph" aria-hidden="true">${GLYPH[b]}</span></strong><span>${fmtPos(pos[b].lon,pos[b].retro)}${natalMode?` · H${houseFor(pos[b].lon,asc)}`:''}</span></div>`).join('');}
    function phaseName(angle){if(angle<10||angle>=350)return'New Moon';if(angle<80)return'Waxing Crescent';if(angle<100)return'First Quarter';if(angle<170)return'Waxing Gibbous';if(angle<190)return'Full Moon';if(angle<260)return'Waning Gibbous';if(angle<280)return'Third Quarter';return'Waning Crescent';}
    function sunLongitude(date){return mod(Astronomy.Ecliptic(Astronomy.GeoVector(Astronomy.Body.Sun,date,true)).elon,360);}
    function renderBazi(date){
      if(typeof BaZi==='undefined')return null;
      const r=BaZi.reading(date,sunLongitude),d=r.day;
      const medal=document.getElementById('baziMedal');
      medal.src=BaZi.elementFile(d.stemEl);medal.alt=d.stemEl+' element medallion';
      document.getElementById('baziTitle').textContent=d.english+' day';
      document.getElementById('baziSub').textContent=`${d.hanzi} · ${d.pinyin} · ${d.nayin[1]} · hidden ${r.hiddenStems.map(s=>s.p).join(' ')}`;
      document.getElementById('baziOfficer').innerHTML=`<span>${r.officer.h}</span><b>${r.officer.en} day</b>`;
      document.getElementById('baziWeather').textContent=BaZi.weatherText(r);
      const tri=r.trine;
      const cells=[
        ['Month pillar',`${r.month.hanzi} ${r.month.pinyin}`,`${r.month.english} — ${r.month.stemYin?'Yin':'Yang'} ${r.month.stemEl} above, ${r.month.animal} below`],
        ['Year pillar',`${r.year.hanzi} ${r.year.pinyin}`,`${r.year.english} year`],
        ['Trine ally',tri?(tri.present?`${r.month.animal} present`:`${tri.allies.map(a=>a.animal).join(' · ')} apart`):'—',tri?`${d.animal} belongs to the ${tri.element} frame`:''],
        ['Travel star',r.isTravelStar?`${d.animal} · YiMa`:'—',r.isTravelStar?`one of the four traveling branches; the horse stands in ${r.travelHorse.animal}`:'not a travel-star branch'],
        ['Clash',`${d.animal} × ${r.clash.animal}`,'the opposite branch — friction to navigate, not fear']
      ];
      document.getElementById('baziGrid').innerHTML=cells.map(c=>`<div class="bazi-cell"><p class="k">${c[0]}</p><p class="v">${esc(c[1])}</p><p class="d">${esc(c[2])}</p></div>`).join('');
      document.getElementById('baziHex').innerHTML=`<span class="hex-char" aria-hidden="true">${r.hexagram.char}</span><div class="hex-lines" aria-hidden="true">${r.hexagram.lines.map(l=>`<i class="${l?'yang':'yin'}"></i>`).join('')}</div><div><p class="hex-name">Hexagram ${r.hexagram.number} · ${r.hexagram.hanzi} ${r.hexagram.pinyin} — ${r.hexagram.english}</p><p class="hex-gloss">${esc(r.hexagram.gloss)}. ASTRAEUS pillar-to-hexagram rotation — an interpretive layer, not classical doctrine.</p></div>`;
      return r;
    }
    function renderToday(date,t,asps){
      const progressed=progressedPositions(date),sa=solarArcPositions(date),nums=currentNumbers(date);
      const bz=renderBazi(date);
      const progExact=closestContacts(progressed,natal,1.25),solarExact=closestContacts(sa.pos,natal,1.25);
      const prog=(progExact.length?progExact:nearestContacts(progressed,natal,2)).slice(0,3),solar=(solarExact.length?solarExact:nearestContacts(sa.pos,natal,2)).slice(0,3);
      const primary=asps[0],phase=Astronomy.MoonPhase(date),illum=(1-Math.cos(phase*Math.PI/180))/2,retro=BODIES.filter(b=>t[b].retro);
      const focusTitle=primary?`${primary.a} ${primary.name} natal ${primary.b}`:'A quieter transit field';
      const focusText=primary?`At ${primary.orb.toFixed(2)}° and ${transitState(primary,date)}, this contact ${ASPECT_TONE[primary.name]} ${PLANET_THEME[primary.a]} in dialogue with your natal ${PLANET_THEME[primary.b]}. Treat it as a question to test against lived experience—not a promised event.`:'No major transit-to-natal contact falls inside the strict 2.5° orb. The slower progressions and solar arcs carry more of today’s reflective weight.';
      document.getElementById('todayHeading').textContent='Your day in five lenses';
      document.getElementById('todayDate').textContent=date.toLocaleString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
      document.getElementById('dailyFocusTitle').textContent=focusTitle;document.getElementById('dailyFocusText').textContent=focusText;
      document.getElementById('dailyCalcStamp').textContent=`Calculated locally · ${date.toISOString().replace('.000','')}`;
      document.getElementById('lensRow').innerHTML=`<span class="lens active">Transits · ${asps.length} tight</span><span class="lens ${progExact.length?'active':''}">Progressions · ${progExact.length} exact</span><span class="lens ${solarExact.length?'active':''}">Solar arc · ${solarExact.length} exact</span><span class="lens active">Personal day · ${nums.pd.value}</span>${bz?`<span class="lens active">Five elements · ${bz.day.pinyin}</span>`:''}`;
      document.getElementById('dailyMoon').textContent=phaseName(phase);document.getElementById('dailyMoonDetail').textContent=`${(illum*100).toFixed(0)}% illuminated · Moon ${fmtPos(t.Moon.lon)}`;
      document.getElementById('dailyNumber').textContent=`${nums.py.value} · ${nums.pm.value} · ${nums.pd.value}`;document.getElementById('dailyNumberDetail').textContent='Personal year · month · day';
      document.getElementById('dailyRetrogrades').textContent=retro.length?`${retro.length} retrograde${retro.length===1?'':'s'}`:'All direct';document.getElementById('dailyRetroDetail').textContent=retro.length?retro.join(' · '):'No planets retrograde in this set';
      const transitCard=primary?{title:focusTitle,detail:`${fmtPos(t[primary.a].lon,t[primary.a].retro)} · ${primary.orb.toFixed(2)}° · ${transitState(primary,date)}`,basis:'Current geocentric longitude compared with your natal position.'}:{title:'No tight major transit',detail:'The 2.5° transit orb contains no major contact.',basis:'Silence is retained rather than widening the orb to manufacture a signal.'};
      function layerCard(k,title,items,exactCount,basis){const rows=items.map(x=>`${x.a} ${x.glyph} natal ${x.b} · ${x.orb.toFixed(2)}°`).join('<br>');return `<article class="card report-card"><p class="kicker">${k}</p><h3>${title}</h3><p class="detail">${rows||'No measured contact.'}</p><p class="basis">${exactCount?`${exactCount} contact${exactCount===1?'':'s'} inside the fixed 1.25° orb.`:'Nearest contacts shown for context; none is inside the fixed 1.25° orb.'}<br>${basis}</p></article>`;}
      document.getElementById('timeLayerGrid').innerHTML=`<article class="card report-card"><p class="kicker">Transit field</p><h3>${transitCard.title}</h3><p class="detail">${transitCard.detail}</p><p class="basis">${transitCard.basis}</p></article>${layerCard('Secondary progressions','One day symbolically maps to one year',prog,progExact.length,`Progressed date: ${secondaryProgressedDate(date).toISOString().slice(0,10)}.`)}${layerCard('Solar arc',`${sa.arc.toFixed(2)}° directed arc`,solar,solarExact.length,'The progressed Sun’s arc is added equally to each natal longitude.')}`;
      const signCounts={};BODIES.forEach(b=>{const s=signOf(t[b].lon).name;signCounts[s]=(signCounts[s]||0)+1;});const concentration=Object.entries(signCounts).sort((a,b)=>b[1]-a[1])[0];
      const dignities=BODIES.slice(0,7).map(b=>[b,dignity(b,t[b].lon)]).filter(x=>x[1]!=='Neutral');
      const topBodies=[primary?.a,primary?.b,prog[0]?.a,prog[0]?.b,solar[0]?.a,solar[0]?.b].filter(Boolean),freq={};topBodies.forEach(b=>freq[b]=(freq[b]||0)+1);const echo=Object.entries(freq).sort((a,b)=>b[1]-a[1])[0];
      document.getElementById('patternStack').innerHTML=`<p class="kicker">Cross-lens audit</p><h3 style="font:500 28px/1.1 'Alegreya',serif;margin:5px 0 12px">${echo&&echo[1]>1?`${echo[0]} repeats across ${echo[1]} contacts`:'No single planet dominates'}</h3><div class="practice-list"><div class="practice"><b>1</b><div><h3>Sign concentration</h3><p>${concentration[1]} of 10 bodies are in ${concentration[0]}. This is descriptive clustering, not a verdict.</p></div></div><div class="practice"><b>2</b><div><h3>Traditional dignity</h3><p>${dignities.length?dignities.map(x=>`${x[0]} ${x[1].toLowerCase()}`).join(' · '):'No traditional planet is in domicile, exaltation, detriment, or fall.'}</p></div></div><div class="practice"><b>3</b><div><h3>Agreement check</h3><p>${echo&&echo[1]>1?`${echo[0]} recurs, so its theme deserves observation. Recurrence does not prove causation.`:'The lenses point in different directions. Keep the complexity instead of forcing one story.'}</p></div></div></div>`;
      const draw=dailyCard(date),c=draw.card;
      const drawIdx=TAROT.indexOf(draw.card);
      document.getElementById('dailyTarot').innerHTML=`<img class="tarot-art daily" src="${tarotFile(drawIdx)}" alt="${draw.card[0]} ${esc(draw.card[1])} — archetypal mirror, not a prediction" width="200" height="320" loading="lazy"><h3 style="font:500 30px/1 'Alegreya',serif;margin:12px 0 8px">${draw.card[1]} · ${draw.reversed?'Reversed':'Upright'}</h3><p class="muted">${draw.card[3]}${draw.reversed?' Turn the image inward: where is the quality blocked, excessive, or asking to be reintegrated?':''}</p><p class="formula">An archetypal mirror, not a prediction. Daily seed ${draw.seed} · ${draw.key}</p>`;
      const sunS=signOf(natal.Sun.lon),dayNum=nums.pd.value;
      const tm=document.getElementById('todayMedal');tm.src=zodiacFile(sunS.name);tm.alt=sunS.glyph+' '+sunS.name+' zodiac medallion';
      const ts=document.getElementById('todaySigil');ts.src=sigilFile(dayNum);ts.alt='Numerology sigil for personal day '+dayNum;
      document.getElementById('todayIdentityCap').textContent=`${sunS.glyph} ${sunS.name} · Personal day ${dayNum}`;
      const actionTheme=primary?PLANET_THEME[primary.a]:'attention and pacing';
      document.getElementById('dailyPractice').innerHTML=`<div class="practice"><b>1</b><div><h3>Name the live pressure</h3><p>Before acting, write one sentence about where ${actionTheme} feels most active. Separate the observation from the story about it.</p></div></div><div class="practice"><b>2</b><div><h3>Use the ${nums.pd.value} day deliberately</h3><p>${nums.pd.value===1?'Choose one clean beginning and make the first move.':nums.pd.value===2?'Prioritize listening, timing, and one important relationship.':nums.pd.value===3?'Translate one complex idea into a form another person can receive.':nums.pd.value===4?'Strengthen one structure, routine, or boundary.':nums.pd.value===5?'Create room for movement without abandoning the plan.':nums.pd.value===6?'Tend a responsibility, relationship, or part of home life.':nums.pd.value===7?'Research before acting; give solitude a defined purpose.':nums.pd.value===8?'Measure resources, consequences, and exchange clearly.':'Complete one open loop before beginning another.'}</p></div></div><div class="practice"><b>3</b><div><h3>Close with evidence</h3><p>Tonight, record what actually happened. Keep what proved useful; discard what did not match lived experience.</p></div></div>`;
    }
    function renderTransit(date){
      transitMoment=date;const t=positions(date),asps=transitAspects(t,natal);
      document.getElementById('chartWrap').innerHTML=chartSvg(t);
      document.getElementById('natalList').innerHTML=planetRows(natal,true);document.getElementById('transitList').innerHTML=planetRows(t,false);
      const aspectRows=asps.slice(0,12).map(a=>`<div class="aspect"><div class="aspect-mark">${a.glyph}</div><div><strong>${a.a} ${a.name} natal ${a.b}</strong><div class="muted">${fmtPos(t[a.a].lon,t[a.a].retro)} ↔ ${fmtPos(natal[a.b].lon)}</div></div><span class="orb">${a.orb.toFixed(2)}°</span></div>`).join('')||'<p>No major contacts within the 2.5° orb.</p>';
      document.getElementById('allAspects').innerHTML=aspectRows;document.getElementById('topAspects').innerHTML=asps.slice(0,4).map(a=>`<div class="aspect"><div class="aspect-mark">${a.glyph}</div><div><strong>${a.a} ${a.name} natal ${a.b}</strong><div class="muted">Measured separation</div></div><span class="orb">${a.orb.toFixed(2)}°</span></div>`).join('');
      const p=Astronomy.MoonPhase(date),ill=(1-Math.cos(p*Math.PI/180))/2,name=phaseName(p);
      document.getElementById('moonPhaseTitle').textContent=name;document.getElementById('moonAngle').textContent=`${p.toFixed(1)}°`;document.getElementById('moonIllum').textContent=`${(ill*100).toFixed(1)}% illuminated`;
      const shadow=Math.max(5,Math.min(100,(1-ill)*80));document.getElementById('moonVisual').style.boxShadow=`inset ${p<180?'-':' '}${shadow}px 0 0 #24343b,0 0 28px rgba(225,173,79,.18)`;
      document.getElementById('synthesisText').textContent=asps.length?`The closest contact is ${asps[0].a} ${asps[0].name} natal ${asps[0].b} at ${asps[0].orb.toFixed(2)}°. Use it as a prompt to notice the balance between immediate desire, existing commitments, and the choices that still belong to you.`:'No major contact is exact within the selected orb; the quieter geometry can be read as a lower-intensity review window.';
      document.getElementById('heroDate').textContent=`Transit calculation · ${date.toLocaleString(undefined,{dateStyle:'long',timeStyle:'short'})}`;
      document.getElementById('calcStamp').textContent=`Calculated ${date.toISOString().replace('.000','')}`;
      renderToday(date,t,asps);
    }
    function renderNumerology(){
      const cards=[
        ['Life path',LIFE.value,`Birth digits total: ${lifeRaw} → ${LIFE.steps.join(' → ')}`,NUM_THEMES[LIFE.value]],
        ['Expression',PYTH.expr.value,`Full name: ${PYTH.total} → ${PYTH.expr.steps.join(' → ')}`,NUM_THEMES[PYTH.expr.value]],
        ['Soul urge',PYTH.soulR.value,`Vowels: ${PYTH.soul} → ${PYTH.soulR.steps.join(' → ')}`,NUM_THEMES[PYTH.soulR.value]],
        ['Personality',PYTH.persR.value,`Consonants: ${PYTH.personality} → ${PYTH.persR.steps.join(' → ')}`,NUM_THEMES[PYTH.persR.value]],
        ['Birthday',BDAY.value,`${PERSON.birthDay} → ${BDAY.steps.join(' → ')}`,NUM_THEMES[BDAY.value]],
        ['Attitude',ATT.value,`Month ${PERSON.birthMonth} + day ${PERSON.birthDay} = ${PERSON.birthMonth+PERSON.birthDay} → ${ATT.steps.join(' → ')}`,NUM_THEMES[ATT.value]]
      ];
      document.getElementById('pythNumbers').innerHTML=cards.map(c=>`<div class="card num"><p class="kicker">${c[0]}</p><img class="sigil" src="${sigilFile(c[1])}" alt="Numerology sigil ${c[1]}" width="96" height="96" loading="lazy"><div class="n">${c[1]}</div><h3>${c[3]}</h3><div class="formula">${c[2]}</div></div>`).join('');
      document.getElementById('pythTotal').textContent=`${PYTH.total} → ${PYTH.expr.value}`;document.getElementById('chaldTotal').textContent=`${CHALD.total} → ${CHALD.expr.value}`;
      document.getElementById('pythBreakdown').textContent=PYTH.breakdown;document.getElementById('chaldBreakdown').textContent=CHALD.breakdown;
      const nums=currentNumbers(transitMoment),year=transitMoment.getFullYear();document.getElementById('personalYear').textContent=nums.py.value;document.getElementById('personalYearLabel').textContent=`${year} personal year`;document.getElementById('personalYearWhy').textContent=`Birth month ${PERSON.birthMonth} + birth day ${PERSON.birthDay} + universal year ${year} (${String(year).split('').join('+')} → ${nums.uy}) = ${nums.py.steps.join(' → ')}. This is a symbolic cycle marker, not a forecast.`;
    }
    const TAROT=[
      ['0','The Fool','◌','Beginnings, openness, and the courage to move without total certainty.'],['I','The Magician','✦','Directed attention; translating resources into deliberate action.'],['II','The High Priestess','◐','Inner knowing, silence, and information not yet ready to be forced.'],['III','The Empress','❈','Nurture, embodiment, creativity, and what grows through care.'],['IV','The Emperor','▣','Boundaries, structure, stewardship, and responsible authority.'],['V','The Hierophant','⌂','Tradition, shared meaning, teaching, and inherited systems.'],['VI','The Lovers','◇','Alignment, relationship, and choices that reveal values.'],['VII','The Chariot','➤','Directed momentum held between competing forces.'],['VIII','Strength','∞','Courage through regulation rather than domination.'],['IX','The Hermit','✧','Discernment, solitude, and the light found by looking closely.'],['X','Wheel of Fortune','⊙','Cycles, changing conditions, and the limits of control.'],['XI','Justice','⚖','Consequence, proportion, evidence, and clean decisions.'],['XII','The Hanged One','▽','A voluntary pause that changes perspective.'],['XIII','Death','✕','Necessary ending, release, and irreversible transition.'],['XIV','Temperance','⚗','Integration, calibration, and the intelligence of proportion.'],['XV','The Devil','⌁','Attachment, compulsion, and the contracts we can examine.'],['XVI','The Tower','ϟ','A structure meeting reality; disruption that reveals truth.'],['XVII','The Star','✺','Orientation, renewal, and a signal visible after upheaval.'],['XVIII','The Moon','☾','Ambiguity, imagination, and the need to test perception.'],['XIX','The Sun','☀','Clarity, vitality, and what becomes undeniable in light.'],['XX','Judgement','◉','Review, reckoning, and answering a deeper call.'],['XXI','The World','◎','Integration, completion, and a system becoming whole.']
    ];
    function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),3432918353),h=h<<13|h>>>19;return function(){h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^h>>>16)>>>0}}
    function mulberry32(a){return function(){let t=a+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
    function renderTarot(){
      const dateKey=transitMoment.toISOString().slice(0,10),seedText=`${PERSON.fullName}|${PERSON.birthUtc.toISOString()}|${dateKey}|ASTRAEUS-MIRROR-${tarotDraw}`;const hash=xmur3(seedText),seed=hash(),rng=mulberry32(seed),deck=TAROT.map((c,i)=>({c,i}));
      for(let i=deck.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
      const positions=['Context','Tension','Integration'];
      document.getElementById('tarotStage').innerHTML=deck.slice(0,3).map((x,i)=>{const rev=rng()<.5;return `<article class="tarot ${rev?'reversed':''}"><div><div class="position">${positions[i]} · ${rev?'Reversed':'Upright'}</div><div class="roman">${x.c[0]}</div></div><img class="tarot-art" src="${tarotFile(x.i)}" alt="${x.c[0]} ${esc(x.c[1])} — archetypal mirror, not a prediction" width="200" height="320" loading="lazy"><div><h3>${x.c[1]} <span class="tarot-glyph" aria-hidden="true">${x.c[2]}</span></h3><p>${x.c[3]}${rev?' Turn the archetype inward: notice blockage, excess, or a quality seeking reintegration.':''}</p><p class="formula">An archetypal mirror, not a prediction.</p></div></article>`;}).join('');
      document.getElementById('tarotSeed').textContent=`Seed inputs: full name + birth UTC + ${dateKey} + draw ${tarotDraw} · 32-bit seed ${seed} · Major Arcana v1 · Fisher–Yates shuffle`;
    }
    function openWhy(key){const d=whyData[key];if(!d)return;document.getElementById('whyTitle').textContent=typeof d.title==='function'?d.title():d.title;document.getElementById('whyBody').textContent=d.body;document.getElementById('whyCalc').textContent=typeof d.calc==='function'?d.calc():d.calc;document.getElementById('whyDialog').showModal();}
    function toast(text){const el=document.getElementById('toast');el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
    function bind(){
      document.addEventListener('click',e=>{const w=e.target.closest('[data-why]');if(w)openWhy(w.dataset.why);const t=e.target.closest('.tab');if(t){document.querySelectorAll('.tab').forEach(x=>x.setAttribute('aria-selected',x===t));document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===t.dataset.tab));window.scrollTo({top:document.querySelector('.nav').offsetTop-8,behavior:'smooth'});}});
      document.getElementById('closeDialog').onclick=()=>document.getElementById('whyDialog').close();
      document.getElementById('whyDialog').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.close()};
      document.getElementById('calculateBtn').onclick=()=>{const value=document.getElementById('moment').value;if(!value)return toast('Choose a date and time.');const d=new Date(value);if(Number.isNaN(d.getTime()))return toast('That date could not be read.');renderTransit(d);renderNumerology();renderTarot();toast('Recalculated on this device.');};
      document.getElementById('nowBtn').onclick=()=>{const d=new Date(),pad=n=>String(n).padStart(2,'0');document.getElementById('moment').value=`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;renderTransit(d);renderNumerology();renderTarot();toast('Using your device clock.');};
      document.getElementById('newMirror').onclick=()=>{tarotDraw++;renderTarot();toast(`Mirror ${tarotDraw} drawn reproducibly.`);};
      document.getElementById('refreshToday').onclick=()=>{const d=new Date();document.getElementById('moment').value=toLocalInput(d);renderTransit(d);renderNumerology();renderTarot();toast('Daily report refreshed.');};
      document.getElementById('openSky').onclick=()=>document.querySelector('[data-tab="sky"]').click();
      document.getElementById('changeData').onclick=()=>{document.getElementById('experience').hidden=true;document.getElementById('setup').hidden=false;document.getElementById('setupError').textContent='';const p=loadProfile();if(p){document.getElementById('fullName').value=p.fullName;document.getElementById('birthPlace').value=p.place;document.getElementById('birthDate').value=p.date;document.getElementById('birthTime').value=p.time;document.getElementById('birthTz').value=p.tz;document.getElementById('birthLat').value=p.lat;document.getElementById('birthLon').value=p.lon;}window.scrollTo({top:0,behavior:'smooth'});};
      const eraseBtn=document.getElementById('eraseData');if(eraseBtn)eraseBtn.onclick=()=>{if(confirm('Erase your saved birth data from this device? The app will forget your chart.')){clearProfile();PERSON=null;document.getElementById('experience').hidden=true;document.getElementById('setup').hidden=false;document.getElementById('birthForm').reset();const m=document.getElementById('orbitMedal');if(m)m.hidden=true;const os=document.getElementById('orbitSign');if(os)os.style.display='';toast('Birth data erased from this device.');window.scrollTo({top:0,behavior:'smooth'});}};
    }
    function initTimezone(){const sel=document.getElementById('birthTz');let zones=[];try{zones=Intl.supportedValuesOf('timeZone');}catch(e){zones=['UTC'];}const dev=Intl.DateTimeFormat().resolvedOptions().timeZone;zones.forEach(z=>{const o=document.createElement('option');o.value=z;o.textContent=z.replace(/_/g,' ');if(z===dev)o.selected=true;sel.appendChild(o);});}
    let placeTimer=null;
    function initPlaceSearch(){
      const input=document.getElementById('birthPlace'),box=document.getElementById('placeResults');
      input.addEventListener('input',()=>{
        document.getElementById('birthLat').value='';document.getElementById('birthLon').value='';
        box.hidden=true;box.innerHTML='';clearTimeout(placeTimer);
        const q=input.value.trim();if(q.length<3)return;
        placeTimer=setTimeout(async()=>{
          try{
            const r=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&addressdetails=0&q='+encodeURIComponent(q),{headers:{'Accept':'application/json'}});
            if(!r.ok)throw new Error('search failed');
            const list=await r.json();
            if(!list.length){box.hidden=false;box.innerHTML='<div class="place-empty">No matches — try a larger nearby city, or enter coordinates manually below.</div>';return;}
            box.innerHTML=list.map((p,i)=>`<button type="button" class="place-opt" role="option" data-i="${i}">${esc(p.display_name)}</button>`).join('');
            box.hidden=false;
            box.querySelectorAll('.place-opt').forEach(b=>b.onclick=()=>{const p=list[+b.dataset.i];input.value=p.display_name.split(',').slice(0,3).join(',').trim();document.getElementById('birthLat').value=p.lat;document.getElementById('birthLon').value=p.lon;box.hidden=true;box.innerHTML='';});
          }catch(e){box.hidden=false;box.innerHTML='<div class="place-empty">Place search is unavailable (offline?) — enter coordinates manually below.</div>';}
        },450);
      });
      document.addEventListener('click',e=>{if(e.target!==input&&!e.target.closest('#placeResults'))box.hidden=true;});
      document.getElementById('manualCoords').onclick=()=>{const w=document.getElementById('manualCoordsWrap');w.hidden=!w.hidden;};
    }
    let deferredPrompt=null;
    function initInstall(){
      window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;document.querySelectorAll('.install-btn').forEach(b=>{b.hidden=false;});});
      document.querySelectorAll('.install-btn').forEach(b=>b.addEventListener('click',async()=>{if(!deferredPrompt){toast('Use your browser\u2019s Share / Add to Home Screen option.');return;}deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;}));
      if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('sw.js').catch(()=>{});});}
    }
    function init(){
      initTimezone();initPlaceSearch();initInstall();
      document.getElementById('birthDate').max=new Date().toISOString().slice(0,10);bind();
      document.getElementById('birthForm').addEventListener('submit',e=>{e.preventDefault();const error=document.getElementById('setupError');error.textContent='';if(typeof Astronomy==='undefined'){error.textContent='The calculation core did not load. Please reload the page.';return;}try{preparePerson();toast('Saved on this device — your chart opens automatically from now on.');}catch(err){error.textContent=err.message;}});
      const prof=loadProfile();
      if(prof&&typeof Astronomy!=='undefined'){
        try{preparePerson(prof);}
        catch(e){prefillForm(prof);const se=document.getElementById('setupError');if(se)se.textContent='Welcome back — your saved details are filled in below. Tap “Generate my pattern map” to reload your chart.';}
      }else if(prof){prefillForm(prof);}
    }
    init();
  