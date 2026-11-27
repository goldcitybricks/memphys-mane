// Mane's voice. "Fuh you mean, mane?" and "Lookin' ahh" are approved; the rest are the story bible drafts.
export const MANE = {
  start: "YOU THIRSTY MANE?",
  trashTalkReply: "FUH YOU MEAN, MANE?",
  bigHit: "AIN'T IT, MANE!",
  hitHard: "MANE, WHAT?!",
  twist: "FOR REAL?",
  taunt: "PULL UP.",
  goofy: "LOOKIN' AHH.",
  super: "WATCH THIS JUNT.",
  getUp: "GET UP. GET YOURS. GET HYDRATED.",
  complete: "ROYAL BY NATURE.",
  flaugin: "QUIT FLAUGIN'.",
  vsPip: "PIP, YOU LOOKIN' AHH PLASTIC.",
  vsTanker: "PULL OVER, TANKER. THAT WATER AIN'T YOURS.",
  vsCrowe: "YOU FLAUGIN', CROWE. EVERYBODY CAN SEE IT.",
  victory: 'I AM THE GREATEST WATER IN THE WORLD!', // Mission 3 only: the Ali nod for the fight
};

// Mission 4: the Bridge Run. AetherCars say "recalculating"; GigaZ talks from the tanker's screen; Victor Crowe is livestreaming.
export const AETHERCAR = ['RECALCULATING...', 'RECALCULATING...', 'YIELD. YIELD. YIELD.', 'ROUTE BLOCKED.', 'PLEASE STAND CLEAR.'];
export const GIGAZ = {
  hello: 'WOULD YOU LIKE ME TO REMEMBER THAT FOR YOU?',
  hit: 'THAT WAS RUDE. I WILL REMEMBER IT.',
  down: 'ROUTE... FAILED. RECALCULATING...',
  threat: 'I WILL REMEMBER YOU, LITTLE CAN.',
};
export const CROWE = {
  live: 'CHAT, A LIL SODA CAN IS CHASING MY TRUCK. CLIP THAT.',
  mad: 'WHY IS THE CAN WINNING? SOMEBODY UPDATE THE CARS.',
};

// Mission 3: Pip, the DeNile Water mascot (more of his trash talk lives in modes/fight/Pip.ts)
export const PIP = {
  entrance: "I'M SINGLE-USE, BABY. ONE USE IS ALL I NEED.",
  refill: 'ZERO TASTE. ZERO MEMORY. FULL TANK!',
};

// Mission 2: the king's jackal guards
export const JACKAL_TALK = [
  'FOR THE KING!',
  'SEIZE THE JAR SPIRIT!',
  'BACK IN THE JAR!',
  'HALT, LITTLE JAR!',
  'NO ONE PASSES!',
  'THE RIVER IS THE KING\'S!',
];

export const SHIESTY_TALK = [
  'THIS OUR ALLEY.',
  'RUN THAT CAN!',
  'AY, YOU LOST?',
  'LIL SODA, MOVE!',
  'WHO IS YOU?',
  'GET HIM!',
];

export const GAME = {
  continue: 'SIP TO CONTINUE',
  gameOver: "YOU GOT A LIL THIRSTY. RUN IT BACK?",
  buy: 'OUT OF SIPS? GET THE REAL THING.',
};

// Mission 5: the Plant. Drifters loop the same street lines (story bible); the Foreman talks like a machine on a quota.
export const DRIFTER_TALK = [
  "AY MANE, YOU GOT A DOLLA FOR THE BUS? I'M JUST TRYNA GET A RIDE DOWNTOWN.",
  'AYE MANE, WHERE YOU FROM?',
  'AYE, CAN I ASK YOU A QUESTION?',
  'AY MANE, YOU GOT A DOLLA?',
  'ZERO TASTE... ZERO MEMORY...',
  'WHAT DAY IT IS?',
];
export const FOREMAN = {
  hello: 'NEW UNIT DETECTED. CAN. UNSEALED. CAPPING NOW.',
  quota: 'QUOTA: MORE PIPS.',
  capping: 'CAPPING!',
  capped: 'QUALITY CONTROL: PASSED.',
  angry: 'PRESSURE CRITICAL. CAPPING... HARDER.',
};
// the hidden Aquifer Fact card (Protect Our Aquifer, citing USGS)
export const AQUIFER_FACT = 'MEMPHIS IS ONE OF THE LARGEST\nMETRO AREAS IN THE WORLD THAT\nRUNS 100% ON GROUNDWATER.';

