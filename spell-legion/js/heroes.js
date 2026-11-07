'use strict';
/* heroes.js — Nov 2026 roster: three new heroes (阴阳师 Onmyoji, 偶像 Idol, 巫师 Wizard) and a third,
   legendary weapon (神兵) for every hero. Loaded after sim.js: it adds content to the tables in content.js
   and wraps a few sim functions (autoFire, castSkill, autoCast, orbits, dmgP, hit, kill, newGame, bossSlain).
   New mechanics: summoned minions (G.minis), charm (charmed monsters fight each other), falling drops
   (bells, meteors, fireworks), binding seals and black holes (G.hx). */

/* ---------------- content ---------------- */
Object.assign(SPELLS,{
  // ---- legendary weapons for the existing heroes ----
  swordcase:{g:'匣',zh:'剑匣',en:'Sword Case',col:'#bfe9ff',auto:1,d:'普攻·神兵:剑匣中飞出数柄飞剑常伴左右,自行俯冲斩敌,再飞回身边。',de:'Normal attack · Legendary. Flying swords from the case stay with you, dive at enemies on their own and return.'},
  thunder:{g:'令',zh:'五雷令',en:'Five Thunders Token',col:'#ffe066',auto:1,d:'普攻·神兵:令牌一举,天雷劈向附近生命最高的数名敌人,并跳击旁人。',de:'Normal attack · Legendary. Raise the token: thunder strikes the toughest enemies nearby and arcs to their neighbours.'},
  flute:{g:'笛',zh:'玉笛',en:'Jade Flute',col:'#9ff0d0',auto:1,d:'普攻·神兵:笛声凝成一道长光束,贯穿一线所有敌人并减速,吹得越久越强。',de:'Normal attack · Legendary. The note becomes a long beam through every enemy in a line, slowing them; it grows the longer you hold it.'},
  bell:{g:'钟',zh:'铜钟',en:'Temple Bell',col:'#ffcf6a',auto:1,d:'普攻·神兵:巨钟从天而降砸向敌群,震晕并荡出钟波。',de:'Normal attack · Legendary. A great bell drops onto the crowd, stunning it and ringing out a shockwave.'},
  goldgu:{g:'蚕',zh:'金蚕蛊',en:'Golden Silkworm',col:'#ffd75a',auto:1,d:'普攻·神兵:金蚕常伴,扑咬敌人叠毒并吸血;它们杀死的敌人会孵出新蚕。',de:'Normal attack · Legendary. Golden gu stay with you, biting to stack poison and drain life; their kills hatch more.'},
  // ---- 阴阳师 Onmyoji ----
  katana:{g:'刃',zh:'妖刀',en:'Moon Katana',col:'#ff6b8a',auto:1,d:'普攻:向前斩出贯穿的月牙刀光,每第三刀十字斩并留下刀痕。',de:'Normal attack. Crescent cuts that pierce everything ahead; every third is a cross-cut that leaves a lingering scar.'},
  kusari:{g:'镰',zh:'锁镰',en:'Chain Sickle',col:'#c9b6ff',auto:1,d:'普攻:锁链钩住远处的敌人,把一线敌人拽到身前,再回旋一镰。',de:'Normal attack. Hook a distant foe, yank the whole line to you, then spin the sickle through them.'},
  shiki:{g:'式',zh:'式神',en:'Shikigami',col:'#f4f0ff',auto:1,d:'普攻·神兵:召出纸鹤式神常伴左右,自行俯冲穿刺敌人。',de:'Normal attack · Legendary. Paper-crane spirits stay with you and dive through enemies on their own.'},
  flash:{g:'瞬',zh:'瞬斩',en:'Flash Cut',col:'#ff6b8a',cost:26,cd:6,d:'瞬身穿过敌群重斩,刀光过后再补一刀残影。',de:'Blink-dash through the crowd with a heavy cut; an afterimage cuts them again.'},
  onibi:{g:'狐',zh:'鬼火',en:'Foxfire',col:'#7fd8ff',cost:30,cd:8,dur:6,d:'放出五团狐火,六秒内自行追击敌人并灼烧。',de:'Five foxfires hunt enemies on their own for six seconds and set them burning.'},
  seal:{g:'封',zh:'封魔',en:'Binding Seal',col:'#ff4a6a',cost:34,cd:10,d:'在敌群脚下结下封印:定住其中敌人并使其受伤 +25%,两秒后引爆。',de:'A seal on the thickest crowd: everything inside is held fast and takes 25% more damage, then it detonates.'},
  sakura:{g:'樱',zh:'樱吹雪',en:'Petal Storm',col:'#ffb3cf',cost:55,cd:18,dur:4,d:'四秒内樱花刀刃如雪落下,不断斩切周围敌人。',de:'For four seconds blade-petals fall all around you, cutting everything nearby.'},
  // ---- 偶像 Idol ----
  lightstick:{g:'棒',zh:'应援棒',en:'Lightstick',col:'#ff8fd8',auto:1,d:'普攻:爱心光束在敌人之间弹射,等级越高弹得越多。',de:'Normal attack. A heart beam that bounces from enemy to enemy; more bounces as it levels.'},
  mic:{g:'麦',zh:'麦克风',en:'Microphone',col:'#8fe3ff',auto:1,d:'普攻:向前唱出扇形声浪,每第四声飙出高音,让敌人倒戈。',de:'Normal attack. Sings a cone of sound; every fourth is a high note that turns enemies to your side.'},
  pyro:{g:'花',zh:'舞台烟火',en:'Stage Pyro',col:'#ffd75a',auto:1,d:'普攻·神兵:向敌群射出烟火,炸开后再迸出一圈星屑。',de:'Normal attack · Legendary. Fireworks burst on the crowd and scatter a ring of star shards.'},
  wink:{g:'心',zh:'心动',en:'Wink',col:'#ff6fb8',cost:28,cd:8,d:'抛出一扇爱心:被击中的敌人着迷三秒,转身攻击同伴。',de:'A fan of hearts: anything hit is charmed for three seconds and attacks its own side.'},
  dance:{g:'舞',zh:'舞步',en:'Dance Break',col:'#b38bff',cost:30,cd:10,dur:3,d:'三秒内移速 +40%,受伤 -30%,每拍震出一圈舞台冲击。',de:'For three seconds: +40% speed, 30% less damage taken, and a stage shockwave on every beat.'},
  fanchant:{g:'援',zh:'应援',en:'Fanchant',col:'#ffd27a',cost:36,cd:14,dur:6,d:'六秒内全部伤害 +30%,每次击杀回复生命与内力。',de:'For six seconds all damage +30%, and every kill restores HP and qi.'},
  encore:{g:'安',zh:'安可',en:'Encore',col:'#ff9fd0',cost:50,cd:20,d:'彩带炸开重伤周围、让附近敌人着迷,并立刻刷新其他武学冷却。',de:'A confetti blast that hits hard and charms nearby enemies, and instantly resets your other skills.'},
  // ---- 巫师 Wizard ----
  arcane:{g:'奥',zh:'奥术法杖',en:'Arcane Staff',col:'#a98bff',auto:1,d:'普攻:缓慢飞行的奥术法球,穿透一切,沿途不断电击周围敌人。',de:'Normal attack. A slow arcane orb that passes through everything, zapping enemies around it as it flies.'},
  fireball:{g:'焰',zh:'火球法典',en:'Fireball Tome',col:'#ff7a3c',auto:1,d:'普攻:火球命中后爆炸,点燃范围内的敌人。',de:'Normal attack. Fireballs explode on impact and set everything in the blast alight.'},
  meteor:{g:'陨',zh:'陨星法杖',en:'Meteor Staff',col:'#ff9a4a',auto:1,d:'普攻·神兵:召下陨星砸向敌群,留下燃烧的陨坑。',de:'Normal attack · Legendary. Calls meteors onto the crowd, leaving burning craters.'},
  blink:{g:'闪',zh:'闪现',en:'Blink',col:'#c7a4f0',cost:22,cd:5,d:'瞬移一段距离,起点与落点各炸开一团奥术。',de:'Teleport a short distance; arcane bursts at both ends.'},
  frostnova:{g:'霜',zh:'冰霜新星',en:'Frost Nova',col:'#8fdcf0',cost:32,cd:9,d:'冻结周围所有敌人两秒。',de:'Freezes everything around you for two seconds.'},
  manashield:{g:'盾',zh:'法力护盾',en:'Mana Shield',col:'#6fb8ff',cost:20,cd:14,dur:6,d:'六秒内六成伤害由内力承担。',de:'For six seconds, 60% of damage taken is paid with qi instead.'},
  blackhole:{g:'渊',zh:'黑洞',en:'Black Hole',col:'#b57cf0',cost:60,cd:20,dur:3,d:'在敌群中心撕开黑洞,三秒内吸入并碾压,最后坍缩爆炸。',de:'Tear open a black hole in the crowd: it drags enemies in for three seconds, then collapses in a blast.'},
});
Object.assign(CLASSES,{
  oni:{zh:'阴阳师',en:'Onmyoji',g:'陰',col:'#ff6b8a',main:'katana',skills:['flash','seal','onibi','sakura'],hp:110,mana:100,regen:14,dmg:1.04,spd:1.06,d:'妖刀斩月,结界封魔;以快打快的退魔剑士。',de:'A moon-cutting katana and binding seals: a fast, bursty demon hunter from the east.'},
  idol:{zh:'偶像',en:'Idol',g:'星',col:'#ff8fd8',main:'lightstick',skills:['wink','dance','fanchant','encore'],hp:95,mana:120,regen:17,dmg:.96,spd:1.08,d:'爱心弹射,一个眨眼让怪物倒戈;舞台属于你。',de:'Bouncing heart beams and a wink that turns monsters on each other: the stage is yours.'},
  wizard:{zh:'巫师',en:'Wizard',g:'巫',col:'#a98bff',main:'arcane',skills:['frostnova','blink','manashield','blackhole'],hp:85,mana:150,regen:20,dmg:.97,spd:1,d:'奥术法球、冰霜与黑洞;来自西方的大法师。',de:'Arcane orbs, frost and black holes: a spellcaster from the far west.'},
});
Object.assign(WEAPONS,{oni:['katana','kusari','shiki'],idol:['lightstick','mic','pyro'],wizard:['arcane','fireball','meteor']});
// Legendary attacks are equipment drops, equipped through the bag.
Object.assign(WEAPON_INFO,{
  swordcase:{need:'legend',trait:['飞剑常伴·自动俯冲','Swords that stay and dive'],awake:['万剑随身·飞剑 +2,伤害 +15%','Swords Everywhere: +2 swords, +15% damage']},
  thunder:{need:'legend',trait:['天雷专劈强敌','Thunder seeks the toughest'],awake:['五雷正法·落雷 +2,每道雷多跳一次','True Five Thunders: +2 strikes, each arcs once more']},
  flute:{need:'legend',trait:['贯穿光束·减速','Piercing beam, slows'],awake:['凤鸣·分出两道副光束','Phoenix Cry: two side beams']},
  bell:{need:'legend',trait:['天降巨钟·眩晕','Falling bell, stuns'],awake:['晨钟暮鼓·双钟齐落,眩晕 +0.6s','Dawn Bell, Dusk Drum: two bells, +0.6 s stun']},
  goldgu:{need:'legend',trait:['常伴蛊虫·吸血孵化','Biting swarm, lifesteal, hatches'],awake:['蛊王·金蚕 +3,啃咬叠两层毒','Gu King: +3 silkworms, bites stack two poison']},
  katana:{trait:['快斩·十字','Quick cuts, cross-slash'],awake:['月华·每第二刀十字斩,刀光 +30% 更远','Moonlight: cross-cut every second swing, +30% reach']},
  kusari:{need:'clsboss',cost:500,trait:['钩拽·回旋','Hook, pull, spin'],awake:['缚魂·拉扯两倍敌人,回旋伤害 +30%','Soul Bind: pulls twice as many, +30% spin damage']},
  shiki:{need:'legend',trait:['纸鹤常伴·穿刺','Cranes that stay and pierce'],awake:['千羽鹤·纸鹤 +3,伤害 +25%','Thousand Cranes: +3 cranes, +25% damage']},
  lightstick:{trait:['弹射·多目标','Bounces between targets'],awake:['全场应援·弹射 +2,每跳不衰减','Full-House Cheer: +2 bounces, no falloff']},
  mic:{need:'clsboss',cost:500,trait:['扇形声浪·魅惑','Sound cone, charms'],awake:['绝对音感·每第二声就是高音,魅惑 +1s','Perfect Pitch: every second note is a high note, +1 s charm']},
  pyro:{need:'legend',trait:['烟火·星屑','Fireworks, star shards'],awake:['安可烟火·一次两发,星屑 +4','Encore Fireworks: two at once, +4 shards']},
  arcane:{trait:['穿透法球·电击','Piercing orb that zaps'],awake:['奥术洪流·双法球,电击更快','Arcane Torrent: two orbs, faster zaps']},
  fireball:{need:'clsboss',cost:500,trait:['爆炸·点燃','Explodes, ignites'],awake:['炎爆·爆炸 +40%,留下火海','Pyroblast: +40% blast, leaves a sea of fire']},
  meteor:{need:'legend',trait:['陨星·燃烧陨坑','Meteors, burning craters'],awake:['星落·一次两颗陨星','Starfall: two meteors at once']},
});
Object.assign(NODE_EN,{'+1 飞剑 / 级':'+1 sword / rank','+1 雷 / 级':'+1 strike / rank','+1 副光束 / 级':'+1 side beam / rank','+1 钟 / 级':'+1 bell / rank','+1 金蚕 / 级':'+1 silkworm / rank','+1 刀光 / 级':'+1 crescent / rank','+2 拽人 / 级':'+2 pulled / rank','+1 纸鹤 / 级':'+1 crane / rank','+1 弹射 / 级':'+1 bounce / rank','+1 回声 / 级':'+1 echo / rank','+2 星屑 / 级':'+2 shards / rank','+1 法球 / 级':'+1 orb / rank','+1 陨星 / 级':'+1 meteor / rank','+1 狐火 / 级':'+1 foxfire / rank','+2 爱心 / 级':'+2 hearts / rank','魅惑 +1s / 级':'Charm +1 s / rank','冻结 +0.5s / 级':'Freeze +0.5 s / rank','吸力 +15% / 级':'Pull radius +15% / rank','残影有几率再斩一次':'The afterimage may cut once more','刀痕有几率引发电弧':'Scars may discharge arcs','命中有几率引发电弧':'Hits may arc lightning','爆炸有几率引发连锁':'The burst may chain a second one','着迷的敌人死亡时爆开':'Charmed enemies burst when they die'});
Object.assign(TREES,{
  swordcase:[N('count','剑匣','More Swords',3,1,'+1 飞剑 / 级'),N('dmg','锋锐','Keen Edge',3,1,'伤害 +12% / 级'),N('cd','疾飞','Swift Flight',3,2,'出手 +8% / 级'),N('size','御剑','Sword Reach',2,2,'范围 +15% / 级'),N('crit','要害','Vital Strike',2,3,'暴击 +5% / 级'),N('life','饮血','Blood Drinker',2,3,'命中回复 2% 伤害 / 级')],
  thunder:[N('count','连雷','More Strikes',3,1,'+1 雷 / 级'),N('dmg','天威','Heaven\'s Wrath',3,1,'伤害 +12% / 级'),N('cd','急令','Swift Command',3,2,'出手 +8% / 级'),N('size','雷域','Thunder Field',2,2,'范围 +15% / 级'),N('chain','雷霆万钧','Rolling Thunder',2,3,'命中有几率引发电弧'),N('crit','诛邪','Smite',2,3,'暴击 +5% / 级')],
  flute:[N('dmg','清音','Clear Note',3,1,'伤害 +12% / 级'),N('size','悠长','Long Note',3,1,'范围 +15% / 级'),N('count','和鸣','Harmony',2,2,'+1 副光束 / 级'),N('cd','急吹','Quick Breath',3,2,'出手 +8% / 级'),N('crit','裂石','Stone Splitter',2,3,'暴击 +5% / 级'),N('life','养气','Nourish',2,3,'命中回复 2% 伤害 / 级')],
  bell:[N('dmg','洪钟','Great Bell',3,1,'伤害 +12% / 级'),N('size','钟声远','Far Peal',3,1,'范围 +15% / 级'),N('cd','连敲','Rapid Strike',3,2,'出手 +8% / 级'),N('count','双钟','Twin Bells',2,2,'+1 钟 / 级'),N('knock','震荡','Shockwave',2,3,'击退 +50% / 级'),N('chain','余音','Lingering Peal',2,3,'爆炸有几率引发连锁')],
  goldgu:[N('count','孵化','Hatch',3,1,'+1 金蚕 / 级'),N('dmg','毒牙','Venom Fang',3,1,'伤害 +12% / 级'),N('cd','催蛊','Hasten',3,2,'出手 +8% / 级'),N('size','游走','Roam',2,2,'范围 +15% / 级'),N('life','食血','Blood Feast',2,3,'命中回复 2% 伤害 / 级'),N('crit','钻心','Burrow',2,3,'暴击 +5% / 级')],
  katana:[N('dmg','斩铁','Iron Cutter',3,1,'伤害 +12% / 级'),N('size','长刃','Long Edge',3,1,'范围 +15% / 级'),N('cd','快刀','Fast Blade',3,2,'攻速 +8% / 级'),N('count','月影','Moon Shadows',2,2,'+1 刀光 / 级'),N('crit','居合','Quickdraw',2,3,'暴击 +5% / 级'),N('chain','雷切','Lightning Edge',2,3,'刀痕有几率引发电弧')],
  kusari:[N('dmg','重镰','Heavy Sickle',3,1,'伤害 +12% / 级'),N('size','长链','Long Chain',3,1,'范围 +15% / 级'),N('cd','急收','Quick Recall',3,2,'出手 +8% / 级'),N('count','缠绕','Entangle',2,2,'+2 拽人 / 级'),N('knock','甩飞','Fling',2,3,'击退 +50% / 级'),N('life','饮血','Bloodthirst',2,3,'命中回复 2% 伤害 / 级')],
  shiki:[N('count','叠纸','Fold More',3,1,'+1 纸鹤 / 级'),N('dmg','灵力','Spirit Power',3,1,'伤害 +12% / 级'),N('cd','疾翔','Swift Wings',3,2,'出手 +8% / 级'),N('size','广翼','Wide Wings',2,2,'范围 +15% / 级'),N('crit','穿心','Heart Pierce',2,3,'暴击 +5% / 级'),N('chain','雷符','Thunder Paper',2,3,'命中有几率引发电弧')],
  flash:[N('dmg','一闪','Single Flash',3,1,'伤害 +12% / 级'),N('size','远遁','Far Step',3,1,'范围 +15% / 级'),N('cd','连闪','Chain Step',3,2,'冷却 -8% / 级'),N('cost','无念','No Mind',2,2,'内力消耗 -15% / 级'),N('chain','残心','Zanshin',2,3,'残影有几率再斩一次'),N('crit','必杀','Killing Edge',2,3,'暴击 +5% / 级')],
  onibi:[N('count','鬼火','More Fires',3,1,'+1 狐火 / 级'),N('dur','长明','Long Burn',3,1,'持续 +1s / 级'),N('dmg','业火','Hellfire',3,2,'伤害 +12% / 级'),N('cd','引魂','Call Souls',2,2,'冷却 -8% / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级'),N('life','噬魂','Soul Eater',2,3,'命中回复 2% 伤害 / 级')],
  seal:[N('size','大结界','Great Seal',3,1,'范围 +15% / 级'),N('dmg','破魔','Demonbane',3,1,'伤害 +12% / 级'),N('dur','久封','Long Seal',2,2,'持续 +1s / 级'),N('cd','速结','Swift Seal',3,2,'冷却 -8% / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级'),N('chain','雷封','Thunder Seal',2,3,'爆炸有几率引发连锁')],
  sakura:[N('dmg','花刃','Petal Edge',3,1,'伤害 +12% / 级'),N('size','满开','Full Bloom',3,1,'范围 +15% / 级'),N('dur','花期','Long Season',2,2,'持续 +1s / 级'),N('cd','再开','Bloom Again',3,2,'冷却 -8% / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级'),N('life','落英','Fallen Petals',2,3,'命中回复 2% 伤害 / 级')],
  lightstick:[N('count','连弹','More Bounces',3,1,'+1 弹射 / 级'),N('dmg','闪耀','Shine',3,1,'伤害 +12% / 级'),N('cd','快挥','Quick Wave',3,2,'出手 +8% / 级'),N('crit','心跳','Heartbeat',2,2,'暴击 +5% / 级'),N('chain','电光','Spark',2,3,'命中有几率引发电弧'),N('life','粉丝爱','Fan Love',2,3,'命中回复 2% 伤害 / 级')],
  mic:[N('dmg','声压','Pressure',3,1,'伤害 +12% / 级'),N('size','扩音','Amplify',3,1,'范围 +15% / 级'),N('cd','连唱','Run of Notes',3,2,'出手 +8% / 级'),N('count','回声','Echo',2,2,'+1 回声 / 级'),N('knock','震耳','Deafening',2,3,'击退 +50% / 级'),N('dur','余韵','Afterglow',2,3,'魅惑 +1s / 级')],
  pyro:[N('count','星屑','More Shards',3,1,'+2 星屑 / 级'),N('dmg','火药','Powder',3,1,'伤害 +12% / 级'),N('size','大烟花','Big Shell',3,2,'范围 +15% / 级'),N('cd','连发','Volley',3,2,'出手 +8% / 级'),N('chain','连环炸','Chain Burst',2,3,'爆炸有几率引发连锁'),N('crit','压轴','Finale',2,3,'暴击 +5% / 级')],
  wink:[N('count','万人迷','Heartthrob',3,1,'+2 爱心 / 级'),N('dur','着迷','Smitten',2,1,'魅惑 +1s / 级'),N('cd','秋波','Glance',3,2,'冷却 -8% / 级'),N('pierce','穿心','Pierce Hearts',2,2,'穿透 +1 / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级'),N('chain','心碎','Heartbreak',2,3,'着迷的敌人死亡时爆开')],
  dance:[N('dur','加时','Extended',2,1,'持续 +1s / 级'),N('size','舞台','Big Stage',3,1,'范围 +15% / 级'),N('dmg','重拍','Downbeat',3,2,'伤害 +12% / 级'),N('cd','返场','Callback',3,2,'冷却 -8% / 级'),N('knock','劲舞','Power Move',2,3,'击退 +50% / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级')],
  fanchant:[N('dur','长应援','Long Chant',3,1,'持续 +1s / 级'),N('cd','再来','Again',3,1,'冷却 -8% / 级'),N('cost','省力','Economy',3,2,'内力消耗 -15% / 级'),N('life','打榜','Chart Push',2,3,'命中回复 2% 伤害 / 级'),N('crit','尖叫','Scream',2,3,'暴击 +5% / 级')],
  encore:[N('size','全场','Whole Venue',3,1,'范围 +15% / 级'),N('dmg','彩带','Confetti',3,1,'伤害 +12% / 级'),N('cd','再安可','Encore Again',3,2,'冷却 -8% / 级'),N('dur','余温','Afterglow',2,2,'魅惑 +1s / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级'),N('crit','高潮','Climax',2,3,'暴击 +5% / 级')],
  arcane:[N('count','多重','Multi-Orb',2,1,'+1 法球 / 级'),N('dmg','奥能','Arcana',3,1,'伤害 +12% / 级'),N('size','大法球','Big Orb',3,2,'范围 +15% / 级'),N('cd','快咏','Fast Chant',3,2,'出手 +8% / 级'),N('chain','奥术电弧','Arcane Arc',2,3,'命中有几率引发电弧'),N('crit','洞察','Insight',2,3,'暴击 +5% / 级')],
  fireball:[N('dmg','炽热','Searing',3,1,'伤害 +12% / 级'),N('size','炎爆','Blast',3,1,'范围 +15% / 级'),N('cd','连咏','Quick Cast',3,2,'出手 +8% / 级'),N('pierce','穿焰','Pierce',2,2,'穿透 +1 / 级'),N('crit','焚心','Heartburn',2,3,'暴击 +5% / 级'),N('chain','连锁爆炸','Chain Blast',2,3,'爆炸有几率引发连锁')],
  meteor:[N('dmg','陨铁','Star Iron',3,1,'伤害 +12% / 级'),N('size','巨陨','Big Rock',3,1,'范围 +15% / 级'),N('cd','流星','Shooting Star',3,2,'出手 +8% / 级'),N('count','星群','Cluster',2,2,'+1 陨星 / 级'),N('chain','余烬','Embers',2,3,'爆炸有几率引发连锁'),N('crit','天谴','Wrath',2,3,'暴击 +5% / 级')],
  blink:[N('dmg','奥爆','Arcane Burst',3,1,'伤害 +12% / 级'),N('size','远闪','Far Blink',3,1,'范围 +15% / 级'),N('cd','连闪','Chain Blink',3,2,'冷却 -8% / 级'),N('cost','省力','Economy',2,2,'内力消耗 -15% / 级'),N('knock','冲击','Impact',2,3,'击退 +50% / 级'),N('crit','致命','Deadly',2,3,'暴击 +5% / 级')],
  frostnova:[N('dur','深寒','Deep Cold',2,1,'冻结 +0.5s / 级'),N('size','寒域','Cold Field',3,1,'范围 +15% / 级'),N('cd','霜回','Frost Return',3,2,'冷却 -8% / 级'),N('dmg','碎冰','Shatter',3,2,'伤害 +12% / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级'),N('chain','冰雷','Frost Thunder',2,3,'命中有几率引发电弧')],
  manashield:[N('dur','久护','Long Ward',3,1,'持续 +1s / 级'),N('cd','常驻','Ever Ready',3,1,'冷却 -8% / 级'),N('cost','省力','Economy',3,2,'内力消耗 -15% / 级'),N('dmg','反噬','Backlash',2,3,'伤害 +12% / 级'),N('size','广护','Wide Ward',2,3,'范围 +15% / 级')],
  blackhole:[N('size','视界','Event Horizon',3,1,'吸力 +15% / 级'),N('dmg','碾压','Crush',3,1,'伤害 +12% / 级'),N('dur','久撕','Long Tear',2,2,'持续 +1s / 级'),N('cd','重开','Reopen',3,2,'冷却 -8% / 级'),N('cost','省力','Economy',2,3,'内力消耗 -15% / 级'),N('chain','奇点','Singularity',2,3,'爆炸有几率引发连锁')],
});
Object.assign(SKILL_CAT,{swordcase:'summon',thunder:'ranged',flute:'ranged',bell:'control',goldgu:'summon',katana:'melee',kusari:'melee',shiki:'summon',flash:'melee',onibi:'summon',seal:'control',sakura:'melee',lightstick:'ranged',mic:'control',pyro:'ranged',wink:'control',dance:'defense',fanchant:'all',encore:'control',arcane:'ranged',fireball:'ranged',meteor:'ranged',blink:'defense',frostnova:'control',manashield:'defense',blackhole:'control'});
AUGS.burst.for.push('katana','lightstick','mic','fireball','thunder','wink','frostnova');
AUGS.split.for.push('katana','wink');
AUGS.split.by=AUGS.split.by||{};Object.assign(AUGS.split.by,{katana:['刀光命中后分出两道小月牙','Crescents split into two smaller ones on hit'],wink:['爱心命中后分成两颗小爱心','Hearts split into two smaller hearts on hit']});
AUGS.giant.for.push('katana','kusari','mic','pyro','arcane','fireball','meteor','bell','thunder','flute','seal','sakura','blackhole','frostnova','encore','dance','flash','blink');

