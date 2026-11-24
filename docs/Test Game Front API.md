
## Game API

Game client receives `sessionKey` in the launch url and uses it in the path of every game request.

First call must be game init, `GET /api/v1/game/{sessionKey}`, it returns `fingerprint`. Client must
send that `fingerprint` in the body of every POST action, missing or wrong value is rejected with
error code 112. Game init issues a new fingerprint on every call and invalidates the previous one,
this is how one session is bound to one device: when the game is opened a second time, the first copy
stops working with error 112. Call game init once per game start, not before every action.

Action responses do not repeat `fingerprint` and `sessionKey`, client keeps them from init.

Demo session never expires. Real money session expires one month after the last action and every
action pushes that moment forward, for some operators the lifetime is one week instead. An expired
session answers error code 109, on a POST action with http 422, on game init inside the 200 response.

Endpoint list:

Method | Path | Purpose
------ | ---- | -------
GET | `/api/v1/game/{sessionKey}` | Game init or session recovery
POST | `/api/v1/game/{sessionKey}/spin` | Main spin
POST | `/api/v1/game/{sessionKey}/freespin` | Freespin
POST | `/api/v1/game/{sessionKey}/buy` | Buy bonus feature
POST | `/api/v1/game/{sessionKey}/respin` | Respin step
POST | `/api/v1/game/{sessionKey}/avalanche` | Cascading reels step
POST | `/api/v1/game/{sessionKey}/bonus` | Start bonus game with chosen variant
POST | `/api/v1/game/{sessionKey}/getPreviousState` | Finish bonus game and return to base game
POST | `/api/v1/game/{sessionKey}/jackpot` | Jackpot game step
POST | `/api/v1/game/{sessionKey}/open-field-item` | Open one cell of the jackpot field
GET | `/api/v1/game/{sessionKey}/tournaments` | Tournaments and leaderboards
POST | `/api/v1/game/{sessionKey}/lobby` | Open in game lobby
GET | `/api/v1/lobby/{lobbyKey}` | Lobby content
POST | `/api/v1/lobby/{lobbyKey}/game/{gameSysname}` | Launch a game from the lobby
POST | `/api/v1/game/{sessionKey}/stat/{action}` | Game client lifecycle event
POST | `/api/v1/game/{sessionKey}/screenshot` | Upload win screenshot
GET | `/api/v1/game/{sessionKey}/screenshot` | Read stored screenshot
POST | `/api/v1/socials/{sessionKey}/nickname` | Set player nickname
GET | `/api/v1/game/{sessionKey}/getState` | Short session info

### Game init request
```
GET /api/v1/game/{sessionKey}
```
Request path parameters:
`sessionKey` - string, session key from the launch url, percent encoded

No request body.

Response json object:
```json
{
  "user": ?{ // null for a demo session
    "uid": string, // User id in partner system
    "username": ?string // Username, null when the name is hidden for this session
  },
  "fingerprint": string, // Value to send in the body of every action
  "sessionKey": string, // Session key code, same value as in the path
  "locale": string, // Resolved language code
  "translationsUrl": string, // Translation bundle url for locale
  "fallbackTranslationsUrl": string, // English translation bundle url
  "bets": [ // Bet steps per line offered to the player
    number // Bet step, can also be a numeric string depending on operator settings, parse both
  ],
  "bonusCoefficient": integer, // Buy bonus price multiplier in percent, 100 means price equals total bet
  "lines": ?integer, // Paylines count of the game
  "mode": string, // Mode the session is in: 'spin' or 'freespin'
  "lastSpin": object, // Game state to restore on screen, see Game state section
  "slot": { // Game configuration and paytable
    "id": integer, // Game ID
    "name": string, // Game name
    "systemName": string, // Game system name
    "isActive": boolean, // Game is enabled
    "createdAt": string, // ISO 8601 game creation date
    "updatedAt": string, // ISO 8601 game update date
    "params": {
      "enableSecondBet": boolean, // Always true
      "info": {
        "rtp": string, // Numeric string with return to player in percent
        "maxWinMultiplier": integer, // Maximum win as a multiplier of the total bet
        "jackpot": object // Jackpot tiers with names and values, empty array for games without a jackpot, null when the game has no math on this server
      },
      "reelsSizes": ?[ // Count of visible symbols per reel
        integer // Symbols count of one reel
      ],
      "reelsCount": ?integer, // Reels count
      "linesCount": ?integer, // Paylines count
      "symbolsCount": ?integer, // Count of distinct symbols
      "lines": ?[ // Payline definitions
        {
          "number": integer, // Payline number, matches winLines[].number in the game state
          "positions": [ // Row taken on each reel, left to right
            integer // Row number, 1 based
          ]
        }
      ],
      "symbols": ?[ // Paytable, one item per symbol
        {
          "isJackpot": boolean, // Symbol participates in the jackpot
          "isScatter": boolean, // Symbol pays regardless of position
          "isWild": boolean, // Symbol substitutes other symbols
          "name": string, // Symbol name used in reels and winLines[].symbol
          "wins": [ // Payout multipliers of the bet per line by match length, index 0 is one matched symbol, index 4 is five matched symbols, 0 means no payout
            number // Payout multiplier
          ]
        }
      ],
      "bigwin": ?{ // Thresholds of the big win animation
        "winCoefs": {
          "firstStep": number, // Win to total bet ratio which starts step 1
          "secondStep": number, // Win to total bet ratio which starts step 2
          "thirdStep": number, // Win to total bet ratio which starts step 3
          "fourthStep": number, // Win to total bet ratio which starts step 4
          "fifthStep": number // Win to total bet ratio which starts step 5
        },
        "valuesForStart": {
          "firstStep": number, // Value used to start step 1
          "secondStep": number, // Value used to start step 2
          "thirdStep": number, // Value used to start step 3
          "fourthStep": number, // Value used to start step 4
          "fifthStep": number // Value used to start step 5
        }
      }
    }
  },
  "homeUrl": ?string, // Home button target
  "balance": {
    "sessionKey": string, // Session key code
    "currency": string, // ISO 4217 code
    "amount": string // Numeric string with balance amount
  },
  "currency": string, // ISO 4217 code
  "currencyMultiplier": integer, // Always 1
  "clientSettings": ?{ // Operator client options
    "superFastSpins": boolean // Super fast spins are enabled
  },
  "externalFreespins": ?{ // Operator freespins, null when there are none
    "total": integer, // Granted count
    "current": integer, // Remaining count
    "bet": string, // Numeric string with bet per line used for these freespins
    "totalWin": string, // Numeric string with accumulated win of the series
    "isLast": boolean, // true on the response where the series has just ended
    "nextSessionKey": ?string // Session key to continue on after the series, when not null the current session is closed and client must call game init with this key
  },
  "socials": { // One of the two shapes
    "nickname": string, // Present when the player already has a nickname
    "needToRequestNickname": boolean // Present when the player has no nickname, true when the game should ask for it
  },
  "operatorData": {
    "hasLobby": boolean, // In game lobby is enabled
    "clientSettings": ?object, // Same value as the root clientSettings
    "showHomeButton": boolean, // Show home button
    "hasSlowMode": boolean, // Slow spin mode is enabled
    "hasCollections": boolean // Symbol collections and nicknames are enabled
  },
  "currencyData": {
    "currency": string, // ISO 4217 code
    "multiplier": integer, // Always 1
    "rounding": integer, // Count of decimals to display for this currency and game
    "iconUrl": string, // Currency icon url, empty string when there is no icon
    "iconBorderUrl": string // Currency icon border url, empty string when there is none
  },
  "jackpotParameters": { // (Optional) Only for games with a jackpot, map of jackpot tier name to its value, tier names differ from game to game
    "{tierName}": string // Numeric string with tier value as a multiplier of the total bet
  },
  "bonusParameters": { // (Optional) Only for games where the player picks a bonus branch, key is the variant value to send to the bonus endpoint
    "{variant}": {
      "symbol": string, // Special symbol name of the branch
      "freespins": integer, // Freespins count of the branch
      "multiplier": integer // Win multiplier of the branch
    }
  },
  "server": { // (Optional) Only for games whose math runs on a separate realtime service, client connects to it directly
    "http": {
      "domain": string, // Http domain
      "port": string // Http port
    },
    "socket": {
      "domain": string, // Socket domain
      "port": string // Socket port
    }
  },
  "tournaments": [ // Active tournaments, empty array for a demo session, see Tournaments request for the item shape
    object // Tournament object
  ],
  "tournamentStartPopup": ?{ // Popup to show once when a tournament starts
    "tournamentId": integer, // Tournament id
    "name": string, // Tournament name
    "description": string, // Description text
    "rules": string, // Rules text
    "currency": string, // ISO 4217 code of the prize pool
    "totalPrizeAmount": string, // Numeric string with sum of all prizes
    "endDate": string, // ISO 8601 tournament end date
    "nowDate": string // ISO 8601 server time
  },
  "tournamentWinnerPopup": ?{ // Popup to show once when the player won a finished tournament
    "tournamentId": integer, // Tournament id
    "name": string, // Tournament name
    "currency": string, // ISO 4217 code of the prize
    "totalPrizeAmount": string, // Numeric string with sum of all prizes
    "place": integer, // Place the player took
    "prizeAmount": string // Numeric string with prize amount
  },
  "errorCode": integer, // (Optional) Present when init has something to report, http status stays 200
  "errorLevel": string, // (Optional) Error level
  "errorMessage": string // (Optional) Error message
}
```
Both popups are returned once, after they are delivered later responses carry null.

