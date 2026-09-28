/* ASTRAEUS — BaZi (Four Pillars) deterministic core, v1.
 *
 * Pure calendar conversion: Gregorian date -> stem-branch pillars, elements,
 * hidden stems, NaYin, day officers, trine relations, travel stars, and a
 * day-pillar hexagram. No network, no randomness, no birth data needed.
 *
 * Method notes (also surfaced in the app's "Why?" dialog):
 * - Day pillar: continuous 60-day JiaZi count, anchored to 1900-01-01 = JiaChen
 *   (day index 40). Verified against 2026-09-28 = YiSi (Wood Snake).
 * - Month/year branches: the Sun's ecliptic longitude across the 24 solar
 *   terms (Jie/section boundaries at 315° + 30°k). The caller supplies a
 *   sun-longitude function; in-app this is the embedded astronomy engine
 *   (true ecliptic of date; within ~1h of classical apparent-longitude terms).
 * - Month stem: WuHuDun rule from the year stem. Year stem/branch: LiChun rule.
 * - Day officer: Jian falls on the day branch equal to the month branch, then
 *   cycles forward through the 12 officers.
 * - Day-pillar hexagram: ASTRAEUS convention — a fixed rotation of the King Wen
 *   sequence, calibrated so the Wood Snake day (YiSi) reads hexagram 5 (Xu,
 *   Waiting), matching the reference daily reading. This is the app's own
 *   interpretive layer, NOT classical doctrine; it is labeled as such in UI.
 */