/* ---------------- unlocks ---------------- */
/* ---------------- helpers ---------------- */
const sfx=(k,f)=>{if(typeof SFX==='undefined')return;const fn=SFX[k]||SFX[f];if(fn)fn()};
const hcol=s=>s.els&&s.els[0]?ELS[s.els[0]].col:SPELLS[s.id].col;
function densest(R,r){const P=G.P,c=G.en.filter(e=>!e.dead&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<R);let best=null,bs=-1;for(const e of c){let n=e.type==='boss'?4:0;for(const o of c)if(hyp(o.x-e.x,o.y-e.y)<r)n++;if(n>bs){bs=n;best=e}}return best}
function shootX(x,y,a,s,d,o,extra){const n=G.shots.length;shoot(x,y,a,s,d,o);if(G.shots.length>n&&extra)Object.assign(G.shots[G.shots.length-1],extra)}
function hline(x1,y1,x2,y2,c,T=.25,w=1){if(G.fx.length<CAP.fx)G.fx.push({k:'hline',x1,y1,x2,y2,t:T,T,c,w})}
function face(a){const P=G.P;P.dx=Math.cos(a);P.dy=Math.sin(a);P.yaw0=Math.atan2(P.dx,P.dy)}
function hx(){if(!G.hx)G.hx={seals:[],holes:[],drops:[]};if(!G.minis)G.minis=[];return G.hx}
function drop(k,x,y,T,on,col){hx().drops.push({k,x,y,x0:G.P.x,y0:G.P.y,t:0,T,on,col})}
function heroCharm(e,dur,s){if(!e||e.dead||e.type==='statue')return;if(e.type==='boss'){e.slow=Math.max(e.slow||0,1.5);return}const d=dur*(e.elite||e.warlord?.5:1);if(!(e.charm>0)&&s)s.ctrl=(s.ctrl||0)+1;e.charm=Math.max(e.charm||0,d);e.charmS=s;e.ct=null}
function charmTick(e,dt){
  e.charm-=dt;e.ctk=(e.ctk||0)-dt;
  if(!e.ct||e.ct.dead||e.ct.charm>0||e.ctr<=0){e.ctr=.4;let b=null,bd=200;near(e.x,e.y,200,o=>{if(o===e||o.charm>0||o.type==='statue'||o.dead)return;const d=hyp(o.x-e.x,o.y-e.y);if(d<bd){bd=d;b=o}});e.ct=b}
  e.ctr=(e.ctr||0)-dt;const t=e.ct;e.fr+=dt*4;
  if(t){const dx=t.x-e.x,dy=t.y-e.y,d=hyp(dx,dy)||1;if(d>e.r+t.r+2){const sp=e.spd*1.15;e.x+=dx/d*sp*dt;e.y+=dy/d*sp*dt}
    else if(e.ctk<=0){e.ctk=.55;const s=e.charmS;hit(t,(e.dmg*1.6+4),s,true,'#ff8fd8',dx/d*60,dy/d*60);if(G.fx.length<CAP.fx)spark(t.x,t.y,'#ff8fd8',3,50)}}
  if(!e.ghost)collide(e,e.r);
  if(e.charm<=0){e.charm=0;e.ct=null}
}