When init has an error to report, the three error fields are added to the payload and the three
tournament fields are left out, so `tournaments`, `tournamentStartPopup` and `tournamentWinnerPopup`
are absent in that case.

Response example:
```json
{
  "user": {
    "uid": "1001",
    "username": "player_one"
  },
  "fingerprint": "ZmluZ2VycHJpbnQwMDAwMDAwMDAwMDAwMDAwMDAwMDAw",
  "sessionKey": "$2y$10$aaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmm",
  "locale": "en",
  "translationsUrl": "https://api.example.com/cdn/games/gameone/locales/en.json",
  "fallbackTranslationsUrl": "https://api.example.com/cdn/games/gameone/locales/en.json",
  "bets": [10, 25, 50, 100, 1000],
  "bonusCoefficient": 100,
  "lines": 10,
  "mode": "spin",
  "lastSpin": {
    "reels": [
      { "number": 1, "symbols": ["sym5", "sym2", "sym3"] },
      { "number": 2, "symbols": ["sym4", "sym3", "sym5"] },
      { "number": 3, "symbols": ["sym2", "sym5", "sym6"] },
      { "number": 4, "symbols": ["sym8", "sym2", "sym1"] },
      { "number": 5, "symbols": ["sym7", "sym6", "sym8"] }
    ],
    "bet": "10",
    "lines": 10,
    "totalBet": "100",
    "totalWin": "0",
    "winLines": [],
    "mode": "spin",
    "currentStep": "spin",
    "nextStep": "spin",
    "extra": [],
    "multiplier": 1,
    "collectedSymbol": null,
    "collection": []
  },
  "slot": {
    "id": 101,
    "name": "Game One",
    "systemName": "gameone",
    "isActive": true,
    "createdAt": "2025-10-01T10:00:00+00:00",
    "updatedAt": "2026-05-14T09:12:00+00:00",
    "params": {
      "enableSecondBet": true,
      "info": {
        "rtp": "95.50",
        "maxWinMultiplier": 1000,
        "jackpot": []
      },
      "reelsSizes": [3, 3, 3, 3, 3],
      "reelsCount": 5,
      "linesCount": 10,
      "symbolsCount": 10,
      "lines": [
        { "number": 1, "positions": [2, 2, 2, 2, 2] },
        { "number": 2, "positions": [1, 1, 1, 1, 1] },
        { "number": 3, "positions": [3, 3, 3, 3, 3] },
        { "number": 4, "positions": [1, 2, 2, 2, 1] },
        { "number": 5, "positions": [3, 2, 2, 2, 3] },
        { "number": 6, "positions": [1, 2, 3, 2, 1] },
        { "number": 7, "positions": [3, 2, 1, 2, 3] },
        { "number": 8, "positions": [2, 1, 1, 1, 2] },
        { "number": 9, "positions": [2, 3, 3, 3, 2] },
        { "number": 10, "positions": [2, 1, 2, 3, 2] }
      ],
      "symbols": [
        { "isJackpot": false, "isScatter": false, "isWild": false, "name": "sym1", "wins": [0, 0, 5, 25, 100] },
        { "isJackpot": false, "isScatter": false, "isWild": false, "name": "sym2", "wins": [0, 0, 5, 25, 100] },
        { "isJackpot": false, "isScatter": false, "isWild": false, "name": "sym3", "wins": [0, 0, 5, 25, 100] },
        { "isJackpot": false, "isScatter": false, "isWild": false, "name": "sym4", "wins": [0, 0, 10, 40, 150] },
        { "isJackpot": false, "isScatter": false, "isWild": false, "name": "sym5", "wins": [0, 0, 15, 50, 200] },
        { "isJackpot": false, "isScatter": false, "isWild": false, "name": "sym6", "wins": [0, 10, 20, 100, 600] },
        { "isJackpot": false, "isScatter": false, "isWild": false, "name": "sym7", "wins": [0, 20, 30, 150, 800] },
        { "isJackpot": false, "isScatter": false, "isWild": false, "name": "sym8", "wins": [0, 30, 40, 400, 900] },
        { "isJackpot": false, "isScatter": false, "isWild": true, "name": "wild", "wins": [0, 40, 100, 500, 1000] },
        { "isJackpot": false, "isScatter": true, "isWild": false, "name": "scatter", "wins": [0, 0, 50, 200, 500] }
      ],
      "bigwin": {
        "winCoefs": {
          "firstStep": 0,
          "secondStep": 20,
          "thirdStep": 50,
          "fourthStep": 100,
          "fifthStep": 200
        },
        "valuesForStart": {
          "firstStep": 11,
          "secondStep": 21,
          "thirdStep": 51,
          "fourthStep": 101,
          "fifthStep": 201
        }
      }
    }
  },
  "homeUrl": "https://operator.example.com/lobby",
  "balance": {
    "sessionKey": "$2y$10$aaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmm",
    "currency": "USD",
    "amount": "10300"
  },
  "currency": "USD",
  "currencyMultiplier": 1,
  "clientSettings": {
    "superFastSpins": true
  },
  "externalFreespins": {
    "total": 10,
    "current": 7,
    "bet": "1",
    "totalWin": "15.5",
    "isLast": false,
    "nextSessionKey": null
  },
  "socials": {
    "needToRequestNickname": false
  },
  "operatorData": {
    "hasLobby": false,
    "clientSettings": {
      "superFastSpins": true
    },
    "showHomeButton": true,
    "hasSlowMode": false,
    "hasCollections": false
  },
  "currencyData": {
    "currency": "USD",
    "multiplier": 1,
    "rounding": 0,
    "iconUrl": "https://api.example.com/cdn/currency/USD.png",
    "iconBorderUrl": ""
  },
  "jackpotParameters": {
    "mini": "10",
    "minor": "20",
    "major": "50",
    "grand": "1000"
  },
  "bonusParameters": {
    "1": { "symbol": "sym5", "freespins": 15, "multiplier": 1 },
    "2": { "symbol": "sym6", "freespins": 10, "multiplier": 2 },
    "3": { "symbol": "sym7", "freespins": 5, "multiplier": 4 },
    "4": { "symbol": "sym8", "freespins": 4, "multiplier": 5 }
  },
  "server": {
    "http": { "domain": "realtime.example.com", "port": "443" },
    "socket": { "domain": "realtime.example.com", "port": "8443" }
  },
  "tournaments": [
    {
      "id": 7,
      "name": "Tournament One",
      "description": "Collect points on every spin",
      "rules": "Points are granted for every bet",
      "startDate": "2026-08-01T00:00:00+00:00",
      "endDate": "2026-08-31T23:59:59+00:00",
      "visibleUntilDate": "2026-09-02T23:59:59+00:00",
      "nowDate": "2026-08-03T12:00:00+00:00",
      "currency": "EUR",
      "userCurrency": "USD",
      "rateToPoints": "1",
      "userData": {
        "place": 12,
        "points": "340"
      },
      "leaderboard": [
        { "place": 1, "username": "player_two", "points": "9800", "prizeAmount": "2000" },
        { "place": 2, "username": "player_three", "points": "7400", "prizeAmount": "1500" },
        { "place": 3, "username": null, "points": "5100", "prizeAmount": "500" }
      ]
    }
  ],
  "tournamentStartPopup": {
    "tournamentId": 7,
    "name": "Tournament One",
    "description": "Collect points on every spin",
    "rules": "Points are granted for every bet",
    "currency": "EUR",
    "totalPrizeAmount": "5000",
    "endDate": "2026-08-31T23:59:59+00:00",
    "nowDate": "2026-08-03T12:00:00+00:00"
  },
  "tournamentWinnerPopup": null
}
```
Errors: unknown session key gives http 404. Everything else is reported inside the 200 response.