(function (global) {
  'use strict';

  var mod = function (n, m) { return ((n % m) + m) % m; };

  /* ---------------- fixed tables ---------------- */

  var STEMS = [
    { h: '甲', p: 'Jia',  el: 'Wood',  yin: false, img: 'like a great tree — reaches upward on principle, steady before it bends' },
    { h: '乙', p: 'Yi',   el: 'Wood',  yin: true,  img: 'like vines and flowers — always climbing toward the light; curiosity over force' },
    { h: '丙', p: 'Bing', el: 'Fire',  yin: false, img: 'like the sun — radiant and visible; warmth that reaches everyone' },
    { h: '丁', p: 'Ding', el: 'Fire',  yin: true,  img: 'like candlelight — a focused flame; precision that lights the dark' },
    { h: '戊', p: 'Wu',   el: 'Earth', yin: false, img: 'like a mountain — immovable and containing; what is built here holds' },
    { h: '己', p: 'Ji',   el: 'Earth', yin: true,  img: 'like garden soil — receptive and quietly fertile; nurture over push' },
    { h: '庚', p: 'Geng', el: 'Metal', yin: false, img: 'like raw ore and the axe — direct; cuts to the essence' },
    { h: '辛', p: 'Xin',  el: 'Metal', yin: true,  img: 'like fine metalwork — refined and precise; detail that endures' },
    { h: '壬', p: 'Ren',  el: 'Water', yin: false, img: 'like the ocean and great rivers — vast and moving; cannot be contained' },
    { h: '癸', p: 'Gui',  el: 'Water', yin: true,  img: 'like rain and morning dew — gentle and pervasive; finds every opening' }
  ];

  var BRANCHES = [
    { h: '子', p: 'Zi',   animal: 'Rat',     el: 'Water', img: 'quick-witted and resourceful; notices what others miss' },
    { h: '丑', p: 'Chou', animal: 'Ox',      el: 'Earth', img: 'patient and methodical; slow weight that moves the field' },
    { h: '寅', p: 'Yin',  animal: 'Tiger',    el: 'Wood',  img: 'bold and independent; acts on conviction' },
    { h: '卯', p: 'Mao',  animal: 'Rabbit',   el: 'Wood',  img: 'gentle and diplomatic; softens sharp edges' },
    { h: '辰', p: 'Chen', animal: 'Dragon',   el: 'Earth', img: 'magnetic and ambitious; larger than the room' },
    { h: '巳', p: 'Si',   animal: 'Snake',    el: 'Fire',  img: 'quiet and transformative — lies still, then moves in an instant; a candle-flame under the surface' },
    { h: '午', p: 'Wu',   animal: 'Horse',    el: 'Fire',  img: 'free and fast-moving; momentum loves company' },
    { h: '未', p: 'Wei',  animal: 'Goat',     el: 'Earth', img: 'artistic and calm; harmony as strategy' },
    { h: '申', p: 'Shen', animal: 'Monkey',   el: 'Metal', img: 'clever and playful; solves sideways' },
    { h: '酉', p: 'You',  animal: 'Rooster',  el: 'Metal', img: 'precise and observant; detail as devotion' },
    { h: '戌', p: 'Xu',   animal: 'Dog',      el: 'Earth', img: 'loyal and watchful; guards what matters' },
    { h: '亥', p: 'Hai',  animal: 'Pig',      el: 'Water', img: 'generous and sincere; enjoys the good without apology' }
  ];

  /* Hidden stems per branch, main qi first. */
  var HIDDEN = [
    [9], [5, 7, 9], [0, 2, 4], [1], [4, 1, 9], [2, 6, 4],
    [3, 5], [5, 1, 3], [6, 8, 4], [7], [4, 3, 7], [8, 0]
  ];

  /* NaYin (element-sound) for the 60 pillars, index 0 = JiaZi. [hanzi, english, element] */
  var NAYIN = [
    ['海中金', 'Sea Gold', 'Metal'], ['爐中火', 'Furnace Fire', 'Fire'], ['大林木', 'Great Forest Wood', 'Wood'],
    ['路旁土', 'Roadside Earth', 'Earth'], ['劍鋒金', 'Sword-Edge Metal', 'Metal'], ['山頭火', 'Mountain Fire', 'Fire'],
    ['澗下水', 'Stream Water', 'Water'], ['城頭土', 'Wall Earth', 'Earth'], ['白鑞金', 'White Wax Metal', 'Metal'],
    ['楊柳木', 'Willow Wood', 'Wood'], ['泉中水', 'Spring Water', 'Water'], ['屋上土', 'Roof Earth', 'Earth'],
    ['霹靂火', 'Thunder Fire', 'Fire'], ['松柏木', 'Pine Wood', 'Wood'], ['長流水', 'Long River Water', 'Water'],
    ['沙中金', 'Sand Gold', 'Metal'], ['山下火', 'Mountain-Foot Fire', 'Fire'], ['平地木', 'Plain Wood', 'Wood'],
    ['壁上土', 'Wall-Plaster Earth', 'Earth'], ['金箔金', 'Gold-Foil Metal', 'Metal'], ['覆燈火', 'Lamp Fire', 'Fire'],
    ['天河水', 'Heavenly River Water', 'Water'], ['大驛土', 'Great Road Earth', 'Earth'], ['釵釧金', 'Hairpin Metal', 'Metal'],
    ['桑柘木', 'Mulberry Wood', 'Wood'], ['大溪水', 'Great Stream Water', 'Water'], ['沙中土', 'Sand Earth', 'Earth'],
    ['天上火', 'Heaven Fire', 'Fire'], ['石榴木', 'Pomegranate Wood', 'Wood'], ['大海水', 'Great Sea Water', 'Water']
  ];

  /* 12 day officers: Jian falls on the day branch equal to the month branch. */
  var OFFICERS = [
    { h: '建', p: 'Jian',  en: 'Establish', line: 'a day for foundations — begin structures, set posts in the ground' },
    { h: '除', p: 'Chu',  en: 'Remove',    line: 'a day for clearing — sweep out the obsolete, release dead weight' },
    { h: '滿', p: 'Man',  en: 'Full',      line: 'a day of fullness — harvest what is ripe; do not overfill' },
    { h: '平', p: 'Ping', en: 'Balance',   line: 'a day for leveling — steady administration, fair dealing' },
    { h: '定', p: 'Ding', en: 'Settle',    line: 'a day for fixing — make arrangements firm and final' },
    { h: '執', p: 'Zhi',  en: 'Grasp',     line: 'a day for taking hold — seize the initiative, sign and commit' },
    { h: '破', p: 'Po',   en: 'Break',     line: 'a day of breaking — do not force outcomes; let cracks show' },
    { h: '危', p: 'Wei',  en: 'Caution',   line: 'a day for caution — move carefully, double-check everything' },
    { h: '成', p: 'Cheng', en: 'Success',  line: 'a day of completion — efforts come to fruition; finish things' },
    { h: '收', p: 'Shou', en: 'Receive',   line: 'a day for gathering in — collect, consolidate, accept' },
    { h: '開', p: 'Kai',  en: 'Open',      line: 'a day of openings — begin conversations and ventures' },
    { h: '閉', p: 'Bi',   en: 'Close',     line: 'a day of closure — keep things contained; finish quietly' }
  ];

  /* SanHe trine frames: [branches], element. */
  var TRINES = [
    { b: [8, 0, 4], el: 'Water' }, { b: [11, 3, 7], el: 'Wood' },
    { b: [2, 6, 10], el: 'Fire' }, { b: [5, 9, 1], el: 'Metal' }
  ];
  /* Travel-star (YiMa) branches and the day-branch -> YiMa map. */
  var TRAVEL_STARS = [2, 8, 5, 11];
  var YIMA = { 8: 2, 0: 2, 4: 2, 11: 5, 3: 5, 7: 5, 2: 8, 6: 8, 10: 8, 5: 11, 9: 11, 1: 11 };
  /* Clash pairs (LiuChong). */
  var CLASH = { 0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5 };

  /* Trigram line patterns, bottom line first. 1 = yang, 0 = yin. */
  var TRIGRAMS = [
    { h: '☰', p: 'Qian', lines: [1, 1, 1] }, { h: '☱', p: 'Dui', lines: [1, 1, 0] },
    { h: '☲', p: 'Li',  lines: [1, 0, 1] }, { h: '☳', p: 'Zhen', lines: [1, 0, 0] },
    { h: '☴', p: 'Xun', lines: [0, 1, 1] }, { h: '☵', p: 'Kan', lines: [0, 1, 0] },
    { h: '☶', p: 'Gen', lines: [0, 0, 1] }, { h: '☷', p: 'Kun', lines: [0, 0, 0] }
  ];

  /* 64 hexagrams, King Wen order: [upper trigram idx, lower trigram idx, hanzi, pinyin, english, gloss] */
  var HEXAGRAMS = [
    [0, 0, '乾', 'Qian', 'The Creative', 'pure initiating force — act from principle'],
    [7, 7, '坤', 'Kun', 'The Receptive', 'yielding strength — receive before responding'],
    [5, 3, '屯', 'Zhun', 'Sprouting', 'beginnings tangle — push through with care'],
    [6, 5, '蒙', 'Meng', 'Youthful Folly', 'not knowing is the start — ask the simple question'],
    [5, 0, '需', 'Xu', 'Waiting', 'patience — wait for the right conditions to cross'],
    [0, 5, '訟', 'Song', 'Conflict', 'stand your ground without forcing the fight'],
    [7, 5, '師', 'Shi', 'The Army', 'discipline and shared direction carry the day'],
    [5, 7, '比', 'Bi', 'Holding Together', 'alliance — choose what you stand beside'],
    [4, 0, '小畜', 'Xiao Chu', 'Small Taming', 'restraint now gathers power for later'],
    [0, 1, '履', 'Lu', 'Treading', 'walk carefully among power — courtesy protects'],
    [7, 0, '泰', 'Tai', 'Peace', 'flow between high and low — everything connects'],
    [0, 7, '否', 'Pi', 'Standstill', 'blocked weather — conserve, do not push'],
    [0, 2, '同人', 'Tong Ren', 'Fellowship', 'common purpose — open the circle wider'],
    [2, 0, '大有', 'Da You', 'Great Possession', 'abundance held responsibly'],
    [7, 6, '謙', 'Qian', 'Modesty', 'strength that does not announce itself'],
    [3, 7, '豫', 'Yu', 'Enthusiasm', 'a rhythm others can follow — move to shared music'],
    [1, 3, '隨', 'Sui', 'Following', 'adapt to the moment to lead it later'],
    [6, 4, '蠱', 'Gu', 'Repair', 'decay named can be mended — do the maintenance'],
    [7, 1, '臨', 'Lin', 'Approach', 'advance steadily — the time favors nearness'],
    [4, 7, '觀', 'Guan', 'Contemplation', 'step back and truly see before acting'],
    [2, 3, '噬嗑', 'Shi Ke', 'Biting Through', 'an obstacle must be met directly — bite through'],
    [6, 2, '賁', 'Bi', 'Grace', 'beauty in form — let the surface serve the substance'],
    [6, 7, '剝', 'Bo', 'Splitting Apart', 'what is hollow falls — keep to the solid core'],
    [7, 3, '復', 'Fu', 'Return', 'the turn has come — come back to the beginning'],
    [0, 3, '无妄', 'Wu Wang', 'Innocence', 'act without scheming — the straightforward path'],
    [6, 0, '大畜', 'Da Chu', 'Great Taming', 'great restraint storing great power'],
    [6, 3, '頤', 'Yi', 'Nourishment', 'watch what feeds you — and what you feed'],
    [1, 4, '大過', 'Da Guo', 'Great Exceeding', 'too much weight on the beam — rebalance'],
    [5, 5, '坎', 'Kan', 'The Abysmal', 'danger repeated — learn to move in deep water'],
    [2, 2, '離', 'Li', 'The Clinging', 'clarity depends on what it holds to — choose well'],
    [1, 6, '咸', 'Xian', 'Influence', 'mutual attraction — the smallest move resonates'],
    [3, 4, '恆', 'Heng', 'Duration', 'what lasts stays true through change'],
    [0, 6, '遯', 'Dun', 'Retreat', 'strategic withdrawal — distance is wisdom'],
    [3, 0, '大壯', 'Da Zhuang', 'Great Power', 'strength at its peak — use it justly'],
    [2, 7, '晉', 'Jin', 'Progress', 'advancement like sunrise — steady and visible'],
    [7, 2, '明夷', 'Ming Yi', 'Darkening', 'keep your light covered — endure the dim hour'],
    [4, 2, '家人', 'Jia Ren', 'The Family', 'order begins at home — roles held with care'],
    [2, 1, '睽', 'Kui', 'Opposition', 'differences acknowledged can still cooperate'],
    [5, 6, '蹇', 'Jian', 'Obstruction', 'blocked path — stop and find another way'],
    [3, 5, '解', 'Xie', 'Deliverance', 'tension releases — move while the way is open'],
    [6, 1, '損', 'Sun', 'Decrease', 'give something up to gain what matters'],
    [4, 3, '益', 'Yi', 'Increase', 'growth compounds — invest where it counts'],
    [1, 0, '夬', 'Guai', 'Breakthrough', 'decisive action — the moment to cut through'],
    [0, 4, '姤', 'Gou', 'Coming to Meet', 'an encounter arrives — meet it on your terms'],
    [1, 7, '萃', 'Cui', 'Gathering', 'people and resources collect — hold the center'],
    [7, 4, '升', 'Sheng', 'Pushing Upward', 'slow steady ascent — roots before branches'],
    [1, 5, '困', 'Kun', 'Oppression', 'confinement — find freedom inside the limits'],
    [5, 4, '井', 'Jing', 'The Well', 'the source does not move — draw from what is deep'],
    [1, 2, '革', 'Ge', 'Revolution', 'the old skin must go — change the form'],
    [2, 4, '鼎', 'Ding', 'The Cauldron', 'transformation through steady tending'],
    [3, 3, '震', 'Zhen', 'Thunder', 'shock awakens — stay grounded when it strikes'],
    [6, 6, '艮', 'Gen', 'Stillness', 'rest in the mountain — know when to stop'],
    [4, 6, '漸', 'Jian', 'Development', 'gradual progress — stage by stage'],
    [3, 1, '歸妹', 'Gui Mei', 'The Marrying Maiden', 'an unequal bond — know your place in it'],
    [3, 2, '豐', 'Feng', 'Abundance', 'fullness at noon — act before the light turns'],
    [2, 6, '旅', 'Lu', 'The Wanderer', 'a traveler\u2019s day — stay adaptable and honest'],
    [4, 4, '巽', 'Xun', 'The Gentle', 'soft persistence penetrates where force fails'],
    [1, 1, '兌', 'Dui', 'The Joyous', 'open exchange — joy shared doubles'],
    [4, 5, '渙', 'Huan', 'Dispersion', 'scatter the fog — dissolve what has frozen'],
    [5, 1, '節', 'Jie', 'Limitation', 'measure and boundary — enough is a decision'],
    [4, 1, '中孚', 'Zhong Fu', 'Inner Truth', 'sincerity reaches across any distance'],
    [3, 6, '小過', 'Xiao Guo', 'Small Exceeding', 'small steps over the line — mind the details'],
    [5, 2, '既濟', 'Ji Ji', 'After Completion', 'order achieved — stay alert at the summit'],
    [2, 5, '未濟', 'Wei Ji', 'Before Completion', 'almost there — the last stretch needs care']
  ];

  /* ---------------- calculation ---------------- */

  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) -
      Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }
  var JDN_ANCHOR = jdn(1900, 1, 1); /* 1900-01-01 = JiaXu, pillar index 10
    (cross-checked: 2000-01-01 = WuWu, 2026-09-28 = YiSi) */

  /* Day pillar index 0..59 (0 = JiaZi). Uses the UTC calendar date. */
  function dayPillarIndex(date) {
    return mod(jdn(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()) - JDN_ANCHOR + 10, 60);
  }

  /* Jie-section 0..11 from the Sun's ecliptic longitude (deg). */
  function jieSection(sunLon) {
    return Math.floor(mod(sunLon - 315, 360) / 30);
  }
  /* Month branch index from Jie section: Yin..Chou. */
  var SECTION_BRANCH = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1];
  function monthBranchIndex(sunLon) { return SECTION_BRANCH[jieSection(sunLon)]; }

  /* Pillar year: the Chinese year turns at LiChun (315°), ~Feb 4. */
  function pillarYear(date, sunLon) {
    var y = date.getUTCFullYear(), m = date.getUTCMonth() + 1;
    if (m === 1) return y - 1;
    if (m === 2 && jieSection(sunLon) !== 0) return y - 1;
    return y;
  }

  function yearPillar(py) {
    return { stem: mod(py - 4, 10), branch: mod(py - 4, 12) };
  }

  /* WuHuDun: month stem from year stem (0-based) and month branch. */
  function monthStemIndex(yearStem, monthBranch) {
    var monthNum = mod(monthBranch - 2, 12) + 1; /* Yin=1 .. Chou=12 */
    var ms1 = mod((yearStem + 1) * 2 + monthNum, 10);
    return mod(ms1 - 1, 10);
  }

  function pillarIndex(stem, branch) {
    for (var i = 0; i < 60; i++) {
      if (mod(i, 10) === stem && mod(i, 12) === branch) return i;
    }
    return -1;
  }

  function dayOfficerIndex(monthBranch, dayBranch) {
    return mod(dayBranch - monthBranch, 12);
  }

  /* ASTRAEUS pillar->hexagram convention: fixed King Wen rotation,
   * calibrated so YiSi (index 41) = hexagram 5 (Xu, Waiting). */
  function hexagramNumber(pillarIdx) {
    return mod(pillarIdx + 27, 64) + 1;
  }

  function trineOf(branch) {
    for (var i = 0; i < TRINES.length; i++) {
      if (TRINES[i].b.indexOf(branch) !== -1) return TRINES[i];
    }
    return null;
  }

  /* ---------------- public API ---------------- */

  function pillarParts(stem, branch) {
    var idx = pillarIndex(stem, branch);
    var nayin = NAYIN[Math.floor(idx / 2)];
    return {
      stem: stem, branch: branch, index: idx,
      stemH: STEMS[stem].h, stemP: STEMS[stem].p, stemEl: STEMS[stem].el, stemYin: STEMS[stem].yin,
      branchH: BRANCHES[branch].h, branchP: BRANCHES[branch].p,
      animal: BRANCHES[branch].animal, branchEl: BRANCHES[branch].el,
      english: STEMS[stem].el + ' ' + BRANCHES[branch].animal,
      hanzi: STEMS[stem].h + BRANCHES[branch].h,
      pinyin: STEMS[stem].p + BRANCHES[branch].p,
      nayin: nayin
    };
  }

  /* Full reading for a moment. sunLonFn(date) -> Sun's ecliptic longitude in degrees. */
  function reading(date, sunLonFn) {
    var sunLon = sunLonFn(date);
    var py = pillarYear(date, sunLon);
    var yp = yearPillar(py);
    var mb = monthBranchIndex(sunLon);
    var ms = monthStemIndex(yp.stem, mb);
    var di = dayPillarIndex(date);
    var ds = mod(di, 10), db = mod(di, 12);
    var off = dayOfficerIndex(mb, db);
    var hexN = hexagramNumber(di);
    var hex = HEXAGRAMS[hexN - 1];
    var trine = trineOf(db);
    return {
      dateISO: date.toISOString(),
      sunLongitude: sunLon,
      pillarYear: py,
      year: pillarParts(yp.stem, yp.branch),
      month: pillarParts(ms, mb),
      day: pillarParts(ds, db),
      officer: OFFICERS[off],
      officerIndex: off,
      hiddenStems: HIDDEN[db].map(function (s) { return STEMS[s]; }),
      hexagram: {
        number: hexN,
        char: String.fromCodePoint(0x4DC0 + hexN - 1),
        upper: TRIGRAMS[hex[0]], lower: TRIGRAMS[hex[1]],
        hanzi: hex[2], pinyin: hex[3], english: hex[4], gloss: hex[5],
        lines: TRIGRAMS[hex[1]].lines.concat(TRIGRAMS[hex[0]].lines) /* bottom first */
      },
      trine: trine ? {
        element: trine.el,
        allies: trine.b.filter(function (b) { return b !== db; }).map(function (b) { return BRANCHES[b]; }),
        present: trine.b.indexOf(mb) !== -1
      } : null,
      isTravelStar: TRAVEL_STARS.indexOf(db) !== -1,
      travelHorse: BRANCHES[YIMA[db]],
      clash: BRANCHES[CLASH[db]]
    };
  }

  /* Plain-language weather paragraph, reflective — never a prediction. */
  function weatherText(r) {
    var d = r.day, s = STEMS[d.stem], b = BRANCHES[d.branch];
    var pol = s.yin ? 'Yin' : 'Yang';
    var out = d.english + ' day — ' + d.hanzi + ' · ' + d.pinyin + ', ' + d.nayin[1] + '. ' +
      pol + ' ' + s.el + ' behaves ' + s.img + '. ' +
      'Underneath, the ' + b.animal + ' is ' + b.img + '. ';
    out += 'This is a ' + r.officer.en + ' (' + r.officer.h + ') day — ' + r.officer.line + '. ';
    out += 'The month carries ' + r.month.english + ' (' + r.month.pinyin + '): ' +
      (r.month.stemYin ? 'Yin' : 'Yang') + ' ' + r.month.stemEl + ' in the heavenly stem, ' +
      r.month.animal + ' below. ';
    if (r.trine) {
      var an = r.trine.allies.map(function (x) { return x.animal; }).join(' and ');
      out += r.trine.present
        ? 'The ' + b.animal + '\u2019s trine ally the ' + r.month.animal + ' is present — the ' + r.trine.element + ' frame is forming, so momentum has backing. '
        : 'The ' + b.animal + '\u2019s trine allies (' + an + ') stand apart today — the ' + r.trine.element + ' frame works alone. ';
    }
    if (r.isTravelStar) {
      out += b.animal + ' is one of the four travel stars — movement, messages, and change ride faster; the day\u2019s travel horse stands in ' +
        r.travelHorse.animal + ' (' + r.travelHorse.p + '). ';
    }
    out += 'Hexagram ' + r.hexagram.number + ' · ' + r.hexagram.pinyin + ' (' + r.hexagram.english + '): ' + r.hexagram.gloss + '.';
    return out;
  }

  global.BaZi = {
    STEMS: STEMS, BRANCHES: BRANCHES, OFFICERS: OFFICERS, HEXAGRAMS: HEXAGRAMS, TRIGRAMS: TRIGRAMS,
    dayPillarIndex: dayPillarIndex, monthBranchIndex: monthBranchIndex, pillarYear: pillarYear,
    yearPillar: yearPillar, monthStemIndex: monthStemIndex, dayOfficerIndex: dayOfficerIndex,
    hexagramNumber: hexagramNumber, pillarParts: pillarParts, reading: reading, weatherText: weatherText,
    elementFile: function (el) { return 'art/element-' + el.toLowerCase() + '.svg'; }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