/* ---------------- legendary / new weapons (normal attacks) ---------------- */
function miniCount(s){let n=0;for(const m of G.minis)if(m.s===s&&m.perm)n++;return n}
function keepMinis(s,k,n){hx();const have=miniCount(s);for(let i=have;i<n;i++){const P=G.P;G.minis.push({k,s,perm:1,x:P.x,y:P.y-6,a:Math.random()*TAU,st:'o',cool:.2+i*.12,t:0,hits:new Map()});if(G.fx.length<CAP.fx)spark(P.x,P.y,hcol(s),5,70)}
  if(have>n){let drop=have-n;G.minis=G.minis.filter(m=>!(m.s===s&&m.perm&&drop-->0))}}
const HW={
  swordcase(s){const st=stat(s);keepMinis(s,'sword',3+Math.floor(s.lv/4)+st.n+(s.awake?2:0));s.cd=.3;return true},
  shiki(s){const st=stat(s);keepMinis(s,'crane',3+Math.floor(s.lv/4)+st.n+(s.awake?3:0));s.cd=.3;return true},
  goldgu(s){const st=stat(s);keepMinis(s,'gu',4+Math.floor(s.lv/4)+st.n+(s.awake?3:0));s.cd=.3;return true},
  thunder(s){const P=G.P,st=stat(s),R=230*st.size;const c=G.en.filter(e=>!e.dead&&e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<R);if(!c.length)return false;
    c.sort((a,b)=>(b.type==='boss'?1e9:b.hp)-(a.type==='boss'?1e9:a.hp));const k=Math.min(c.length,2+Math.floor(s.lv/5)+st.n+(s.awake?2:0));P.cast=1;
    const fn=()=>{const K=Math.max(k,2+Math.floor(s.lv/5)+st.n+(s.awake?2:0));for(let i=0;i<K;i++){const e=c[i%c.length];later(i*.07,()=>{if(e.dead)return;aoe(e.x,e.y,20*st.size,30*st.m,s,'#ffe066',false,{thunder:1,quiet:i>0});arc(e,13*st.m,s,s.awake?2:1)})}sfx('zap')};
    fn();if(st.burst)later(.3,fn);s.cd=.95*st.cdM;return true},
  flute(s){const P=G.P,st=stat(s),len=230*st.size,t=nearest(P.x,P.y,len,true);if(!t){s.beam=null;s.hold=0;return false}
    const a0=Math.atan2(t.y-P.y,t.x-P.x);face(a0);P.cast=Math.max(P.cast,.6);s.hold=Math.min(1,(s.hold||0)+.035);
    const side=(s.awake?2:0)+st.n,angs=[[a0,1]];for(let i=0;i<side;i++){const k=Math.floor(i/2)+1;angs.push([a0+(i%2?-1:1)*.26*k,.6])}
    const col=hcol(s);
    for(const [a,k] of angs){const ux=Math.cos(a),uy=Math.sin(a),ex=P.x+ux*len,ey=P.y+uy*len,mx=(P.x+ex)/2,my=(P.y+ey)/2;
      near(mx,my,len/2+20,e=>{if(e.type==='statue')return;const rx=e.x-P.x,ry=e.y-P.y,along=rx*ux+ry*uy;if(along<0||along>len)return;const perp=Math.abs(rx*uy-ry*ux);if(perp<e.r+5*st.size){hit(e,7.5*st.m*(1+.6*s.hold)*k,s,false,col,ux*14,uy*14);e.slow=Math.max(e.slow||0,.4)}});
      if(k<1)hline(P.x,P.y,ex,ey,col,.16,.7)}
    s.beam={pts:[[P.x,P.y-4],[P.x+Math.cos(a0)*len,P.y+Math.sin(a0)*len]],t:.18,hold:s.hold,col};
    if(SIMR()<.12)sfx('chime','wave');s.cd=.14*st.cdM;return true},
  bell(s){const P=G.P,st=stat(s),t=densest(170,50);if(!t)return false;P.cast=1.2;const col=hcol(s);
    const one=(x,y,big)=>{ring(x,y,48*st.size,col);drop('bell',x,y,.32,()=>{const R=48*st.size*(big?1:.8);aoe(x,y,R,64*st.m*(big?1:.7),s,col,false,{});
      near(x,y,R+12,e=>{if(e.type!=='boss'&&e.type!=='statue'&&hyp(e.x-x,e.y-y)<R+e.r){if(!(e.frz>0))s.ctrl=(s.ctrl||0)+1;e.frz=Math.max(e.frz||0,1+(s.awake?.6:0))}});
      if(G.pwaves.length<12)G.pwaves.push({x,y,r:6,R:95*st.size,v:300,d:8*st.m,s,hit:new Set(),knock:130*st.knock,col});shock(x,y,200,.04);trauma(.3);sfx('gong','roar')},col)};
    one(t.x,t.y,1);const extra=st.n+(s.awake?1:0);for(let i=0;i<extra;i++)later(.18*(i+1),()=>{const a=rnd(TAU);one(t.x+Math.cos(a)*60,t.y+Math.sin(a)*60,0)});
    s.cd=1.15*st.cdM;return true},
  katana(s){const P=G.P,st=stat(s),t=nearest(P.x,P.y,110*st.size,true);if(!t)return false;s.swing=(s.swing||0)+1;
    const a=Math.atan2(t.y-P.y,t.x-P.x),col=hcol(s),reach=s.awake?1.3:1,cross=s.swing%(s.awake?2:3)===0;face(a);P.cast=1.1;
    const fn=()=>{const n=1+st.n;for(let i=0;i<n;i++)shoot(P.x+Math.cos(a)*6,P.y+Math.sin(a)*6-6,a+(i-(n-1)/2)*.2,s,24*st.m,{v:300*st.size*reach,life:.3,pierce:99,r:7*st.size,knock:90*st.knock});
      G.fx.push({k:'wave',x:P.x,y:P.y,a,t:.2,T:.2,c:col,w:1.1});sfx('katana','slash')};
    fn();if(st.burst)later(.1,fn);
    if(cross){later(.07,()=>{for(const off of [-.42,.42])shoot(P.x,P.y-6,a+off,s,20*st.m,{v:320*st.size*reach,life:.3,pierce:99,r:7*st.size,knock:90*st.knock});
      const x=P.x+Math.cos(a)*48,y=P.y+Math.sin(a)*48;pool(x,y,24*st.size,2,10*st.m,s,{zap:nd(s,'chain')>0});const pl=G.pools[G.pools.length-1];if(pl)pl.col=col;hline(x-Math.cos(a+.8)*30,y-Math.sin(a+.8)*30,x+Math.cos(a+.8)*30,y+Math.sin(a+.8)*30,col,.35,1.3);hline(x-Math.cos(a-.8)*30,y-Math.sin(a-.8)*30,x+Math.cos(a-.8)*30,y+Math.sin(a-.8)*30,col,.35,1.3);trauma(.12);hitStop(.03)})}
    s.cd=.5*st.cdM;return true},
  kusari(s){const P=G.P,st=stat(s),R=165*st.size;let far=null,fd=0;near(P.x,P.y,R,e=>{if(e.type==='statue')return;const d=hyp(e.x-P.x,e.y-P.y);if(d<R&&d>fd){fd=d;far=e}});if(!far)return false;
    const a=Math.atan2(far.y-P.y,far.x-P.x),col=hcol(s);face(a);P.cast=1.2;hline(P.x,P.y-4,far.x,far.y,col,.25,.9);hit(far,40*st.m,s,false,col);
    let n=(6+st.n*2)*(s.awake?2:1);near(P.x,P.y,R+10,e=>{if(n<=0||e.type==='boss'||e.type==='statue')return;const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d<34||d>R)return;let da=Math.atan2(dy,dx)-a;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)>.42)return;const k=Math.min(900,8*(d-30))*(e.type==='giant'?.5:1);e.kx=-dx/d*k;e.ky=-dy/d*k;n--});
    later(.22,()=>{const r=58*st.size;let hits=0;near(P.x,P.y,r+14,e=>{const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d<r+e.r){hits++;hit(e,34*st.m*(s.awake?1.3:1),s,false,col,dx/d*60*st.knock,dy/d*60*st.knock)}});G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.24,T:.24,c:col,full:1,w:.7});if(hits){hitStop(.03);trauma(.1)}if(typeof SFX!=='undefined')SFX.whirlTick()});
    sfx('chain','throw');s.cd=.9*st.cdM;return true},
  lightstick(s){const P=G.P,st=stat(s),t=nearest(P.x,P.y,200,true);if(!t)return false;const col=hcol(s);P.cast=1;
    const beams=2+(s.lv>=6?1:0);const starts=[];near(P.x,P.y,210,e=>{if(e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<210)starts.push(e)});starts.sort((a,b)=>hyp(a.x-P.x,a.y-P.y)-hyp(b.x-P.x,b.y-P.y));
    const fn=()=>{for(let bi=0;bi<beams;bi++){const t0=starts.length?starts[bi%starts.length]:t;if(!t0||t0.dead)continue;const list=[t0],nb=3+Math.floor(s.lv/4)+st.n+(s.awake?2:0);let from=t0;
      for(let i=0;i<nb;i++){let b=null,bd=95;near(from.x,from.y,95,e=>{if(list.includes(e)||e.type==='statue')return;const d=hyp(e.x-from.x,e.y-from.y);if(d<bd){bd=d;b=e}});if(!b)break;list.push(b);from=b}
      let px=P.x,py=P.y-6;list.forEach((e,i)=>{const fx=px,fy=py;later(i*.045,()=>{if(e.dead)return;hline(fx,fy,e.x,e.y,col,.18,.8);hit(e,22*st.m*(s.awake?1:Math.pow(.92,i)),s,false,col,(e.x-fx)*.3,(e.y-fy)*.3);if(G.fx.length<CAP.fx)spark(e.x,e.y,col,3,50)});px=e.x;py=e.y})}
      sfx('chime','charm')};
    fn();if(st.burst)later(.13,fn);s.cd=.5*st.cdM;return true},
  mic(s){const P=G.P,st=stat(s),t=nearest(P.x,P.y,115*st.size,true);if(!t)return false;s.swing=(s.swing||0)+1;const high=s.swing%(s.awake?2:4)===0,a=Math.atan2(t.y-P.y,t.x-P.x),col=hcol(s);face(a);P.cast=1;
    const sing=(k)=>{const R=(high?165:105)*st.size,half=high?.72:.55;let n=0;near(P.x,P.y,R+14,e=>{if(e.type==='statue')return;const dx=e.x-P.x,dy=e.y-P.y,d=hyp(dx,dy)||1;if(d>R+e.r)return;let da=Math.atan2(dy,dx)-a;da=Math.atan2(Math.sin(da),Math.cos(da));if(Math.abs(da)>half)return;n++;hit(e,19*st.m*(high?1.5:1)*k,s,false,col,dx/d*70*st.knock,dy/d*70*st.knock);if(high&&k===1)heroCharm(e,2+(s.awake?1:0)+st.dur,s)});
      G.fx.push({k:'wave',x:P.x,y:P.y,a,t:.28,T:.28,c:high?'#ff8fd8':col,w:high?1.6:1});if(high){G.fx.push({k:'notes',x:P.x,y:P.y,a,t:.6,T:.6});trauma(.15)}if(typeof SFX!=='undefined')(high?SFX.wave:SFX.charm)()};
    sing(1);for(let i=0;i<nd(s,'count');i++)later(.16*(i+1),()=>sing(.55));if(st.burst)later(.2,()=>sing(.8));s.cd=.62*st.cdM;return true},
  pyro(s){const P=G.P,st=stat(s),t=densest(230,50);if(!t)return false;P.cast=1;const col=hcol(s);
    const shell=(tx,ty)=>drop('pyro',tx,ty,.5,()=>{const r=38*st.size;aoe(tx,ty,r,40*st.m,s,col,false,{quiet:1});sfx('pop');trauma(.15);const n=8+st.n*2+(s.awake?4:0),o=rnd(TAU);for(let i=0;i<n;i++)shoot(tx,ty-6,o+i/n*TAU,s,11*st.m,{v:190,life:.5,pierce:1,r:3.5,knock:40});
      if(nd(s,'chain')&&SIMR()<NODE_FX.chain*nd(s,'chain')*2)later(.25,()=>aoe(tx+rnd(-40,40),ty+rnd(-40,40),r*.7,26*st.m,s,'#ff8fd8',false,{quiet:1}))},col);
    shell(t.x,t.y);if(s.awake)later(.25,()=>shell(t.x+rnd(-50,50),t.y+rnd(-50,50)));sfx('whoosh','throw');s.cd=1.05*st.cdM;return true},
  arcane(s){const P=G.P,st=stat(s),t=nearest(P.x,P.y,220,true);if(!t)return false;const a=Math.atan2(t.y-P.y,t.x-P.x),n=1+(s.awake?1:0)+st.n;P.cast=1;
    for(let i=0;i<n;i++)shootX(P.x,P.y-6,a+(i-(n-1)/2)*.28,s,22*st.m,{v:105,life:2.3,pierce:99,r:7*st.size,knock:25},{zap:s.awake?.15:.22,zt:0});
    sfx('zap','charm');s.cd=.85*st.cdM;return true},
  fireball(s){const P=G.P,st=stat(s),t=nearest(P.x,P.y,230,true);if(!t)return false;P.cast=1;
    const fn=()=>{const tt=t.dead?nearest(P.x,P.y,240,true):t;if(!tt)return;const a=Math.atan2(tt.y-P.y,tt.x-P.x);shootX(P.x,P.y-6,a,s,26*st.m,{v:240,life:1,r:6*st.size,knock:60,pierce:st.pierce},{blast:{r:36*st.size*(s.awake?1.4:1),d:28*st.m,pool:s.awake}});sfx('whoosh','throw')};
    fn();if(st.burst)later(.14,fn);s.cd=.8*st.cdM;return true},
  meteor(s){const P=G.P,st=stat(s),t=densest(250,55);if(!t)return false;P.cast=1.2;const col=hcol(s);
    const one=(x,y,k)=>{ring(x,y,54*st.size,'#ff5a2a');sfx('whoosh');drop('meteor',x,y,.5,()=>{const r=54*st.size*k;aoe(x,y,r,58*st.m*k,s,col,false,{});shock(x,y,240,.05);trauma(.35);pool(x,y,30*st.size*k,2.2,12*st.m,s);const pl=G.pools[G.pools.length-1];if(pl)pl.col='#ff7a3c';
      near(x,y,r+10,e=>{if(hyp(e.x-x,e.y-y)<r+e.r&&e.type!=='statue'){e.burn=2.5;e.burnD=Math.max(e.burnD||0,6*st.m);e.burnS=s}});if(nd(s,'chain')&&SIMR()<NODE_FX.chain*nd(s,'chain')*2)later(.25,()=>aoe(x+rnd(-45,45),y+rnd(-45,45),r*.6,30*st.m,s,col,false,{quiet:1}))},col)};
    one(t.x,t.y,1);const extra=(s.awake?1:0)+st.n;for(let i=0;i<extra;i++)later(.3*(i+1),()=>{const a=rnd(TAU);one(t.x+Math.cos(a)*rnd(40,80),t.y+Math.sin(a)*rnd(40,80),.8)});
    s.cd=1.45*st.cdM;return true},
};
{const _af=autoFire;autoFire=function(s){const f=HW[s.id];return f?f(s):_af(s)}}
/* orbs that zap, fireballs that explode */
function heroZap(b,dt){b.zt-=dt;if(b.zt>0)return;b.zt=b.zap;const c=[];near(b.x,b.y,65,e=>{if(e.type!=='statue'&&hyp(e.x-b.x,e.y-b.y)<65)c.push(e)});if(!c.length)return;c.sort((p,q)=>hyp(p.x-b.x,p.y-b.y)-hyp(q.x-b.x,q.y-b.y));
  const st=stat(b.s);for(const t of c.slice(0,2)){G.arcs.push({x:b.x,y:b.y,x2:t.x,y2:t.y,t:.12,c:'#c7a4f0'});hit(t,11*st.m,b.s,false,'#c7a4f0')}}