### Spin request
```
POST /api/v1/game/{sessionKey}/spin
```
Request json body:
```json
{
  "bet": string, // Numeric string or number with bet per line, must be one of the values from bets
  "lines": integer, // Active paylines count, must be a json integer
  "fingerprint": string, // Value from game init response
  "spinSpeed": ?string, // (Optional) Spin speed chosen by the player, for example 'normal' or 'fast', passed through to the operator
  "currentMode": ?integer, // (Optional) Selected game mode, only for games which have switchable modes
  "strength": ?integer // (Optional) Player input strength, only for games which use it
}
```
Response: game state object with wrapper fields, see Game state section.

Request example:
```json
{
  "bet": 10,
  "lines": 10,
  "fingerprint": "ZmluZ2VycHJpbnQwMDAwMDAwMDAwMDAwMDAwMDAwMDAw",
  "spinSpeed": "normal"
}
```
Response example:
```json
{
  "reels": [
    { "number": 1, "symbols": ["sym3", "sym2", "sym1"] },
    { "number": 2, "symbols": ["sym3", "sym5", "sym4"] },
    { "number": 3, "symbols": ["sym3", "sym6", "sym2"] },
    { "number": 4, "symbols": ["sym1", "scatter", "sym7"] },
    { "number": 5, "symbols": ["sym8", "sym2", "wild"] }
  ],
  "bet": "10",
  "lines": 10,
  "totalBet": "100",
  "totalWin": "50",
  "winLines": [
    {
      "number": 2,
      "symbol": "sym3",
      "win": "50",
      "length": 3,
      "direction": "normal"
    }
  ],
  "mode": "spin",
  "currentStep": "spin",
  "nextStep": "spin",
  "extra": [],
  "multiplier": 1,
  "collectedSymbol": null,
  "collection": [],
  "balance": {
    "sessionKey": "$2y$10$aaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmm",
    "currency": "USD",
    "amount": "10250"
  },
  "externalFreespins": null,
  "tournamentStartPopup": null,
  "tournamentWinnerPopup": null
}
```
Errors: 107 when a spin is not allowed in the current state, 106 when the bet is not allowed, 108 when
the lines value is not allowed, 3 when the balance is not enough, 4 when the bet limit is reached, 109
when the session is closed, 112 when the fingerprint does not match.

### Freespin request
```
POST /api/v1/game/{sessionKey}/freespin
```
Bet of a freespin is taken from the session, it cannot be changed by the client, `bet` and `lines` are
not read from this request.

Request json body:
```json
{
  "fingerprint": string, // Value from game init response
  "spinSpeed": ?string, // (Optional) Spin speed chosen by the player
  "tapsCount": ?integer, // (Optional) Count of taps, only for games with a tap mechanic
  "hash": ?integer // (Optional) Client input hash from extra.hash, only for games with a tap mechanic
}
```
Response: game state object with `mode` set to `freespin` and freespin counters inside `extra`.

Request example:
```json
{
  "fingerprint": "ZmluZ2VycHJpbnQwMDAwMDAwMDAwMDAwMDAwMDAwMDAw",
  "spinSpeed": "fast"
}
```
Errors: 103 when a freespin is not allowed in the current state, plus the common ones.

### Buy bonus request
```
POST /api/v1/game/{sessionKey}/buy
```
Charged price is the total bet multiplied by `bonusCoefficient` percent. `lines` is not accepted here.

Request json body:
```json
{
  "bet": string, // Numeric string or number with base bet per line
  "fingerprint": string, // Value from game init response
  "spinSpeed": ?string // (Optional) Spin speed chosen by the player
}
```
Response: game state object, usually with `nextStep` set to `freespin`.

Request example:
```json
{
  "bet": 10,
  "fingerprint": "ZmluZ2VycHJpbnQwMDAwMDAwMDAwMDAwMDAwMDAwMDAw"
}
```
Errors: 102 when the feature cannot be bought in the current state, 3 when the balance is not enough,
106 when the bet is not allowed.

### Other game step requests
```
POST /api/v1/game/{sessionKey}/respin
POST /api/v1/game/{sessionKey}/avalanche
POST /api/v1/game/{sessionKey}/jackpot
POST /api/v1/game/{sessionKey}/getPreviousState
POST /api/v1/game/{sessionKey}/bonus
POST /api/v1/game/{sessionKey}/open-field-item
```
All of them return the game state object.

Request json body:
```json
{
  "fingerprint": string, // Value from game init response
  "spinSpeed": ?string, // (Optional) Spin speed chosen by the player
  "variant": string, // Required for /bonus only, numeric string or number with the bonus branch chosen by the player, a key of bonusParameters
  "col": integer, // Required for /open-field-item only, column of the cell to open, 1 based
  "row": integer // Required for /open-field-item only, row of the cell to open, 1 based
}
```
Bonus request example:
```json
{
  "fingerprint": "ZmluZ2VycHJpbnQwMDAwMDAwMDAwMDAwMDAwMDAwMDAw",
  "variant": 2,
  "spinSpeed": "normal"
}
```
Open field item request example:
```json
{
  "fingerprint": "ZmluZ2VycHJpbnQwMDAwMDAwMDAwMDAwMDAwMDAwMDAw",
  "col": 2,
  "row": 3
}
```
Errors, one per endpoint, returned when the step is not allowed in the current state: 105 respin, 100
avalanche, 104 jackpot, 110 getPreviousState, 101 bonus. 115 is returned when the requested game mode
does not match the current one.

### Tournaments request
```
GET /api/v1/game/{sessionKey}/tournaments
```
No request body.

