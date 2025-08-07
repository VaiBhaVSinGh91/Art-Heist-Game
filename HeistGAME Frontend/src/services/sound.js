const audioCache = {};

const playSound = (soundFile, volume = 0.5) => {
  if (!audioCache[soundFile]) {
    // Assumes sounds are in the /public/sounds/ directory
    audioCache[soundFile] = new Audio(`/sounds/${soundFile}`);
  }
  const audio = audioCache[soundFile];
  audio.volume = volume;
  // Reset time to allow playing the sound again before it finishes
  audio.currentTime = 0;
  audio.play().catch(e => {
    // Autoplay can be blocked by the browser, we can ignore these errors.
    console.log(`Could not play sound: ${soundFile}`, e);
  });
};

export const sounds = {
  // Lobby & Game Start
  PLAYER_JOIN: 'playerjoin1.mp3',
  GAME_START: 'gamestart2.mp3',
  PLAYER_LEAVE: 'playerleave1.mp3',

  // Round Progression
  NEW_MASTERMIND: 'mastermind1.mp3',
  TEAM_PROPOSED: 'teamproposed.mp3',
  
  // Voting
  VOTE_CAST: 'vote1.mp3',
  VOTE_PASSED: 'votepassed1.mp3',
  VOTE_FAILED: 'votefailed1.mp3',

  // Mission
  CARD_PLAYED: 'cardselected1.mp3',
  MISSION_SUCCESS: 'missionsuccess1.mp3',
  MISSION_FAILURE: 'missionfail1.mp3',

  // Game Over
  GAME_WIN: 'gamewin1.mp3',
  GAME_LOSE: 'gamelose1.mp3',
};

export default playSound;