function heroBlast(b){const B=b.blast,st=stat(b.s),col=hcol(b.s);aoe(b.x,b.y,B.r,B.d,b.s,col,false,{});near(b.x,b.y,B.r+10,e=>{if(e.type!=='statue'&&hyp(e.x-b.x,e.y-b.y)<B.r+e.r){e.burn=2.5;e.burnD=Math.max(e.burnD||0,5*st.m);e.burnS=b.s}});
  if(B.pool){pool(b.x,b.y,B.r*.7,2,10*st.m,b.s);const pl=G.pools[G.pools.length-1];if(pl)pl.col='#ff7a3c'}
  if(nd(b.s,'chain')&&SIMR()<NODE_FX.chain*nd(b.s,'chain')*2){const x=b.x,y=b.y;later(.2,()=>aoe(x+rnd(-36,36),y+rnd(-36,36),B.r*.7,B.d*.6,b.s,col,false,{quiet:1}))}}

/* ---------------- new skills ---------------- */
const HS={
  flash(s,st){const P=G.P,a=aimDir(240),dist=150*st.size;face(a);P.flashFrom=[P.x,P.y];P.flashS=s;P.dash=dist/560;P.ghostT=0;P.dashHit=new Set();trauma(.18,-P.dx,-P.dy);sfx('katana','dash')},
  onibi(s,st){hx();const P=G.P,n=5+st.n,T=SPELLS.onibi.dur+st.dur;for(let i=0;i<n;i++)G.minis.push({k:'wisp',s,x:P.x,y:P.y-6,a:i/n*TAU,st:'o',cool:.15+i*.08,t:0,T,hits:new Map()});ring(P.x,P.y,50,hcol(s));if(typeof SFX!=='undefined')SFX.array()},
  seal(s,st){const P=G.P,t=densest(220,60),x=t?t.x:P.x+P.dx*90,y=t?t.y:P.y+P.dy*90;hx().seals.push({x,y,r:70*st.size,t:0,T:2+st.dur*.5,s,a:0});ring(x,y,70*st.size,hcol(s));trauma(.15);if(typeof SFX!=='undefined')SFX.ward()},
  sakura(s,st){s.active=SPELLS.sakura.dur+st.dur;s.tk=0;G.flash=Math.max(G.flash,.2);trauma(.2);if(typeof SFX!=='undefined')SFX.whirl()},
  wink(s,st){const P=G.P,fn=()=>{const a=aimDir(220),n=7+st.n*2;face(a);for(let i=0;i<n;i++)shootX(P.x,P.y-6,a+(i-(n-1)/2)*.15,s,9*st.m,{v:210,life:.8,pierce:2+st.pierce,r:4.5*st.size,knock:30},{charm:3+st.dur});sfx('sparkle','charm')};fn();if(st.burst)later(.2,fn)},
  dance(s,st){s.active=SPELLS.dance.dur+st.dur;s.tk=0;G.P.dance=s.active;ring(G.P.x,G.P.y,60,hcol(s));sfx('beat','whirl')},
  fanchant(s,st){s.active=SPELLS.fanchant.dur+st.dur;G.P.fan=s.active;G.flash=Math.max(G.flash,.25);ring(G.P.x,G.P.y,70,hcol(s));showBanner('应援!伤害 +30%','Fanchant! +30% damage',1);if(typeof SFX!=='undefined')SFX.shrine()},
  encore(s,st){const P=G.P,R=130*st.size,col=hcol(s);aoe(P.x,P.y,R,(30+s.lv*1.5)*st.m,s,col,false,{});near(P.x,P.y,110*st.size,e=>{if(hyp(e.x-P.x,e.y-P.y)<110*st.size+e.r)heroCharm(e,2+st.dur,s)});
    for(const o of G.spells)if(o!==s&&!SPELLS[o.id].auto)o.cd=0;const cs=['#ff8fd8','#ffd75a','#8fe3ff','#b38bff','#7dffb0'];for(let i=0;i<5;i++)spark(P.x,P.y,cs[i],8,200);G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.45,T:.45,c:col,full:1,w:1.4});
    shock(P.x,P.y,320,.05,.5);showBanner('安可!武学冷却刷新','Encore! Skills refreshed',1.1);sfx('pop');sfx('levelup','complete')},
  blink(s,st){const P=G.P,col=hcol(s);let v=G.auto?null:(typeof input==='function'?input():null),dx,dy;
    if(v&&(v.x||v.y)){const l=hyp(v.x,v.y)||1;dx=v.x/l;dy=v.y/l}else{let cx=0,cy=0,n=0;near(P.x,P.y,140,e=>{if(e.type==='statue')return;cx+=e.x;cy+=e.y;n++});if(n){cx/=n;cy/=n;const l=hyp(P.x-cx,P.y-cy)||1;dx=(P.x-cx)/l;dy=(P.y-cy)/l}else{dx=P.dx;dy=P.dy}}
    const ox=P.x,oy=P.y,d=130*st.size;aoe(ox,oy,50*st.size,22*st.m,s,col,false,{quiet:1});if(G.ghosts.length<14)G.ghosts.push({x:ox,y:oy,yaw:P.yaw,t:.4,T:.4});
    for(let k=10;k>=0;k--){P.x=ox+dx*d*k/10;P.y=oy+dy*d*k/10;if(!(typeof blocked==='function'&&blocked(P.x,P.y)))break}collide(P,6);
    later(.05,()=>{aoe(P.x,P.y,50*st.size,22*st.m,s,col,false,{quiet:1});spark(P.x,P.y,col,12,120)});hline(ox,oy,P.x,P.y,col,.3,1.2);P.inv=Math.max(P.inv,.45);trauma(.12);sfx('blink','dash')},
  frostnova(s,st){const P=G.P,R=120*st.size,col=hcol(s);const fn=()=>{aoe(P.x,P.y,R,14*st.m,s,col,false,{quiet:1});near(P.x,P.y,R+14,e=>{if(e.type==='statue'||hyp(e.x-P.x,e.y-P.y)>R+e.r)return;if(e.type==='boss')e.slow=Math.max(e.slow||0,2);else{if(!(e.frz>0))s.ctrl=(s.ctrl||0)+1;e.frz=Math.max(e.frz||0,2+.5*nd(s,'dur'))}});
    G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.4,T:.4,c:col,full:1,w:1.2});shock(P.x,P.y,260,.04);trauma(.25);if(typeof SFX!=='undefined')SFX.ward()};fn();if(st.burst)later(.3,fn)},
  manashield(s,st){s.active=SPELLS.manashield.dur+st.dur;G.P.mshield=s.active;ring(G.P.x,G.P.y,50,hcol(s));if(typeof SFX!=='undefined')SFX.ward()},
  blackhole(s,st){const P=G.P,t=densest(240,70),x=t?t.x:P.x+P.dx*110,y=t?t.y:P.y+P.dy*110;hx().holes.push({x,y,R:150*st.size,t:0,T:SPELLS.blackhole.dur+st.dur*.5,tk:0,s});G.flash=Math.max(G.flash,.2);trauma(.25);sfx('void','array')},
};
{const _cs=castSkill;castSkill=function(i){const s=G.spells[i];const ok=_cs(i);if(ok&&s&&HS[s.id])HS[s.id](s,stat(s));return ok}}
{const _ac=autoCast;autoCast=function(){if(!G.auto)return;_ac();const P=G.P;
  for(let i=1;i<G.spells.length;i++){const s=G.spells[i];if(!HS[s.id])continue;if(!canCast(i))continue;const id=s.id;let go=false;
    if(id==='flash')go=countNear(P.x,P.y,170)>=3;
    else if(id==='onibi')go=countNear(P.x,P.y,190)>=3;
    else if(id==='seal')go=countNear(P.x,P.y,220)>=5||!!G.boss;
    else if(id==='sakura')go=countNear(P.x,P.y,140)>=6||!!G.boss;
    else if(id==='wink')go=countNear(P.x,P.y,170)>=4;
    else if(id==='dance')go=countNear(P.x,P.y,70)>=5||P.hp<P.maxHp*.5;
    else if(id==='fanchant')go=countNear(P.x,P.y,170)>=6||!!G.boss;
    else if(id==='encore')go=countNear(P.x,P.y,130)>=4&&G.spells.filter(o=>o!==s&&!SPELLS[o.id].auto).every(o=>o.cd>2);
    else if(id==='blink')go=countNear(P.x,P.y,50)>=5||P.hp<P.maxHp*.4;
    else if(id==='frostnova')go=countNear(P.x,P.y,80)>=4;
    else if(id==='manashield')go=P.hp<P.maxHp*.6&&P.mana>P.maxMana*.5;
    else if(id==='blackhole')go=countNear(P.x,P.y,240)>=7||!!G.boss;
    if(go)castSkill(i)}}}