Response json object:
```json
{
  "tournaments": [ // Active tournaments, empty array for a demo session
    {
      "id": integer, // Tournament id
      "name": string, // Tournament name
      "description": string, // Description text
      "rules": string, // Rules text
      "startDate": string, // ISO 8601 tournament start date
      "endDate": string, // ISO 8601 tournament end date
      "visibleUntilDate": string, // ISO 8601 date until which the results stay visible
      "nowDate": string, // ISO 8601 server time
      "currency": string, // ISO 4217 code of the prizes
      "userCurrency": string, // ISO 4217 code of the player
      "rateToPoints": string, // Numeric string with how much bet turns into one point
      "userData": {
        "place": integer, // Current place of the player, string '-' when the player has no place yet
        "points": string // Numeric string with points collected by the player
      },
      "leaderboard": [ // Leaderboard rows
        {
          "place": integer, // Place
          "username": ?string, // Username, null when hidden
          "points": ?string, // Numeric string with points
          "prizeAmount": ?string // Numeric string with prize for this place
        }
      ]
    }
  ]
}
```
Response example:
```json
{
  "tournaments": [
    {
      "id": 7,
      "name": "Tournament One",
      "description": "Collect points on every spin",
      "rules": "Points are granted for every bet",
      "startDate": "2026-08-01T00:00:00+00:00",
      "endDate": "2026-08-31T23:59:59+00:00",
      "visibleUntilDate": "2026-09-02T23:59:59+00:00",
      "nowDate": "2026-08-03T12:00:00+00:00",
      "currency": "EUR",
      "userCurrency": "USD",
      "rateToPoints": "1",
      "userData": {
        "place": 12,
        "points": "340"
      },
      "leaderboard": [
        { "place": 1, "username": "player_two", "points": "9800", "prizeAmount": "2000" },
        { "place": 2, "username": "player_three", "points": "7400", "prizeAmount": "1500" },
        { "place": 3, "username": null, "points": "5100", "prizeAmount": "500" }
      ]
    }
  ]
}
```

### Nickname request
```
POST /api/v1/socials/{sessionKey}/nickname
```
Request json body:
```json
{
  "nickname": string // Nickname chosen by the player, 1 to 255 characters
}
```
Response json object:
```json
{
  "status": string // Always 'Nickname updated' on success
}
```
Request example:
```json
{
  "nickname": "player_one"
}
```
Response example:
```json
{
  "status": "Nickname updated"
}
```
Errors: 140 with level ALERT and message `Nickname is too long.` when the value is longer than 255
characters, 140 with level CRITICAL when it is empty, 1 when the session key is unknown, all three with
http 422. Missing or non string `nickname` gives http 400 with validation error array.

### Win screenshot upload request
```
POST /api/v1/game/{sessionKey}/screenshot
Content-Type: multipart/form-data
```
Request form fields:
`screenshot` - file, `image/png`, `image/jpeg` or `image/webp`, up to 10 MB
`fingerprint` - string, value from game init response

Image is attached to the last winning round of the session and only while that round is not older
than 30 minutes.

Response json object, http status is always 200:
```json
{
  "saved": boolean, // true when the image was stored
  "roundId": ?string // Round the image was attached to, null when nothing was stored
}
```
Response example:
```json
{
  "saved": true,
  "roundId": "1000001"
}
```
`{ "saved": false, "roundId": null }` is returned for a demo session, when there is no winning round,
when the round is too old, when the file is rejected or when storage failed. A screenshot problem never
blocks the game, so this endpoint never returns an error status.

### Win screenshot view request
```
GET /api/v1/game/{sessionKey}/screenshot
```
No request body. Answers http 302 with a redirect to a temporary download link of the screenshot of
the last winning round. Http 404 when screenshot viewing is disabled, when the session is unknown or
when there is no screenshot.

### Game client event request
```
POST /api/v1/game/{sessionKey}/stat/{action}
```
Request path parameters:
`sessionKey` - string, session key
`action` - string, event name, `loaded` is sent once the game has finished loading, any other value is stored as an unknown event

Request body is stored as the event payload and can be empty.

Response is http 200 with an empty body, there is nothing to read. Unknown session key gives http 404.
An unknown `action` is accepted as well and stored as an unknown event.

### Lobby open request
```
POST /api/v1/game/{sessionKey}/lobby
```
No request body required.

Response json object:
```json
{
  "lobbyKey": string, // Key to use in the lobby requests below
  "url": string // Lobby url
}
```
Response example:
```json
{
  "lobbyKey": "$2y$10$nnnnooooppppqqqqrrrrssssttttuuuuvvvvwwwwxxxxyyyyzzzz",
  "url": "https://games.example.com/lobby?lobbyKey=%242y%2410%24nnnnooooppppqqqqrrrrssssttttuuuuvvvvwwwwxxxxyyyyzzzz&lang=en"
}
```

### Lobby content request
```
GET /api/v1/lobby/{lobbyKey}
```
No request body.

Response json object:
```json
{
  "translationsUrl": string, // Lobby translation bundle url for the session language
  "fallbackTranslationsUrl": string, // English lobby translation bundle url
  "slots": [ // Games available to this operator
    {
      "id": integer, // Game ID
      "sysname": string, // Game system name, use it in the lobby game launch request
      "isUseWrapper": boolean // Game must be opened inside a wrapper
    }
  ],
  "usePostMessage": boolean // Route the launch through iframe postMessage instead of a direct navigation
}
```
Response example:
```json
{
  "translationsUrl": "https://api.example.com/cdn/lobby/locales/en.json",
  "fallbackTranslationsUrl": "https://api.example.com/cdn/lobby/locales/en.json",
  "slots": [
    { "id": 101, "sysname": "gameone", "isUseWrapper": false },
    { "id": 102, "sysname": "gametwo", "isUseWrapper": false },
    { "id": 103, "sysname": "gamethree", "isUseWrapper": true }
  ],
  "usePostMessage": true
}
```

### Lobby game launch request
```
POST /api/v1/lobby/{lobbyKey}/game/{gameSysname}
```
Request path parameters:
`lobbyKey` - string, key from the lobby open request
`gameSysname` - string, `slots[].sysname` value from the lobby content request

No request body required.

Response json object:
```json
{
  "sessionKey": string, // Session key code of the new game session
  "url": string // Launch url of the selected game
}
```
Response example:
```json
{
  "sessionKey": "$2y$10$aaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmm",
  "url": "https://games.example.com?sessionKey=%242y%2410%24aaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmm&sn=gametwo&lang=en&fs=1"
}
```
Errors: http 404 when the lobby key is unknown, when the game system name is unknown or when the
operator is not allowed to open games this way.

### Session info request
```
GET /api/v1/game/{sessionKey}/getState
```
No request body.

Response json object:
```json
{
  "key": string, // Session key code
  "gameId": integer, // Game ID of the session
  "externalSessionId": ?string // Session ID provided by partner in auth request
}
```
Response example:
```json
{
  "key": "$2y$10$aaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmm",
  "gameId": 101,
  "externalSessionId": "op-session-0001"
}
```

## Game state

Every game action returns the same shape: game state at the root plus four wrapper fields. In the game
init response the same state object is nested under `lastSpin` and `balance` is a sibling of it.

Wrapper fields:
```json
{
  "balance": {
    "sessionKey": string, // Session key code
    "currency": string, // ISO 4217 code
    "amount": string // Numeric string with balance amount after the action
  },
  "externalFreespins": ?object, // Operator freespins, same fields as in game init response, null when there are none
  "tournamentStartPopup": ?object, // Popup to show, same fields as in game init response
  "tournamentWinnerPopup": ?object // Popup to show, returned only when the round is finished and paid nothing
}
```

