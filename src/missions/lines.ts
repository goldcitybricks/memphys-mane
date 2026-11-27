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