function flashEnd(){const P=G.P,s=P.flashS;P.flashS=null;if(!s)return;const st=stat(s),col=hcol(s),list=[...(P.dashHit||[])],from=P.flashFrom||[P.x,P.y],to=[P.x,P.y];
  later(.13,()=>{hline(from[0],from[1],to[0],to[1],col,.4,1.8);let n=0;for(const e of list)if(!e.dead){n++;hit(e,(14+s.lv*.7)*st.m,s,false,col,0,0);spark(e.x,e.y,col,4,80)}if(n){hitStop(.06);trauma(.3)}if(typeof SFX!=='undefined')SFX.slash();
    if(nd(s,'chain')&&SIMR()<NODE_FX.chain*nd(s,'chain')*2)later(.15,()=>{for(const e of list)if(!e.dead)hit(e,(10+s.lv*.5)*st.m,s,false,col,0,0);hline(from[0],from[1],to[0],to[1],'#ffffff',.3,1.4)})})}

/* ---------------- per-frame: minions, seals, black holes, drops, buffs ---------------- */
const MINI={sword:{v:380,d:24,hc:.35,R:24},crane:{v:280,d:22,hc:.4,R:30},wisp:{v:230,d:12,hc:.5,R:34},gu:{v:220,d:13,hc:.35,R:20}};
function miniHit(m,e){const s=m.s,st=stat(s),M=MINI[m.k],col=hcol(s);let d=M.d*st.m;if(m.k==='sword'&&s.awake)d*=1.15;if(m.k==='crane'&&s.awake)d*=1.25;
  hit(e,d,s,false,col,(e.x-m.x)*2,(e.y-m.y)*2);if(G.fx.length<CAP.fx)spark(e.x,e.y,col,2,50);
  if(m.k==='wisp'){e.burn=2;e.burnD=Math.max(e.burnD||0,4*st.m);e.burnS=s}
  if(m.k==='gu'){poison(e,5*st.m,s,s.awake?2:1);heal(.35)}}
function miniTick(dt){const P=G.P,main=G.spells[0];
  for(const m of G.minis){m.t+=dt;if(m.T&&m.t>m.T){m.dead=1;spark(m.x,m.y,hcol(m.s),4,50);continue}if(m.perm&&m.s!==main){m.dead=1;continue}
    const M=MINI[m.k],st=stat(m.s),range=200*st.size;m.a+=dt*2.4;const ox=P.x+Math.cos(m.a)*M.R,oy=P.y-4+Math.sin(m.a)*M.R;m.cool-=dt;
    if(m.st==='o'){const dx=ox-m.x,dy=oy-m.y,d=hyp(dx,dy);if(d>2){const k=Math.min(1,dt*10);m.x+=dx*k;m.y+=dy*k}
      if(m.cool<=0&&P.down<=0){const c=[];near(P.x,P.y,range,e=>{if(e.type!=='statue'&&!(e.charm>0)&&hyp(e.x-P.x,e.y-P.y)<range&&c.length<8)c.push(e)});if(c.length){m.tgt=c[Math.floor(SIMR()*c.length)];m.st='d';m.n=0}else m.cool=.25}}
    else if(m.st==='d'){const t=m.tgt;if(!t||t.dead){m.st='b';continue}const dx=t.x-m.x,dy=t.y-m.y,d=hyp(dx,dy)||1,v=M.v*(1+.08*nd(m.s,'cd'))*dt;m.x+=dx/d*Math.min(v,d);m.y+=dy/d*Math.min(v,d);m.h=Math.atan2(dy,dx);
      if(m.k==='sword'||m.k==='crane')near(m.x,m.y,14,e=>{if(e===t||e.type==='statue')return;if(hyp(e.x-m.x,e.y-m.y)<e.r+6&&(m.hits.get(e)||-9)<m.t-M.hc){m.hits.set(e,m.t);miniHit(m,e)}});
      if(d<t.r+6){const latch=m.k==='gu'||m.k==='wisp';if((m.hits.get(t)||-9)<m.t-M.hc){m.hits.set(t,m.t);miniHit(m,t);if(!latch)m.n++}
        if(latch){if(t.dead){let b=null,bd=120;near(m.x,m.y,120,e=>{if(e.type==='statue'||e.charm>0||e.dead)return;const dd=hyp(e.x-m.x,e.y-m.y);if(dd<bd){bd=dd;b=e}});if(b)m.tgt=b;else m.st='b'}continue}
        if(m.n<4){const c=[];near(m.x,m.y,120,e=>{if(e!==t&&e.type!=='statue'&&!(e.charm>0)&&c.length<6)c.push(e)});if(c.length){m.tgt=c[Math.floor(SIMR()*c.length)];continue}}
        m.st='b';m.cool=M.hc*.5}}
    else{const dx=ox-m.x,dy=oy-m.y,d=hyp(dx,dy)||1,v=M.v*1.2*dt;m.x+=dx/d*Math.min(v,d);m.y+=dy/d*Math.min(v,d);m.h=Math.atan2(dy,dx);if(d<10)m.st='o'}}
  if(G.minis.length>60)G.minis.splice(0,G.minis.length-60);G.minis=G.minis.filter(m=>!m.dead)}
function heroTick(dt){const P=G.P,H=hx();miniTick(dt);
  for(const z of H.seals){z.t+=dt;z.a+=dt*1.6;near(z.x,z.y,z.r+12,e=>{if(e.type==='statue'||hyp(e.x-z.x,e.y-z.y)>z.r+e.r)return;e.shred=Math.max(e.shred||0,.2);if(e.type==='boss')e.slow=Math.max(e.slow||0,.3);else{if(!(e.frz>0))z.s.ctrl=(z.s.ctrl||0)+1;e.frz=Math.max(e.frz||0,.15)}});
    if(z.t>=z.T){z.dead=1;const st=stat(z.s);aoe(z.x,z.y,z.r,(40+z.s.lv*2)*st.m,z.s,hcol(z.s),false,{});shock(z.x,z.y,260,.05);if(nd(z.s,'chain')&&SIMR()<NODE_FX.chain*nd(z.s,'chain')*2)later(.25,()=>aoe(z.x,z.y,z.r*.7,(24+z.s.lv)*st.m,z.s,'#ffe066',false,{thunder:1}))}}
  H.seals=H.seals.filter(z=>!z.dead);
  for(const h of H.holes){h.t+=dt;h.tk-=dt;const st=stat(h.s);near(h.x,h.y,h.R+12,e=>{if(e.type==='boss'||e.type==='statue')return;const dx=h.x-e.x,dy=h.y-e.y,d=hyp(dx,dy)||1;if(d>h.R||d<6)return;const step=Math.min(d-5,(110+(h.R-d)*1.3)*dt);e.x+=dx/d*step;e.y+=dy/d*step});
    if(h.tk<=0){h.tk=.25;near(h.x,h.y,50,e=>{if(e.type!=='statue'&&hyp(e.x-h.x,e.y-h.y)<44+e.r)hit(e,3.2*st.m,h.s,false,'#b57cf0',0,0)})}
    if(h.t>=h.T){h.dead=1;aoe(h.x,h.y,72*st.size,(40+h.s.lv*2)*st.m,h.s,'#b57cf0',false,{});shock(h.x,h.y,320,.06,.5);trauma(.45);if(nd(h.s,'chain')&&SIMR()<NODE_FX.chain*nd(h.s,'chain')*2)later(.3,()=>aoe(h.x,h.y,50*st.size,30*st.m,h.s,'#b57cf0',false,{quiet:1}))}}
  H.holes=H.holes.filter(h=>!h.dead);
  for(const d of H.drops){d.t+=dt;if(d.t>=d.T){d.dead=1;d.on()}}H.drops=H.drops.filter(d=>!d.dead);
  P.dance=0;P.fan=0;P.mshield=0;P.sakura=0;
  for(const s of G.spells){if(!(s.active>0))continue;const st=stat(s);
    if(s.id==='sakura'){s.active-=dt;s.tk-=dt;P.sakura=s.active;if(s.tk<=0){s.tk=.05;for(let j=0;j<2;j++){const R=130*st.size,a=rnd(TAU),r=Math.sqrt(SIMR())*R,x=P.x+Math.cos(a)*r,y=P.y+Math.sin(a)*r;near(x,y,36,e=>{if(e.type!=='statue'&&hyp(e.x-x,e.y-y)<24*st.size+e.r)hit(e,10*st.m,s,false,'#ffb3cf',(e.x-x)*2,(e.y-y)*2)});hline(x-6,y-10,x+6,y+8,'#ffb3cf',.18,.6)}}}
    else if(s.id==='dance'){s.active-=dt;s.tk-=dt;P.dance=s.active;if(s.tk<=0){s.tk=.5;const R=70*st.size;aoe(P.x,P.y,R,8*st.m,s,hcol(s),false,{quiet:1});G.fx.push({k:'wave',x:P.x,y:P.y,a:0,t:.3,T:.3,c:hcol(s),full:1,w:.8});sfx('beat','whirlTick')}}
    else if(s.id==='fanchant'){s.active-=dt;P.fan=s.active}
    else if(s.id==='manashield'){s.active-=dt;P.mshield=s.active}}
}
{const _ob=orbits;orbits=function(dt){_ob(dt);heroTick(dt)}}
function heroMitigate(n){const P=G.P;if(P.dance>0)n*=.7;
  if(P.mshield>0&&P.mana>1){const part=Math.min(P.mana,n*.6);P.mana-=part;n-=part;G.absorbed=(G.absorbed||0)+part;const ms=G.spells.find(x=>x.id==='manashield');if(ms){ms.blocked=(ms.blocked||0)+part;if(nd(ms,'dmg')){const st=stat(ms);near(P.x,P.y,60*st.size,e=>{if(e.type!=='statue'&&hyp(e.x-P.x,e.y-P.y)<60*st.size+e.r)hit(e,8*st.m,ms,false,'#6fb8ff')})}}ring(P.x,P.y,26,'#6fb8ff');}
  return n}
{const _hit=hit;hit=function(e,d,s,noEl,col,kx,ky){if(G.P.fan>0&&!(s&&s.owner==='rival'))d*=1.3;return _hit(e,d,s,noEl,col,kx,ky)}}
{const _kill=kill;kill=function(e,s,kx,ky){const was=e.dead;const ch=e.charm>0?e.charmS:null;_kill(e,s,kx,ky);if(was||!e.dead||(s&&s.owner==='rival'))return;const P=G.P;
  if(s&&s.id==='goldgu'&&G.minis&&G.minis.filter(m=>m.s===s&&!m.perm).length<5)G.minis.push({k:'gu',s,x:e.x,y:e.y,a:rnd(TAU),st:'o',cool:0,t:0,T:6,hits:new Map()});
  if(P.fan>0){heal(1);P.mana=Math.min(P.maxMana,P.mana+2)}
  if(ch&&ch.id==='wink'&&nd(ch,'chain')&&SIMR()<NODE_FX.chain*nd(ch,'chain')*3){const x=e.x,y=e.y;later(.03,()=>aoe(x,y,30,14*stat(ch).m,ch,'#ff6fb8',false,{quiet:1}))}}}
{const _ng=newGame;newGame=function(a,b){_ng(a,b);G.minis=[];G.hx={seals:[],holes:[],drops:[]}}}