Standard state fields:
```json
{
  "reels": [ // Visible reels, left to right
    {
      "number": integer, // Reel number, starts at 1
      "symbols": [ // Symbols top to bottom
        string // Symbol name from slot.params.symbols
      ]
    }
  ],
  "bet": ?string, // Numeric string with bet per line
  "lines": ?integer, // Active paylines count
  "totalBet": ?string, // Numeric string with bet multiplied by lines
  "totalWin": string, // Numeric string with win of this step
  "winLines": [ // Winning lines, empty array when there is no win
    {
      "number": integer, // Payline number, matches slot.params.lines[].number
      "symbol": string, // Symbol name which produced the win
      "win": string, // Numeric string with win of this line
      "length": integer, // Count of matched symbols
      "direction": string // 'normal' for left to right, 'reverse' for right to left
    }
  ],
  "mode": string, // 'spin' or 'freespin'
  "currentStep": string, // Step which has just been played
  "nextStep": string, // Step the client must request next
  "extra": { // Freespin and bonus data, an empty array outside those modes
    "bet": ?string, // Numeric string with bet per line of the series
    "currentFreespins": integer, // Freespins added by this step
    "freespins": integer, // Freespins left
    "totalFreespins": integer, // Freespins granted in total
    "symbol": ?string, // Special symbol name of the feature
    "symbols": [ // Special symbols collected
      string // Symbol name
    ],
    "bonusWin": string, // Numeric string with win of the special symbol
    "bonusWins": [ // Win of each special symbol
      string // Numeric string with win
    ],
    "totalWin": string, // Numeric string with accumulated win of the series
    "reelsWithSpecials": [ // Reels holding a special symbol
      integer // Reel index, 0 based
    ],
    "variant": ?integer, // Bonus branch in play
    "multiplier": integer, // Multiplier of the branch
    "bonusLineLength": integer, // (Optional) Length of the line which started the bonus, present only when a bonus line was hit
    "bonusLineNumber": integer, // (Optional) Number of that line
    "startBonus": boolean // (Optional) true when a bonus starts inside freespin mode
  },
  "multiplier": integer, // Current win multiplier
  "collectedSymbol": ?string, // Symbol name added to the player collection by this step
  "collection": ?[ // Player collection
    {
      "sysname": string, // Game system name where the symbol was collected
      "symbolCode": integer // Collected symbol code
    }
  ],
  "jackpot": { // (Optional) Present when the step won a jackpot
    "win": string, // Numeric string with jackpot amount
    "type": string // Jackpot tier, a key of jackpotParameters
  },
  "wheelOfFortune": { // (Optional) Present for games with a wheel
    "sectors": [ // Prize of each sector in order
      string // Numeric string with sector prize
    ],
    "winSector": integer, // Index of the winning sector, 0 based
    "win": string // Numeric string with amount won on the wheel
  },
  "jackpotState": { // (Optional) Present while a match three jackpot field is open
    "field": {
      "cols": integer, // Columns count
      "rows": integer, // Rows count
      "items": [ // Opened cells
        {
          "col": integer, // Column, 1 based
          "row": integer, // Row, 1 based
          "item": string // Item type, 'type1' to 'type4'
        }
      ]
    },
    "lastOpenedItem": ?{ // Last opened cell
      "col": integer, // Column, 1 based
      "row": integer, // Row, 1 based
      "item": string // Item type
    },
    "isCompleted": boolean, // Field is finished
    "winItemType": ?string, // Winning item type, filled only when finished
    "closedItems": [ // Cells still closed
      {
        "col": integer, // Column, 1 based
        "row": integer, // Row, 1 based
        "item": string // Item type
      }
    ]
  },
  "typeMath": string // (Optional) Math variant of the game, 'old' or 'new', only for games which expose it
}
```

Freespin state example, three scatters have just granted 10 freespins:
```json
{
  "reels": [
    { "number": 1, "symbols": ["scatter", "sym2", "sym1"] },
    { "number": 2, "symbols": ["sym3", "scatter", "sym4"] },
    { "number": 3, "symbols": ["sym6", "sym2", "scatter"] },
    { "number": 4, "symbols": ["sym1", "sym7", "sym3"] },
    { "number": 5, "symbols": ["sym8", "sym2", "wild"] }
  ],
  "bet": "10",
  "lines": 10,
  "totalBet": "100",
  "totalWin": "500",
  "winLines": [],
  "mode": "freespin",
  "currentStep": "spin",
  "nextStep": "freespin",
  "extra": {
    "bet": "10",
    "currentFreespins": 10,
    "freespins": 10,
    "totalFreespins": 10,
    "symbol": "scatter",
    "symbols": ["scatter", "scatter", "scatter"],
    "bonusWin": "500",
    "bonusWins": ["500"],
    "totalWin": "500",
    "reelsWithSpecials": [0, 1, 2],
    "variant": null,
    "multiplier": 1
  },
  "multiplier": 1,
  "collectedSymbol": null,
  "collection": [],
  "balance": {
    "sessionKey": "$2y$10$aaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmm",
    "currency": "USD",
    "amount": "10700"
  },
  "externalFreespins": null,
  "tournamentStartPopup": null,
  "tournamentWinnerPopup": null
}
```

Jackpot step example with all three optional blocks:
```json
{
  "reels": [
    { "number": 1, "symbols": ["sym1", "sym2", "sym3"] },
    { "number": 2, "symbols": ["sym4", "sym5", "sym6"] },
    { "number": 3, "symbols": ["sym7", "sym8", "wild"] },
    { "number": 4, "symbols": ["scatter", "sym1", "sym2"] },
    { "number": 5, "symbols": ["sym3", "sym4", "sym5"] }
  ],
  "bet": "10",
  "lines": 10,
  "totalBet": "100",
  "totalWin": "1100",
  "winLines": [],
  "mode": "spin",
  "currentStep": "jackpot",
  "nextStep": "spin",
  "extra": [],
  "multiplier": 1,
  "collectedSymbol": "sym6",
  "collection": [
    { "sysname": "gameone", "symbolCode": 6 },
    { "sysname": "gametwo", "symbolCode": 2 }
  ],
  "jackpot": {
    "win": "1000",
    "type": "grand"
  },
  "wheelOfFortune": {
    "sectors": ["10", "20", "50", "100", "200", "500", "1000", "2000"],
    "winSector": 3,
    "win": "100"
  },
  "jackpotState": {
    "field": {
      "cols": 3,
      "rows": 4,
      "items": [
        { "col": 1, "row": 1, "item": "type1" },
        { "col": 2, "row": 1, "item": "type3" },
        { "col": 3, "row": 2, "item": "type1" }
      ]
    },
    "lastOpenedItem": { "col": 3, "row": 2, "item": "type1" },
    "isCompleted": false,
    "winItemType": null,
    "closedItems": [
      { "col": 1, "row": 2, "item": "type2" },
      { "col": 2, "row": 2, "item": "type4" }
    ]
  },
  "typeMath": "new",
  "balance": {
    "sessionKey": "$2y$10$aaaabbbbccccddddeeeeffffgggghhhhiiiijjjjkkkkllllmmmm",
    "currency": "USD",
    "amount": "11300"
  },
  "externalFreespins": null,
  "tournamentStartPopup": null,
  "tournamentWinnerPopup": null
}
```

### Game flow
`nextStep` in the response tells the client which endpoint to call next, `currentStep` says what has
just been played.

nextStep | What the client does next
-------- | -----
spin | `POST /spin`
freespin | `POST /freespin`
buy | Bonus was bought, continue with the accompanying nextStep
respin | `POST /respin`
avalanche | `POST /avalanche`
bonus | `POST /bonus` with the chosen variant
getPreviousState | `POST /getPreviousState` to leave the bonus game
jackpot | `POST /jackpot`, or `POST /open-field-item` while a jackpot field is open

