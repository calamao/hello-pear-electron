# Tic Tac Toe

A Tic Tac Toe game app built on top of the Autopass API.

## Demo

<video src="./docs/assets/Cap%202026-11-18%20at%2018.25.03.mp4" controls width="100%"></video>

## Screenshots

![My games list](./docs/assets/Captura%20de%20pantalla%202026-11-18%20183732.png)

![Finished game](./docs/assets/Captura%20de%20pantalla%202026-11-18%20183837.png)

![Game in progress](./docs/assets/Captura%20de%20pantalla%202026-11-18%20183910.png)

## Playing with two development instances

Open two terminals in the repository. Give each app instance its own storage directory:

```sh
npm start -- --storage /tmp/pear-ttt-player-a --no-updates
```

```sh
npm start -- --storage /tmp/pear-ttt-player-b --no-updates
```

In the first instance, create a game and choose **Share**. Copy the invite payload, then
choose **Join game** in the second instance, paste the payload, and enter the name to use
for that game. The second instance should then list the shared game. Keep both instances
open while they pair and sync. Game changes refresh automatically as notes sync; if an
instance does not receive a change, reload that window to fetch the latest game state.