/* ---------------- drawing (called from render.js) ---------------- */
function heroShot(b,r,ux,uz,yaw,putSword,putTalis){const k=b.kind;
  if(k==='wink'){const p=-uz,q=ux;for(const [dx,dy,sz] of [[-.6,-.4,1],[.6,-.4,1],[0,.5,1.2]])glow(b.x+p*dx*r*1.4+ux*dy*r*1.4,9.5,b.y+q*dx*r*1.4+uz*dy*r*1.4,b.col,r*2.6*sz,1.6);glow(b.x,9.5,b.y,'#ffffff',r*1.4,1.6);for(let i=1;i<=3;i++)glow(b.x-ux*i*r*2,9.5,b.y-uz*i*r*2,'#ff8fd8',r*2.2*(1-i/4),.8);return true}
  if(k==='arcane'){const t=performance.now()/1000;glow(b.x,10,b.y,b.col,r*5,1.5);glow(b.x,10,b.y,'#ffffff',r*2,2);for(let i=0;i<4;i++){const a=t*6+i*1.57;glow(b.x+Math.cos(a)*r*1.8,10+Math.sin(a*1.3)*3,b.y+Math.sin(a)*r*1.8,'#e0d0ff',4,1.8)}return true}
  if(k==='fireball'){glow(b.x,9.5,b.y,'#ffb04a',r*4,2);glow(b.x,9.5,b.y,'#ffffff',r*1.6,2);for(let i=1;i<=5;i++)glow(b.x-ux*i*r*1.6,9.5+i*.6,b.y-uz*i*r*1.6,i%2?'#ff5a2a':'#ffb04a',r*3*(1-i/6),1.3*(1-i/6));return true}
  if(k==='pyro'){glow(b.x,10,b.y,i2c(b),r*2.6,2);glow(b.x-ux*r*2,10,b.y-uz*r*2,'#ffffff',r*1.4,1.2);return true}
  return false}
const PYRO_C=['#ffd75a','#ff8fd8','#8fe3ff','#7dffb0','#ffffff'];function i2c(b){return PYRO_C[(b.spin*10|0)%5]||'#ffd75a'}
function heroDraw1(tm,putSword,putTalis){if(!G.minis)return;
  for(const m of G.minis){const col=hcol(m.s),y=12+Math.sin(tm*5+m.a*3)*1.6,yaw=m.st==='o'?-m.a+Math.PI:Math.atan2(Math.cos(m.h||0),Math.sin(m.h||0));
    if(m.k==='sword'){putSword(m.x,y,m.y,m.st==='o'?Math.atan2(Math.cos(m.a+1.57),Math.sin(m.a+1.57)):Math.atan2(Math.cos(m.h),Math.sin(m.h)),0,0,1.05,col);glow(m.x,y,m.y,col,14,1)}
    else if(m.k==='crane'){putTalis(m.x,y+2,m.y,yaw,Math.sin(tm*14+m.a)*.6,0,.75);glow(m.x,y+2,m.y,'#ffffff',10,.8);glow(m.x,y+2,m.y,'#ff6b8a',6,.6)}
    else if(m.k==='wisp'){glow(m.x,y+2,m.y,col,16,1.5);glow(m.x,y+4,m.y,'#ffffff',6,2);glow(m.x,y+8+Math.sin(tm*12+m.a)*2,m.y,col,8,.9)}
    else if(m.k==='gu'){glow(m.x,6,m.y,'#ffd75a',9,1.6);glow(m.x,6,m.y,'#ffffff',3.5,2);glow(m.x-Math.cos(m.h||0)*4,6,m.y-Math.sin(m.h||0)*4,'#c69a2a',6,1)}}}
function heroDraw2(tm,useRing){const H=G.hx;
  for(const f of G.fx){if(f.k==='hline'){const k=f.t/f.T,L=hyp(f.x2-f.x1,f.y2-f.y1),n=Math.max(2,Math.min(40,L/5|0));for(let i=0;i<=n;i++){const q=i/n;glow(f.x1+(f.x2-f.x1)*q,9,f.y1+(f.y2-f.y1)*q,i%3?f.c:'#ffffff',(7*f.w)*k+2,1.6*k)}}
    else if(f.k==='notes'){const k=1-f.t/f.T;for(let i=0;i<6;i++){const a=f.a+(i-2.5)*.22,R=20+k*120;glow(f.x+Math.cos(a)*R,10+Math.sin(k*8+i)*5+k*10,f.y+Math.sin(a)*R,i%2?'#ff8fd8':'#8fe3ff',8*(1-k)+3,1.6*(1-k))}}}
  if(!H)return;
  for(const z of H.seals){const k=Math.min(1,z.t/.25),late=z.t>z.T-.4;useRing(z.x,1.2,z.y,z.r,late?'#ffffff':'#ff4a6a',.85*k);useRing(z.x,1.2,z.y,z.r*.62,'#ff4a6a',.6*k);for(let i=0;i<8;i++){const a=z.a+i/8*TAU;glow(z.x+Math.cos(a)*z.r*.8,4,z.y+Math.sin(a)*z.r*.8,'#ff4a6a',10,1.4);glow(z.x+Math.cos(-a)*z.r*.4,3,z.y+Math.sin(-a)*z.r*.4,'#ffd0d8',6,1)}}
  for(const h of H.holes){const k=Math.min(1,h.t/.3);useRing(h.x,1.2,h.y,h.R,'#6a3aa0',.35*k);useRing(h.x,1.3,h.y,36+Math.sin(tm*12)*3,'#b57cf0',.9*k);glow(h.x,10,h.y,'#140820',60,1.4);glow(h.x,10,h.y,'#b57cf0',40,.8);
    for(let i=0;i<14;i++){const a=tm*(3+i%3)+i*.45,R=(1-((tm*.8+i/14)%1))*h.R;glow(h.x+Math.cos(a)*R,8,h.y+Math.sin(a)*R,i%2?'#b57cf0':'#e0c8ff',6,1.4)}}
  for(const d of H.drops){const k=d.t/d.T;
    if(d.k==='meteor'){const y=180*(1-k)+6;glow(d.x+60*(1-k),y,d.y-30*(1-k),'#ffb04a',26,2);glow(d.x+60*(1-k),y,d.y-30*(1-k),'#ffffff',10,2);for(let i=1;i<6;i++)glow(d.x+60*(1-k)+i*8,y+i*16,d.y-30*(1-k)-i*4,'#ff5a2a',16-i*2,1.2-i*.18);useRing(d.x,1.2,d.y,54*(1-k*.4),'#ff5a2a',.5+k*.4)}
    else if(d.k==='bell'){const y=140*(1-k*k)+10;glow(d.x,y,d.y,d.col,30,1.8);glow(d.x,y-8,d.y,'#ffffff',12,1.5);useRing(d.x,1.2,d.y,40*(1-k*.3),d.col,.4+k*.5)}
    else if(d.k==='pyro'){const x=d.x0+(d.x-d.x0)*k,z=d.y0+(d.y-d.y0)*k,y=12+Math.sin(k*Math.PI)*60;glow(x,y,z,'#ffd75a',12,2);for(let i=1;i<5;i++){const q=Math.max(0,k-i*.04);glow(d.x0+(d.x-d.x0)*q,12+Math.sin(q*Math.PI)*60,d.y0+(d.y-d.y0)*q,'#ffb04a',8-i,1.2-i*.2)}}}
  for(const e of G.en){if(e.charm>0&&!e.dead){glow(e.x,(e.r||6)*2.8+18+Math.sin(tm*6+e.x)*2,e.y,'#ff6fb8',9,1.8);useRing(e.x,1,e.y,(e.r||6)+5,'#ff8fd8',.6)}}
  const P=G.P;
  if(P.sakura>0)for(let i=0;i<10;i++){const a=tm*1.3+i*.63,R=40+((tm*30+i*37)%100);glow(P.x+Math.cos(a)*R,40-((tm*40+i*13)%38),P.y+Math.sin(a)*R,i%2?'#ffb3cf':'#ffffff',5,1.5)}
  if(P.mshield>0){useRing(P.x,1.3,P.y,22+Math.sin(tm*8)*2,'#6fb8ff',.8);for(let i=0;i<6;i++){const a=tm*2+i*1.05;glow(P.x+Math.cos(a)*18,12+Math.sin(tm*3+i)*6,P.y+Math.sin(a)*18,'#9fd0ff',6,1.3)}}
  if(P.fan>0)for(let i=0;i<5;i++){const a=tm*3+i*1.26;glow(P.x+Math.cos(a)*26,30+Math.sin(tm*6+i)*3,P.y+Math.sin(a)*26,['#ff8fd8','#ffd75a','#8fe3ff','#b38bff','#7dffb0'][i],7,1.6)}
  if(P.dance>0){useRing(P.x,1.2,P.y,30+Math.sin(tm*16)*4,'#b38bff',.7);glow(P.x,70,P.y,'#ffe9ff',40,.5)}
}

