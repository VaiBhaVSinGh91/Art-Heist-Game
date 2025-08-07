// By adding "export" here, we are creating a named export called "GameRules".
// This will allow other files to import it correctly with `import { GameRules } from ...`
export const GameRules = {
  missions: {
    '5': [2, 3, 2, 3, 3],
    '6': [2, 3, 4, 3, 4],
    '7': [2, 3, 3, 4, 4],
    '8': [3, 4, 4, 5, 5]
  },
  mission4Fails: 2,
  minPlayers: 5,
  maxPlayers: 8,
};