`mode` is `spin` in the base game and `freespin` during a freespin series. Calling an endpoint which
does not match the current state is rejected with the matching error code.

When operator freespins finish, the response carries `externalFreespins.isLast` set to true and
`externalFreespins.nextSessionKey`. Client then calls game init with the new key and continues there.

### Game specific state
State is not one universal schema, the games below replace or drop standard fields. Symbol names in
the examples are placeholders, real names come from `slot.params.symbols` of the game.

#### Space Infinity
`winLines` becomes an object and `extra` gets two more fields.
```json
{
  "winLines": {
    "lines": [ // Winning lines, same shape as the standard winLines
      {
        "number": integer, // Payline number
        "symbol": string, // Symbol name
        "win": string, // Numeric string with win of this line
        "length": integer, // Count of matched symbols
        "direction": string // 'normal' or 'reverse'
      }
    ],
    "reels": [ // Reels the win was calculated on
      {
        "number": integer, // Reel number, starts at 1
        "symbols": [ // Symbols top to bottom
          string // Symbol name
        ]
      }
    ]
  },
  "extra": {
    "currentBonusStep": ?integer, // Current step of the bonus ladder
    "previousBonusStep": ?integer // Previous step of the bonus ladder
  }
}
```
Example:
```json
{
  "reels": [
    { "number": 1, "symbols": ["sym1", "sym2", "sym3"] },
    { "number": 2, "symbols": ["sym1", "sym4", "sym5"] },
    { "number": 3, "symbols": ["sym1", "sym6", "sym7"] },
    { "number": 4, "symbols": ["sym8", "wild", "sym2"] },
    { "number": 5, "symbols": ["sym5", "sym2", "bonus"] }
  ],
  "bet": "10",
  "lines": 10,
  "totalBet": "100",
  "totalWin": "80",
  "winLines": {
    "lines": [
      {
        "number": 2,
        "symbol": "sym1",
        "win": "80",
        "length": 3,
        "direction": "normal"
      }
    ],
    "reels": [
      { "number": 1, "symbols": ["sym1", "sym2", "sym3"] },
      { "number": 2, "symbols": ["sym1", "sym4", "sym5"] },
      { "number": 3, "symbols": ["sym1", "sym6", "sym7"] },
      { "number": 4, "symbols": ["sym8", "wild", "sym2"] },
      { "number": 5, "symbols": ["sym5", "sym2", "bonus"] }
    ]
  },
  "mode": "spin",
  "currentStep": "spin",
  "nextStep": "spin",
  "extra": {
    "currentBonusStep": 1,
    "previousBonusStep": 1
  },
  "multiplier": 1,
  "collectedSymbol": null,
  "collection": []
}
```

#### Fruit Storm
`extra` is replaced completely.
```json
{
  "extra": {
    "bet": ?string, // Numeric string with bet per line
    "currentFreespins": integer, // Freespins added by this step
    "freespins": integer, // Freespins left
    "totalFreespins": integer, // Freespins granted in total
    "bonusWin": string, // Numeric string with win of the special symbol
    "bonusWins": [ // Win of each special symbol
      string // Numeric string with win
    ],
    "totalWin": string, // Numeric string with accumulated win of the series
    "currentSpinsCount": [ // Progress of the bonus counter per total bet
      {
        "totalBet": string, // Numeric string with total bet the counter belongs to
        "count": integer // Spins already made on that bet
      }
    ],
    "maxSpinsCount": integer, // Spins needed to trigger the bonus
    "lastReels": ?[ // Reels of the previous spin
      {
        "number": integer, // Reel number, starts at 1
        "symbols": [ // Symbols top to bottom
          string // Symbol name
        ]
      }
    ]
  }
}
```
Example:
```json
{
  "reels": [
    { "number": 1, "symbols": ["sym1", "sym2", "sym3"] },
    { "number": 2, "symbols": ["sym4", "sym1", "sym5"] },
    { "number": 3, "symbols": ["scatter", "sym6", "sym7"] },
    { "number": 4, "symbols": ["wild", "sym8", "sym2"] },
    { "number": 5, "symbols": ["sym3", "sym4", "sym1"] }
  ],
  "bet": "10",
  "lines": 10,
  "totalBet": "100",
  "totalWin": "0",
  "winLines": [],
  "mode": "freespin",
  "currentStep": "freespin",
  "nextStep": "freespin",
  "extra": {
    "bet": "10",
    "currentFreespins": 0,
    "freespins": 3,
    "totalFreespins": 8,
    "bonusWin": "0",
    "bonusWins": [],
    "totalWin": "140",
    "currentSpinsCount": [
      { "totalBet": "100", "count": 5 },
      { "totalBet": "250", "count": 2 }
    ],
    "maxSpinsCount": 8,
    "lastReels": [
      { "number": 1, "symbols": ["sym2", "sym3", "sym4"] },
      { "number": 2, "symbols": ["sym5", "sym1", "sym6"] },
      { "number": 3, "symbols": ["sym7", "wild", "scatter"] },
      { "number": 4, "symbols": ["sym8", "sym2", "sym3"] },
      { "number": 5, "symbols": ["sym1", "sym4", "sym5"] }
    ]
  },
  "multiplier": 1,
  "collectedSymbol": null,
  "collection": []
}
```

#### Shootland
Game pays by ways, not by lines. `winLines` and `lines` are absent, `winWays` is present and
`totalBet` equals the bet amount.
```json
{
  "winWays": [ // One item per winning symbol
    {
      "symbol": string, // Symbol name which produced the win
      "hits": integer, // Count of ways this win occurred in
      "length": integer, // Count of consecutive reels
      "win": string, // Numeric string with win of this symbol
      "symbols": [ // Positions of the winning symbols
        {
          "reelIndex": integer, // Reel, 0 based
          "symbolIndex": integer // Position on the reel, 0 based
        }
      ]
    }
  ],
  "extra": {
    "bet": ?string, // Numeric string with bet per line
    "currentFreespins": integer, // Freespins added by this step
    "freespins": integer, // Freespins left
    "totalFreespins": integer, // Freespins granted in total
    "playedFreespins": integer, // Freespins already played in the series
    "bonusWin": string, // Numeric string with win of the special symbol
    "bonusWins": [ // Win of each special symbol
      string // Numeric string with win
    ],
    "totalWin": string, // Numeric string with accumulated win of the series
    "currentSpinsCount": [ // Progress of the bonus counter per total bet
      {
        "totalBet": string, // Numeric string with total bet
        "count": integer // Spins already made on that bet
      }
    ],
    "lastReels": ?[ // Reels of the previous spin
      {
        "number": integer, // Reel number, starts at 1
        "symbols": [ // Symbols top to bottom
          string // Symbol name
        ]
      }
    ],
    "isMaxWin": boolean, // (Optional) Present only when the maximum win was reached
    "wilds": [ // (Optional) Present only when wilds are on screen
      {
        "reelIndex": integer, // Reel, 0 based
        "symbolIndex": integer, // Position on the reel, 0 based
        "multiplier": ?integer // Multiplier of that wild
      }
    ],
    "stars": [ // (Optional) Present only during freespins with stars on screen
      {
        "reelIndex": integer, // Reel, 0 based
        "symbolIndex": integer // Position on the reel, 0 based
      }
    ]
  }
}
```
Example:
```json
{
  "reels": [
    { "number": 1, "symbols": ["sym6", "sym2", "sym1"] },
    { "number": 2, "symbols": ["sym6", "wild", "sym4"] },
    { "number": 3, "symbols": ["sym6", "sym3", "sym5"] },
    { "number": 4, "symbols": ["sym8", "sym7", "sym1"] },
    { "number": 5, "symbols": ["scatter", "sym2", "sym3"] }
  ],
  "bet": "20",
  "totalBet": "20",
  "totalWin": "120",
  "winWays": [
    {
      "symbol": "sym6",
      "hits": 3,
      "length": 3,
      "win": "120",
      "symbols": [
        { "reelIndex": 0, "symbolIndex": 0 },
        { "reelIndex": 1, "symbolIndex": 0 },
        { "reelIndex": 2, "symbolIndex": 0 }
      ]
    }
  ],
  "mode": "spin",
  "currentStep": "spin",
  "nextStep": "spin",
  "extra": {
    "bet": "20",
    "currentFreespins": 0,
    "freespins": 0,
    "totalFreespins": 0,
    "playedFreespins": 0,
    "bonusWin": "0",
    "bonusWins": [],
    "totalWin": "0",
    "currentSpinsCount": [
      { "totalBet": "20", "count": 4 }
    ],
    "lastReels": null,
    "isMaxWin": false,
    "wilds": [
      { "reelIndex": 1, "symbolIndex": 1, "multiplier": 2 }
    ],
    "stars": [
      { "reelIndex": 4, "symbolIndex": 0 }
    ]
  },
  "multiplier": 1,
  "collectedSymbol": null,
  "collection": []
}
```