/* ---------------- weapon meshes (held in the right hand) ---------------- */
const HERO_GEM_Y={swordcase:12,thunder:14,flute:16,bell:4,goldgu:4,katana:30,kusari:4,shiki:8,lightstick:17,mic:9,pyro:12,arcane:25,fireball:6,meteor:27};
function HERO_WEAPON_MESH(id){
  if(id==='katana')return [part(BOX(2.2,.7,2.2),'#d9a641',{p:[1.2,.6,5.4],emit:'#6a4a10',ei:.5}),part(CYL(.6,.6,7,6),'#1a1418',{p:[1.2,-3.4,5.4]}),part(BOX(.5,.8,.6),'#a8202e',{p:[1.2,-1.6,5.4]}),part(BOX(1.4,26,.35),'#e8edf2',{p:[1.5,14,5.4],r:[0,0,-.05],top:'#ffffff',emit:'#ff6b8a',ei:.35}),part(BOX(.45,25,.4),'#ffffff',{p:[2,13.8,5.4],r:[0,0,-.05],emit:'#ffc0d0',ei:1.2})];
  if(id==='kusari')return [part(CYL(.5,.5,8,6),'#3a2418',{p:[1.2,-1,5.4]}),part(BOX(7,1.2,.4),'#d7dde6',{p:[-1.6,3.6,5.4],r:[0,0,.35],top:'#ffffff',emit:'#c9b6ff',ei:.5}),...[0,1,2,3,4].map(i=>part(T3.TorusGeometry?new T3.TorusGeometry(.7,.2,4,8):SPH(.6,6,4),'#9aa2b0',{p:[1.2+Math.sin(i)*.6,-5.5-i*1.4,5.4],r:[i%2?1.57:0,0,0]})),part(SPH(1.2,8,6),'#5a5a66',{p:[1.2,-12.6,5.4]})];
  if(id==='shiki')return [part(BOX(4,5.6,.2),'#f4f0ff',{p:[1.2,2,6.2],r:[0,0,.1],emit:'#ffffff',ei:.4}),part(BOX(2.6,.6,.25),'#ff4a6a',{p:[1.2,3.6,6.3],emit:'#ff4a6a',ei:.8}),part(CONE(1.6,2.6,4),'#ffffff',{p:[1.2,7.4,5.4],r:[0,0,.6],emit:'#ffffff',ei:.6}),part(CONE(1.6,2.6,4),'#ffffff',{p:[3,6.6,5.4],r:[0,0,-.9],emit:'#ffffff',ei:.6})];
  if(id==='lightstick')return [part(CYL(.7,.8,8,8),'#f4f0ff',{p:[1.2,-1.2,5.4]}),part(CYL(1.2,1.2,1,10),'#ff5fae',{p:[1.2,3.2,5.4],emit:'#ff5fae',ei:.8}),part(SPH(2.6,12,10),'#ffd0ef',{p:[1.2,7,5.4],s:[1,1.15,1],emit:'#ff8fd8',ei:1.6}),part(SPH(1.2,8,6),'#ffffff',{p:[1.2,7.4,5.4],emit:'#ffffff',ei:2})];
  if(id==='mic')return [part(CYL(.6,.9,7,8),'#2a2433',{p:[1.2,-.5,5.4]}),part(CYL(1,1,.6,10),'#d9a641',{p:[1.2,3.2,5.4],emit:'#6a4a10',ei:.6}),part(SPH(1.9,10,8),'#c8ccd6',{p:[1.2,5.4,5.4],top:'#ffffff',emit:'#8fe3ff',ei:.5}),part(CYL(.15,.15,6,4),'#ff8fd8',{p:[1.2,-6,5.4],emit:'#ff8fd8',ei:1})];
  if(id==='pyro')return [part(CYL(1.1,1.4,9,8),'#b8322b',{p:[1.2,4,5.4],r:[.2,0,0],top:'#ffd75a'}),part(CYL(1.5,1.5,.6,10),'#ffd75a',{p:[1.2,8.4,6.3],r:[.2,0,0],emit:'#ffd75a',ei:1}),...[0,1,2,3,4].map(i=>{const a=i/5*TAU;return part(SPH(.6,6,4),PYRO_C[i],{p:[1.2+Math.cos(a)*1.8,11+Math.sin(a)*1.2,6.8+Math.sin(a)],emit:PYRO_C[i],ei:2})})];
  if(id==='arcane')return [part(CYL(.55,.7,36,7),'#4a3420',{p:[1.2,10,5.4],top:'#7a5a3a'}),part(CYL(1.4,.6,2.6,8),'#d9a641',{p:[1.2,28.6,5.4],emit:'#6a4a10',ei:.5}),...[0,1,2].map(i=>{const a=i/3*TAU;return part(CYL(.25,.25,4,4),'#d9a641',{p:[1.2+Math.cos(a)*1.4,31.2,5.4+Math.sin(a)*1.4],r:[Math.sin(a)*.4,0,-Math.cos(a)*.4]})})];
  if(id==='fireball')return [part(BOX(6,7.6,1.8),'#7a2a1a',{p:[1.4,0,7.2],top:'#a83a22'}),part(BOX(5.4,7,1.9),'#f1e6c8',{p:[1.6,0,7.1]}),part(BOX(1.2,7.8,2),'#d9a641',{p:[-1.4,0,7.2],emit:'#6a4a10',ei:.5}),part(SPH(1.4,8,6),'#ff7a3c',{p:[1.4,0,8.3],emit:'#ff7a3c',ei:2})];
  if(id==='meteor')return [part(CYL(.6,.8,38,7),'#2a1a14',{p:[1.2,11,5.4],top:'#5a3a2a'}),part(lump?lump(2.6,1,.25):SPH(2.6,8,6),'#4a2a1a',{p:[1.2,31,5.4],emit:'#ff5a2a',ei:.6}),part(CYL(1.3,1.3,1.6,8),'#d9a641',{p:[1.2,28.2,5.4],emit:'#6a4a10',ei:.5})];
  if(id==='swordcase')return [part(BOX(4.6,12,3.2),'#3a2418',{p:[1.2,3,5.4],top:'#6a4a2a'}),part(BOX(4.8,1,3.4),'#d9a641',{p:[1.2,8.6,5.4],emit:'#6a4a10',ei:.6}),part(BOX(4.8,1,3.4),'#d9a641',{p:[1.2,-2.6,5.4],emit:'#6a4a10',ei:.6}),...[-1,0,1].map(i=>part(BOX(.5,5,.3),'#dfe6ee',{p:[1.2+i*1.3,11.4,5.4],emit:'#bfe9ff',ei:1.2}))];
  if(id==='thunder')return [part(BOX(4,8,.8),'#5a3a22',{p:[1.2,3,5.4],top:'#8a5a32'}),part(BOX(3.2,7,.9),'#d9a641',{p:[1.2,3,5.5],emit:'#6a4a10',ei:.5}),part(BOX(1.6,.4,1),'#ffe066',{p:[1.2,5,5.6],emit:'#ffe066',ei:2}),part(BOX(.4,3,1),'#ffe066',{p:[1.2,2.4,5.6],emit:'#ffe066',ei:2}),part(CYL(.4,.4,4,6),'#b8322b',{p:[1.2,-2.4,5.4]})];
  if(id==='flute')return [part(CYL(.55,.55,22,8),'#7fd3b0',{p:[-3,1,7],r:[0,0,1.35],top:'#bff0dc',emit:'#3a8a6a',ei:.4}),...[0,1,2,3].map(i=>part(SPH(.32,6,4),'#14301f',{p:[-7+i*2.6,1.5+i*.5,7.6]})),part(BOX(.5,4,.3),'#ff6a6a',{p:[6.4,-1.2,7]})];
  if(id==='bell')return [part(CYL(.4,.4,6,6),'#3a2418',{p:[1.2,-1,5.4]}),part(CYL(1.6,3.4,5,12),'#c9922a',{p:[1.2,4.4,5.4],top:'#e8b84a',emit:'#6a4a10',ei:.5}),part(CYL(3.6,3.6,.6,12),'#e8b84a',{p:[1.2,2,5.4],emit:'#ffcf6a',ei:.6}),part(SPH(.8,8,6),'#5a3a1a',{p:[1.2,1.2,5.4]})];
  if(id==='goldgu')return [part(CYL(2,2.4,5,10),'#3a5a3a',{p:[1.2,-.4,5.8],top:'#5a8a5a'}),part(CYL(1.2,1.6,1.4,10),'#2a3a2a',{p:[1.2,2.6,5.8]}),...[0,1,2].map(i=>part(SPH(.7,6,4),'#ffd75a',{p:[1.2+(i-1)*1.2,4+i*.6,5.8+(i%2)*.6],s:[1.4,1,1],emit:'#ffd75a',ei:1.8}))];
  return null}