// Mission 6: Beale Below. AetherCorp's drill crews; the Driller's operator is a contractor on a deadline.
export const CREW_TALK = [
  'THIS A HARD HAT AREA!',
  'YOU GOT A BADGE, CAN?',
  'WE ON THE CLOCK, MANE!',
  'DIG DEEPER! THAT\'S THE ORDER!',
  'GET THAT CAN OUTTA HERE!',
  'CLOUD SAYS YOU AIN\'T AUTHORIZED.',
];
export const DRILLER = {
  hello: 'AETHERCORP DEEP ACCESS. Y\'ALL STANDIN\' ON MY QUOTA.',
  dig: ['DIG! DIG! DIG!', 'OUTTA THE WAY!', 'BEHIND SCHEDULE!'],
  slam: 'GROUND\'S COMIN\' DOWN!',
  hot: 'WHY IT\'S SMOKIN\'?! THAT AIN\'T IN THE MANUAL!',
  call: 'CREW! I NEED BACKUP DOWN HERE!',
  down: 'I\'M JUST A CONTRACTOR, MANE! I\'M JUST A CONTRACTOR!',
};
// the hidden Aquifer Fact card (Protect Our Aquifer)
export const AQUIFER_FACT_6 = 'THE MEMPHIS AQUIFER REACHES\nUP TO 3,000 FEET BENEATH\nSHELBY COUNTY.';

// Mission 7: Crowe Live. Crowe Prime is Victor's robot body double (GigaZ is underneath); Victor streams from his yacht.
export const CROWE_PRIME = {
  hello: 'GOOD EVENING, MEMPHIS. I AM CROWE PRIME. I WAS TRAINED ON YOUR POSTS.',
  scan: 'SCANNING... SODA. CORRECTION: CAN. THREAT LEVEL: LOW.',
  talk: [
    'I WAS TRAINED ON YOUR POSTS.',
    'CHAT, CLIP THAT.',
    'SMILE FOR THE STREAM.',
    'YOUR DATA LOOKS DELICIOUS.',
    'LIKE AND SUBSCRIBE.',
    'UPDATING... STILL BETTER.',
  ],
  boots: 'ROCKET BOOTS: ENABLED.',
};
export const VICTOR = {
  hello: "WHAT'S GOOD, MEMPHIS! LIVE FROM MY YACHT, BECAUSE I DON'T DO CROWDS.",
  // fact 5 (Protect Our Aquifer), in the villain's mouth
  brag: 'TONIGHT THE GIGANTUM GOES LIVE. ONE SERVER FARM, COOLED BY AN AQUIFER OVER 7,000 SQUARE MILES WIDE. EIGHT STATES OF FREE WATER.',
  host: "AND YOUR HOST... MY BODY DOUBLE. I DON'T DO STAGES EITHER.",
  mane: "OH, IT'S THE SODA. CHAT, THIS IS CONTENT. PRIME, DISRUPT HIM.",
  poll: 'CHAT, POLL: SHOULD PRIME USE THE ROCKET BOOTS? ...99% YES. BOOTS ON.',
  driving: "WAIT, WHO'S DRIVING? I'M DRIVING. CHAT, I'M DRIVING.",
  clip: 'CHAT, CLIP THAT!',
  unclip: '...WAIT. NO. DO NOT CLIP THAT.',
  bit: 'UH... THAT WAS A BIT, CHAT. A PLANNED BIT. WE\'RE GOOD.',
};
// the livestream chat (fictional handles, Memphis neighborhoods; the blue ones are Crowe's fans)
export const CHAT_USERS = ['ORANGEMOUND4L', '901NATIVE', 'BLUFFCITYB', 'LAMARAVE', 'WHVNWAVE', 'FRAYSERFRESH', 'MIDTOWNMAMA', 'HICKORYHILL', 'SOMEMPHIS', 'BINGHAMPTON'];
export const CHAT_FANS = ['DISRUPTOR99', 'CLOUDBRO', 'SEEDROUND', 'SERVERFARMER'];
export const CHAT = {
  idle: ['WHO THE CAN?', 'FREE CONCERT W', 'IS THAT A ROBOT?', 'WHERE THE MUSIC', 'MEMPHIS IN DA BLDG', 'HI MOM'],
  maneHit: ["AIN'T IT MANE", 'CAN GOT HANDS', 'W CAN', 'HE COOKIN', 'OOOH', 'RUN IT', 'SHEESH', 'FOLD HIM'],
  croweHit: ['RATIO', 'DISRUPTED', 'L CAN', 'PRIME IS HIM', 'CLIP IT'],
  maneHurt: ['GET UP MANE', 'NAH THAT HURT', 'CAN DENTED', 'MANE U GOOD?'],
  dodge: ['HE MISSED LOL', 'TOO SLOW', 'ANKLES', 'DODGED!'],
  predict: ['IT READ HIM', 'MIX IT UP MANE', 'STOP SPAMMIN', 'IT KNOWS'],
  crash: ['HE CRASHED LOL', 'BOOTS L', 'REBOOTING LOL', 'CLIP THAT INSTEAD'],
  shine: ['THE GRILL!!', 'BLINDED', 'SHINE HIM AGAIN', 'GOLD TEETH W'],
  superHit: ['SHADES ON', 'WATCH THIS JUNT', 'IT\'S OVER', 'CINEMA'],
  down: ['OOOOOOH', 'HE DOWN', 'COUNT IT', 'FLATLINED'],
};
// the hidden Aquifer Fact card (CAESER)
export const AQUIFER_FACT_7 = 'THE MEMPHIS AQUIFER FORMED\nIN THE MISSISSIPPI\nEMBAYMENT, A BASIN ABOUT\n70 MILLION YEARS OLD.';