#### Dark Portal
Adds mode switching and portal progress.
```json
{
  "currentMode": integer, // Game mode in play, send it back in the spin request
  "openedModes": integer, // How many modes the player has unlocked, up to 3
  "modeCanBeChanged": boolean, // (Optional) Present only when the player is allowed to switch the mode
  "extra": {
    "bet": ?string, // Numeric string with bet per line
    "currentFreespins": integer, // Freespins added by this step
    "freespins": integer, // Freespins left
    "totalFreespins": integer, // Freespins granted in total
    "bonusWin": string, // Numeric string with win of the special symbol
    "bonusWins": [ // Win of each special symbol
      string // Numeric string with win
    ],
    "totalWin": string, // Numeric string with accumulated win of the series
    "currentSpinsCount": { // Progress keyed by mode, then by total bet
      "{mode}": {
        "{totalBet}": {
          "totalBet": string, // Numeric string with total bet
          "totalCount": integer, // Spins made on that bet in that mode
          "count": integer // Portals collected on that bet
        }
      }
    },
    "maxSpinsCount": integer, // Spins needed for the bonus
    "isProgressBonusGame": boolean, // Bonus is running as a progress game
    "lastReels": ?[ // Reels of the previous spin
      {
        "number": integer, // Reel number, starts at 1
        "symbols": [ // Symbols top to bottom
          string // Symbol name
        ]
      }
    ],
    "portalPosition": ?{ // (Optional) Position of the portal symbol
      "reelIndex": integer, // Reel, 0 based
      "symbolIndex": integer // Position on the reel, 0 based
    }
  }
}
```
Example:
```json
{
  "reels": [
    { "number": 1, "symbols": ["sym1", "sym2", "sym3"] },
    { "number": 2, "symbols": ["sym4", "wild", "sym1"] },
    { "number": 3, "symbols": ["sym7", "sym5", "sym2"] },
    { "number": 4, "symbols": ["scatter", "sym3", "sym6"] },
    { "number": 5, "symbols": ["sym8", "sym7", "sym1"] }
  ],
  "bet": "10",
  "lines": 20,
  "totalBet": "200",
  "totalWin": "0",
  "winLines": [],
  "mode": "spin",
  "currentStep": "spin",
  "nextStep": "spin",
  "extra": {
    "bet": "10",
    "currentFreespins": 0,
    "freespins": 0,
    "totalFreespins": 0,
    "bonusWin": "0",
    "bonusWins": [],
    "totalWin": "0",
    "currentSpinsCount": {
      "1": {
        "200": {
          "totalBet": "200",
          "totalCount": 12,
          "count": 2
        }
      }
    },
    "maxSpinsCount": 6,
    "isProgressBonusGame": false,
    "lastReels": null,
    "portalPosition": {
      "reelIndex": 3,
      "symbolIndex": 0
    }
  },
  "multiplier": 1,
  "currentMode": 1,
  "openedModes": 1,
  "modeCanBeChanged": true,
  "collectedSymbol": null,
  "collection": []
}
```

#### TapTap
Standard state plus two fields in `extra`.
```json
{
  "extra": {
    "hash": integer, // Value the client must send back in the freespin request
    "possibleWins": [ // Possible outcomes
      [ // One outcome
        string // Three numeric strings in order: bonus win, multiplier, total win
      ]
    ]
  }
}
```
Example:
```json
{
  "reels": [
    { "number": 1, "symbols": ["sym1", "sym2", "sym3"] },
    { "number": 2, "symbols": ["sym4", "sym5", "sym6"] },
    { "number": 3, "symbols": ["sym7", "sym8", "wild"] }
  ],
  "bet": "10",
  "lines": 10,
  "totalBet": "100",
  "totalWin": "0",
  "winLines": [],
  "mode": "freespin",
  "currentStep": "freespin",
  "nextStep": "freespin",
  "extra": {
    "bet": "10",
    "currentFreespins": 0,
    "freespins": 2,
    "totalFreespins": 5,
    "symbol": null,
    "symbols": [],
    "bonusWin": "0",
    "bonusWins": [],
    "totalWin": "300",
    "reelsWithSpecials": [],
    "variant": null,
    "multiplier": 1,
    "hash": 16711935,
    "possibleWins": [
      ["100", "2", "200"],
      ["250", "3", "750"],
      ["500", "5", "2500"]
    ]
  },
  "multiplier": 1,
  "collectedSymbol": null,
  "collection": []
}
```

#### Pinball Inferno
Standard state with `totalWin` reported by the game itself rather than as the sum of the lines, plus
two fields.
```json
{
  "pinballPath": ?string, // Encoded path of the ball, used for the animation
  "debugData": array // Extra data of the round, currently always empty
}
```
Example:
```json
{
  "reels": [
    { "number": 1, "symbols": ["sym1", "sym2", "sym3"] },
    { "number": 2, "symbols": ["sym4", "sym5", "sym6"] },
    { "number": 3, "symbols": ["sym7", "sym8", "wild"] },
    { "number": 4, "symbols": ["scatter", "sym1", "sym2"] },
    { "number": 5, "symbols": ["sym3", "sym4", "sym5"] }
  ],
  "bet": "10",
  "lines": 10,
  "totalBet": "100",
  "totalWin": "340",
  "winLines": [],
  "mode": "spin",
  "currentStep": "spin",
  "nextStep": "spin",
  "extra": [],
  "multiplier": 1,
  "collectedSymbol": null,
  "collection": [],
  "pinballPath": "LRLLRRL",
  "debugData": []
}
```