/* ---------------- emblems ---------------- */
(()=>{if(typeof ICON==='undefined')return;const S=ICON.S;
  const P=(d,o={})=>`<path d="${d}" fill="${o.f||'none'}" stroke="${o.s===undefined?'#fff':o.s}" stroke-width="${o.w??3}" stroke-linecap="round" stroke-linejoin="round"${o.o!==undefined?` opacity="${o.o}"`:''}/>`;
  const C=(x,y,r,o={})=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${o.f||'none'}" stroke="${o.s===undefined?'#fff':o.s}" stroke-width="${o.w??3}"${o.o!==undefined?` opacity="${o.o}"`:''}/>`;
  const L=(x1,y1,x2,y2,o={})=>P(`M${x1} ${y1}L${x2} ${y2}`,o);
  const rays=(n,r1,r2,o={},off=0)=>{let s='';for(let i=0;i<n;i++){const a=off+i/n*Math.PI*2;s+=L(32+Math.cos(a)*r1,32+Math.sin(a)*r1,32+Math.cos(a)*r2,32+Math.sin(a)*r2,o)}return s};
  const star=(x,y,r,c,w=2)=>{let d='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;d+=(i?'L':'M')+(x+Math.cos(a)*rr).toFixed(1)+' '+(y+Math.sin(a)*rr).toFixed(1)}return P(d+'Z',{f:c,s:'#fff',w})};
  const heart=(x,y,k,c)=>P(`M${x} ${y+12*k}C${x-10*k} ${y+4*k} ${x-14*k} ${y-2*k} ${x-14*k} ${y-7*k}C${x-14*k} ${y-12*k} ${x-10*k} ${y-15*k} ${x-6*k} ${y-15*k}C${x-3*k} ${y-15*k} ${x-1*k} ${y-13*k} ${x} ${y-10*k}C${x+1*k} ${y-13*k} ${x+3*k} ${y-15*k} ${x+6*k} ${y-15*k}C${x+10*k} ${y-15*k} ${x+14*k} ${y-12*k} ${x+14*k} ${y-7*k}C${x+14*k} ${y-2*k} ${x+10*k} ${y+4*k} ${x} ${y+12*k}Z`,{f:c,s:'#fff',w:2});
  const flame=(c,x=32,y=36,k=1)=>P(`M${x} ${y-22*k}C${x+9*k} ${y-10*k} ${x+14*k} ${y-2*k} ${x+9*k} ${y+8*k}C${x+5*k} ${y+14*k} ${x-5*k} ${y+14*k} ${x-9*k} ${y+8*k}C${x-14*k} ${y-2*k} ${x-7*k} ${y-8*k} ${x-3*k} ${y-12*k}C${x-1*k} ${y-6*k} ${x+3*k} ${y-6*k} ${x} ${y-22*k}Z`,{f:c,s:'#fff',w:2});
  const bolt=(c,x=32,y=32,k=1)=>P(`M${x+4*k} ${y-20*k}L${x-8*k} ${y+2*k}L${x+1*k} ${y+2*k}L${x-4*k} ${y+20*k}L${x+9*k} ${y-4*k}L${x} ${y-4*k}Z`,{f:c,s:'#fff',w:2});
  Object.assign(S,{
    swordcase:c=>P('M18 22H46V54H18Z',{f:'#5a3a22',s:'#fff',w:2.5})+P('M18 30H46M18 46H46',{s:'#d9a641',w:2.5})+L(24,24,24,8,{s:c,w:3})+L(32,24,32,6,{s:'#fff',w:3.5})+L(40,24,40,8,{s:c,w:3}),
    thunder:c=>P('M20 14H44V50H20Z',{f:'#d9a641',s:'#fff',w:2.5})+bolt(c,32,32,.8)+P('M26 54L32 60L38 54',{s:'#b8322b',w:3}),
    flute:c=>P('M10 46L54 18',{s:'#9ff0d0',w:7})+[0,1,2,3].map(i=>C(18+i*8,41-i*5,1.8,{f:'#120a14',s:'none'})).join('')+P('M50 12C56 8 60 12 56 18',{s:c,w:2.5,o:.8})+P('M44 8C50 2 58 4 58 10',{s:c,w:2,o:.6}),
    bell:c=>P('M32 10C22 10 18 20 18 32V42H46V32C46 20 42 10 32 10Z',{f:c,s:'#fff',w:2.5})+P('M14 44H50',{s:'#fff',w:3.5})+C(32,50,4,{f:'#fff',s:'none'})+P('M8 30C6 36 8 42 12 44M56 30C58 36 56 42 52 44',{s:c,w:2,o:.6}),
    goldgu:c=>P('M14 36C14 26 22 20 32 20C42 20 50 26 50 36C50 44 42 48 32 48C22 48 14 44 14 36Z',{f:c,s:'#fff',w:2.5})+P('M22 24V48M32 20V48M42 24V48',{s:'#7a5a10',w:2,o:.6})+C(48,32,3,{f:'#120a14',s:'none'})+P('M50 26L56 20M50 38L56 44',{s:'#fff',w:2.5}),
    katana:c=>`<g transform="rotate(-40 32 32)">${P('M30 6C34 14 35 30 33 44H29C30 30 30 16 30 6Z',{f:'#fff',s:'#fff',w:1})+P('M24 44H40',{s:c,w:4})+L(32,46,32,58,{s:'#1a1418',w:4.5})+L(32,46,32,58,{s:c,w:1.5,o:.8})}</g>`+P('M10 46C18 52 30 54 40 50',{s:c,w:3,o:.8}),
    kusari:c=>P('M38 12C50 14 56 24 52 34L44 28C46 22 44 18 38 18Z',{f:'#e8edf2',s:'#fff',w:2})+L(40,20,26,40,{s:'#5a3a22',w:4})+[0,1,2,3].map(i=>C(22-i*3,44+i*3,2.4,{s:c,w:2})).join('')+C(10,56,3.5,{f:'#9aa2b0',s:'#fff',w:1.5}),
    shiki:c=>P('M32 18L54 30L36 34L32 50L28 34L10 30Z',{f:'#f4f0ff',s:'#fff',w:2})+P('M32 18V50',{s:'#ff4a6a',w:2})+P('M28 14L32 18L36 14',{s:'#fff',w:2})+C(32,26,2,{f:'#ff4a6a',s:'none'}),
    flash:c=>P('M8 42L56 22',{s:'#fff',w:4})+P('M8 50L50 32',{s:c,w:3,o:.8})+P('M14 30L40 18',{s:c,w:2,o:.5})+P('M50 16L58 20L52 26',{s:'#fff',w:3}),
    onibi:c=>flame(c,22,38,.6)+flame(c,42,34,.7)+flame('#ffffff',32,24,.4)+C(32,48,3,{f:c,s:'none',o:.6}),
    seal:c=>C(32,32,22,{s:c,w:3})+C(32,32,14,{s:'#fff',w:2})+P('M32 10L37 27L54 32L37 37L32 54L27 37L10 32L27 27Z',{f:c,s:'#fff',w:1.5,o:.85}),
    sakura:c=>[0,1,2,3,4].map(i=>`<g transform="rotate(${i*72} 32 32)">${P('M32 32C26 26 26 16 32 12C38 16 38 26 32 32Z',{f:c,s:'#fff',w:1.8})}</g>`).join('')+C(32,32,4,{f:'#fff',s:'none'}),
    lightstick:c=>L(20,52,34,30,{s:'#fff',w:5})+heart(40,22,1,c)+C(40,20,3,{f:'#fff',s:'none',o:.8})+rays(6,24,30,{s:c,w:2,o:.5}),
    mic:c=>C(38,20,10,{f:'#c8ccd6',s:'#fff',w:2.5})+P('M33 15L43 25M33 25L43 15',{s:'#8a8f9a',w:1.5})+L(31,27,16,50,{s:'#fff',w:5})+P('M50 34C54 38 54 44 50 48M54 30C60 36 60 46 54 52',{s:c,w:2.5}),
    pyro:c=>star(32,28,14,c)+rays(8,18,26,{s:'#ff8fd8',w:2.5},.2)+L(32,42,30,58,{s:'#fff',w:2.5,o:.6}),
    wink:c=>heart(32,34,1.2,c)+P('M22 26C24 24 28 24 30 26',{s:'#120a14',w:2.5})+C(40,25,2.5,{f:'#120a14',s:'none'})+P('M26 38C30 42 36 42 40 38',{s:'#120a14',w:2.2}),
    dance:c=>C(32,14,5,{f:c,s:'#fff',w:2})+P('M32 20L30 36L20 52M30 36L42 50M30 26L18 22M30 26L46 18',{s:'#fff',w:3.5})+P('M50 44C54 40 58 44 54 48',{s:c,w:2.5}),
    fanchant:c=>[18,32,46].map((x,i)=>L(x,54,x+(i-1)*2,30,{s:'#fff',w:3})+C(x+(i-1)*2,24,6,{f:['#ff8fd8','#ffd75a','#8fe3ff'][i],s:'#fff',w:2})).join('')+P('M10 16L14 10M54 16L50 10',{s:c,w:2.5}),
    encore:c=>star(32,30,12,c)+[['#ff8fd8',12,14],['#8fe3ff',52,16],['#7dffb0',14,48],['#ffd75a',50,50],['#b38bff',32,56]].map(([k,x,y])=>P(`M${x-3} ${y-3}L${x+3} ${y+3}`,{s:k,w:3.5})).join(''),
    arcane:c=>L(18,56,40,20,{s:'#c9a24a',w:4})+C(44,16,8,{f:c,s:'#fff',w:2.5})+star(44,16,4,'#fff',1)+rays(6,18,26,{s:c,w:2,o:.5},.3),
    fireball:c=>C(36,28,12,{f:c,s:'#fff',w:2.5})+flame('#ffd75a',36,32,.45)+P('M24 36L8 52M28 40L16 54M22 30L10 40',{s:'#ff5a2a',w:3,o:.8}),
    meteor:c=>C(40,22,10,{f:'#5a3a2a',s:'#fff',w:2.5})+P('M33 29L12 50M36 32L20 54M30 26L8 42',{s:c,w:3.5})+P('M38 18L42 22M44 20L42 24',{s:'#ff8a3c',w:2}),
    blink:c=>C(18,40,7,{s:c,w:2.5,o:.6})+C(46,22,9,{f:c,s:'#fff',w:2.5})+P('M22 36L40 26',{s:'#fff',w:2.5})+P('M24 44L44 32',{s:c,w:2,o:.5})+star(46,22,4,'#fff',1),
    frostnova:c=>rays(6,6,26,{s:'#fff',w:3})+rays(6,16,22,{s:c,w:3},Math.PI/6)+C(32,32,5,{f:c,s:'#fff',w:2}),
    manashield:c=>P('M32 10L50 17V31C50 42 42 50 32 55C22 50 14 42 14 31V17Z',{f:c,s:'#fff',w:2.5})+star(32,32,8,'#fff',1),
    blackhole:c=>C(32,32,9,{f:'#120a14',s:'#fff',w:2.5})+P('M32 14C44 14 52 24 50 34',{s:c,w:3})+P('M32 50C20 50 12 40 14 30',{s:c,w:3})+P('M14 22C22 10 40 8 50 18',{s:c,w:2,o:.5})+P('M50 42C42 54 24 56 14 46',{s:c,w:2,o:.5}),
  })})();

/* ---------------- discoverability: 「新」 badge on unseen heroes, legendary progress on the results screen ---------------- */
const NEW_HEROES=['oni','idol','wizard'];
(()=>{const st=document.createElement('style');st.textContent=`
.cls{position:relative}.cls .newb{position:absolute;top:-7px;right:8px;font-style:normal;font:900 11px/1 var(--ui,inherit);color:#2a0a14;background:linear-gradient(90deg,#ffe9a0,#ff8fd8);border-radius:999px;padding:3px 8px;box-shadow:0 2px 10px #ff8fd866;animation:newb 1.6s ease-in-out infinite;z-index:2;pointer-events:none}
@keyframes newb{50%{transform:translateY(-2px) scale(1.06)}}@media (prefers-reduced-motion:reduce){.cls .newb{animation:none}}
.endleg{display:flex;align-items:center;gap:10px;margin:8px 0 2px;padding:8px 12px;border-radius:12px;border:1px solid color-mix(in srgb,var(--c) 45%,transparent);background:linear-gradient(100deg,color-mix(in srgb,var(--c) 14%,#140b12),#140b12e0);text-align:left}
.endleg>div{flex:1;min-width:0;display:grid;gap:2px}.endleg b{font-size:14px;color:#ffe9a0}.endleg small{font-size:12px;color:var(--dim,#b9a99a)}.endleg .ic{width:34px;height:34px;flex:none}
.endleg .pips{display:flex;gap:4px;font-style:normal}.endleg .pips span{width:12px;height:12px;border-radius:50%;border:1.5px solid #ffd27a88;background:#0006}.endleg .pips span.on{background:#ffd27a;box-shadow:0 0 8px #ffb04a}
.endleg.got{box-shadow:0 0 0 2px #ffd27a,0 0 24px #ffb04a66}`;document.head.appendChild(st)})();

/* ---------------- duel AI: rivals can be 阴阳师 / 偶像 / 巫师 ----------------
   The core rival code only knows the original kits, so for these heroes we hold its attack and skill timers
   and drive them here with simplified versions of the same moves (rival-owned, so kills score for the rival). */
function rivalNear(R,r){let b=null,bd=r;near(R.x,R.y,r,e=>{if(e.type==='statue')return;const d=hyp(e.x-R.x,e.y-R.y);if(d<bd){bd=d;b=e}});return b}
const RW={
  katana(R,s,st,t){const a=Math.atan2(t.y-R.y,t.x-R.x);s.swing=(s.swing||0)+1;shoot(R.x,R.y-6,a,s,24*st.m,{v:300,life:.3,pierce:99,r:7,knock:90});if(s.swing%3===0)for(const o of [-.42,.42])shoot(R.x,R.y-6,a+o,s,20*st.m,{v:320,life:.3,pierce:99,r:7,knock:90});G.fx.push({k:'wave',x:R.x,y:R.y,a,t:.2,T:.2,c:SPELLS.katana.col,w:1.1});s.cd=.5*st.cdM},
  lightstick(R,s,st,t){let from=t,list=[t];for(let i=0;i<3+Math.floor(s.lv/4);i++){let b=null,bd=95;near(from.x,from.y,95,e=>{if(list.includes(e)||e.type==='statue')return;const d=hyp(e.x-from.x,e.y-from.y);if(d<bd){bd=d;b=e}});if(!b)break;list.push(b);from=b}
    let px=R.x,py=R.y-6;list.forEach((e,i)=>{hline(px,py,e.x,e.y,SPELLS.lightstick.col,.18,.8);hit(e,22*st.m*Math.pow(.92,i),s,false,SPELLS.lightstick.col);px=e.x;py=e.y});s.cd=.5*st.cdM},
  arcane(R,s,st,t){const a=Math.atan2(t.y-R.y,t.x-R.x);shootX(R.x,R.y-6,a,s,22*st.m,{v:105,life:2.3,pierce:99,r:7,knock:25},{zap:.22,zt:0});s.cd=.85*st.cdM},
};
const RS={
  flash(R,s,st){const t=rivalNear(R,220);if(!t)return false;const a=Math.atan2(t.y-R.y,t.x-R.x),ox=R.x,oy=R.y;R.x+=Math.cos(a)*150;R.y+=Math.sin(a)*150;collide(R,6);const ux=Math.cos(a),uy=Math.sin(a);
    near((ox+R.x)/2,(oy+R.y)/2,90,e=>{if(e.type==='statue')return;const rx=e.x-ox,ry=e.y-oy,al=rx*ux+ry*uy;if(al<0||al>150||Math.abs(rx*uy-ry*ux)>e.r+14)return;hit(e,(26+s.lv*1.3)*st.m,s,false,SPELLS.flash.col)});hline(ox,oy,R.x,R.y,SPELLS.flash.col,.35,1.6);R.inv=Math.max(R.inv,.3);return true},
  seal(R,s,st){const t=rivalNear(R,200);if(!t)return false;const x=t.x,y=t.y,r=70;ring(x,y,r,SPELLS.seal.col);near(x,y,r+12,e=>{if(e.type!=='boss'&&e.type!=='statue'&&hyp(e.x-x,e.y-y)<r+e.r)e.frz=Math.max(e.frz||0,1.6)});later(1.8,()=>aoe(x,y,r,(40+s.lv*2)*st.m,s,SPELLS.seal.col,false,{quiet:1}));return true},
  onibi(R,s,st){const t=rivalNear(R,200);if(!t)return false;for(let i=0;i<5;i++)later(i*.12,()=>{const e=rivalNear(R,220);if(e){hit(e,24*st.m,s,false,SPELLS.onibi.col);e.burn=2;e.burnD=4*st.m;e.burnS=s;spark(e.x,e.y,SPELLS.onibi.col,5,60)}});return true},
  wink(R,s,st){const t=rivalNear(R,200);if(!t)return false;const a=Math.atan2(t.y-R.y,t.x-R.x);for(let i=0;i<7;i++)shootX(R.x,R.y-6,a+(i-3)*.15,s,9*st.m,{v:210,life:.8,pierce:2,r:4.5,knock:30},{charm:3});return true},
  dance(R,s,st){if(!rivalNear(R,80))return false;for(let i=0;i<6;i++)later(i*.5,()=>aoe(R.x,R.y,70,8*st.m,s,SPELLS.dance.col,false,{quiet:1}));R.inv=Math.max(R.inv,.8);return true},
  fanchant(R,s,st){if(!rivalNear(R,160))return false;const b=R.dmg;R.dmg*=1.3;later(6,()=>{R.dmg=b});ring(R.x,R.y,60,SPELLS.fanchant.col);return true},
  frostnova(R,s,st){if(!rivalNear(R,90))return false;aoe(R.x,R.y,120,14*st.m,s,SPELLS.frostnova.col,false,{quiet:1});near(R.x,R.y,132,e=>{if(e.type!=='boss'&&e.type!=='statue'&&hyp(e.x-R.x,e.y-R.y)<120+e.r)e.frz=Math.max(e.frz||0,2)});return true},
  blink(R,s,st){if(!rivalNear(R,45)&&R.hp>R.maxHp*.4)return false;const a=rnd(TAU);aoe(R.x,R.y,50,22*st.m,s,SPELLS.blink.col,false,{quiet:1});R.x+=Math.cos(a)*130;R.y+=Math.sin(a)*130;collide(R,6);R.inv=Math.max(R.inv,.45);return true},
  manashield(R,s,st){if(R.hp>R.maxHp*.6)return false;R.inv=Math.max(R.inv,1.5);ring(R.x,R.y,40,SPELLS.manashield.col);return true},
};
{const _rt=rivalTick;rivalTick=function(dt){const R=G&&G.rival;if(!R||!RIVAL_NEW.includes(R.cls))return _rt(dt);
  const hold=R.spells.map(s=>s.cd);for(const s of R.spells)s.cd=Math.max(s.cd,1); // the core loop sees everything on cooldown
  _rt(dt);R.spells.forEach((s,i)=>{s.cd=Math.max(0,hold[i]-dt)});if(R.down>0||G.over)return;
  const main=R.spells[0],mst=stat(main),t=rivalNear(R,main.id==='katana'?110:200);
  if(main.cd<=0&&t&&RW[main.id]){const a=Math.atan2(t.y-R.y,t.x-R.x);R.dx=Math.cos(a);R.dy=Math.sin(a);R.yaw0=Math.atan2(R.dx,R.dy);R.cast=1;RW[main.id](R,main,mst,t)}
  for(let i=1;i<R.spells.length;i++){const s=R.spells[i],sp=SPELLS[s.id];if(s.cd>0||R.mana<skillCost(s)||!RS[s.id])continue;if(RS[s.id](R,s,stat(s))){R.mana-=skillCost(s);R.manaRest=1;s.cd=sp.cd*stat(s).cdM;R.cast=1}}}}