#### Mystic Gates and Charmana
These two games do not use `reels` and `winLines` at all, everything is keyed by total bet because the
player plays several bets at once.
```json
{
  "currentBetKey": ?string, // Numeric string with total bet the last action was played on, a key of the maps below
  "bet": ?string, // Numeric string with bet per line
  "lines": ?integer, // Active paylines count
  "totalBet": ?string, // Numeric string with total bet
  "totalWin": string, // Numeric string with win of this step
  "currentStep": string, // Step which has just been played
  "nextStep": string, // Step the client must request next
  "reelsByBet": { // Reels per total bet
    "{totalBet}": [
      {
        "number": integer, // Reel number, starts at 1
        "symbols": [
          {
            "name": string, // Symbol name
            "multiplier": ?integer, // Multiplier printed on the symbol
            "win": ?string, // Numeric string with win of that symbol
            "replacement": ?{ // What a mystery symbol turned into
              "name": string, // Symbol name after replacement
              "multiplier": ?integer, // Multiplier of the new symbol
              "win": ?string // Numeric string with win of the new symbol
            }
          }
        ]
      }
    ]
  },
  "cashoutByBet": { // Cashout progress per total bet, one object per bet in Mystic Gates, array of up to three objects in Charmana
    "{totalBet}": {
      "symbolIndex": integer, // Position on the reel, 0 based
      "reelIndex": integer, // Reel, 0 based
      "total": integer, // Target counter value
      "counter": integer, // Current counter value
      "isNew": boolean // Charmana only, entry appeared on this step
    }
  },
  "wins": [ // Paying symbols of this step
    {
      "sym": integer, // Symbol code, a number here, not a name
      "symbolIndex": integer, // Position on the reel, 0 based
      "reelIndex": integer, // Reel, 0 based
      "win": string // Numeric string with win of that symbol
    }
  ],
  "jackpotWin": string, // Numeric string with jackpot amount won on this step
  "isJackpot": boolean, // Step won a jackpot
  "extra": {
    "currentFreespins": integer, // Freespins added by this step
    "freespins": integer, // Freespins left
    "totalFreespins": integer, // Freespins granted in total
    "totalWin": string, // Numeric string with accumulated win of the series
    "bet": ?string // Numeric string with bet per line
  },
  "mode": string, // 'spin' or 'freespin'
  "lastReels": ?object, // Reels of the previous step, same shape as reelsByBet
  "collectedSymbol": ?string, // Symbol name added to the player collection
  "collection": ?[ // Player collection
    {
      "sysname": string, // Game system name
      "symbolCode": integer // Collected symbol code
    }
  ],
  "keepStickySymbolsByBet": { // Per total bet flag whether sticky symbols stay for the next step
    "{totalBet}": boolean // Sticky symbols stay
  }
}
```
Mystic Gates example:
```json
{
  "currentBetKey": "10",
  "bet": "1",
  "lines": 10,
  "totalBet": "10",
  "totalWin": "12",
  "currentStep": "spin",
  "nextStep": "spin",
  "reelsByBet": {
    "10": [
      {
        "number": 1,
        "symbols": [
          { "name": "value1", "multiplier": 2, "win": "2", "replacement": null },
          { "name": "empty", "multiplier": null, "win": null, "replacement": null },
          { "name": "value2", "multiplier": 10, "win": "10", "replacement": null }
        ]
      },
      {
        "number": 2,
        "symbols": [
          { "name": "empty", "multiplier": null, "win": null, "replacement": null },
          {
            "name": "mystery",
            "multiplier": null,
            "win": null,
            "replacement": { "name": "value1", "multiplier": 2, "win": "2" }
          },
          { "name": "empty", "multiplier": null, "win": null, "replacement": null }
        ]
      },
      {
        "number": 3,
        "symbols": [
          { "name": "collect", "multiplier": null, "win": null, "replacement": null },
          { "name": "empty", "multiplier": null, "win": null, "replacement": null },
          { "name": "jackpotbox", "multiplier": null, "win": null, "replacement": null }
        ]
      }
    ]
  },
  "cashoutByBet": {
    "10": { "symbolIndex": 0, "reelIndex": 2, "total": 5, "counter": 3 }
  },
  "wins": [
    { "sym": 1, "symbolIndex": 0, "reelIndex": 0, "win": "2" },
    { "sym": 2, "symbolIndex": 2, "reelIndex": 0, "win": "10" }
  ],
  "jackpotWin": "0",
  "isJackpot": false,
  "extra": {
    "currentFreespins": 0,
    "freespins": 0,
    "totalFreespins": 0,
    "totalWin": "0",
    "bet": "1"
  },
  "mode": "spin",
  "lastReels": null,
  "collectedSymbol": null,
  "collection": [],
  "keepStickySymbolsByBet": {
    "10": false
  }
}
```
Charmana `cashoutByBet` example, up to three entries per bet:
```json
{
  "cashoutByBet": {
    "10": [
      { "symbolIndex": 0, "reelIndex": 1, "total": 5, "counter": 2, "isNew": true },
      { "symbolIndex": 2, "reelIndex": 3, "total": 8, "counter": 1, "isNew": false }
    ],
    "25": []
  }
}
```

## Game API errors

Rejected game action answers http 422 with json object:
```json
{
  "errorCode": integer, // Error code
  "errorLevel": string, // Error level: 'CRITICAL' means the session cannot continue, 'ALERT' means the player can fix it and retry, 'WARNING' is informational
  "errorMessage": string // Error message in the session language
}
```
Example:
```json
{
  "errorCode": 3,
  "errorLevel": "ALERT",
  "errorMessage": "Not enough money"
}
```

Missing required field or a value of the wrong type answers http 400 with json array of violations:
```json
[
  {
    "code": ?string, // Identifier of the failed rule
    "message": string, // What is wrong with the value
    "field": string // Field which failed, 'freespins.bet' for a nested one
  }
]
```
Example:
```json
[
  {
    "code": "ad32d13f-c3d4-423b-909a-857b961eb720",
    "message": "This value should not be null.",
    "field": "bet"
  },
  {
    "code": "ba785a8c-82cb-4283-967c-3cf342181b40",
    "message": "This value should be of type integer.",
    "field": "lines"
  }
]
```

Body which is not valid json answers http 422 with json object:
```json
{
  "error": string // Parser message
}
```
Example:
```json
{
  "error": "Syntax error"
}
```
Empty body is treated as `{}`, so a request without a body fails on the required fields with the
validation error array instead.

Game init reports some problems with http 200, three error fields are merged into the init payload, so
the client gets the state and the warning at the same time. Unknown session key answers http 404 with
message `Session not found`.

Error Code| Level | Message | Description
-------- | ----- | ----- | -----
1 | CRITICAL | General error | Unexpected failure
3 | ALERT | Not enough money | Balance is lower than the bet
4 | CRITICAL | Bet limit reached. | Bet exceeds the configured limit
9 | CRITICAL | Your currency is not supported | Session currency has no configuration
100 | CRITICAL | Avalanche is not available | Wrong step for the current state
101 | CRITICAL | Bonus game is not available | Wrong step for the current state
102 | CRITICAL | Buy is not available | Feature cannot be bought now
103 | CRITICAL | Free spin is not available | Wrong step for the current state
104 | CRITICAL | Jackpot is not available | Wrong step for the current state
105 | CRITICAL | Respin is not available | Wrong step for the current state
106 | CRITICAL | Wrong bet | Bet is not one of the allowed values
107 | CRITICAL | Spin is not available | Spin is not allowed now, for example during freespins
108 | CRITICAL | Wrong lines | Lines value is not allowed for this game
109 | CRITICAL | Session is closed | Session expired or was closed
110 | CRITICAL | Previous state is not available | There is no bonus game to return from
111 | CRITICAL | Slot is not available in your country | Country restriction, returned by game init with http 200
112 | ALERT | Game already opened in other device | Fingerprint does not match the session
115 | CRITICAL | Wrong current mode | Requested game mode is not the current one
140 | ALERT | Nickname is too long. | Nickname is longer than 255 characters
140 | CRITICAL | error.140 | Nickname is empty, there is no text for this code yet so the key itself is returned
300 | WARNING | This language is not supported | Language falls back to English, returned by game init with http 200

Messages are translated into the session language, available languages are English, Spanish, French,
Italian, Japanese, Norwegian, Polish, Portuguese, Finnish and Chinese.
