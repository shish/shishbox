// #![deny(warnings)]
use futures::{FutureExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use warp::ws::{Message, WebSocket};
use warp::Filter;

#[macro_use]
extern crate log;

/// Our state of currently connected users.
#[derive(Serialize, Deserialize)]
struct Player {
    name: String,
    #[serde(skip)]
    sess: String,
    #[serde(skip)]
    conn: Option<mpsc::UnboundedSender<std::result::Result<Message, warp::Error>>>, // Message
}

#[derive(PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
enum Phase {
    Lobby,
    Game,
    GameOver,
}

impl Default for Phase {
    fn default() -> Self {
        Phase::Lobby
    }
}

#[derive(Serialize, Deserialize, Default)]
struct Room {
    game: String,
    phase: Phase,
    players: Vec<Player>,
    stacks: Vec<Vec<String>>,
    tick: usize,
}
type Rooms = HashMap<String, Arc<RwLock<Room>>>;
type GlobalRooms = Arc<RwLock<Rooms>>;

#[derive(Serialize)]
struct RoomError {
    error: String,
}

#[derive(Deserialize)]
struct RoomLogin {
    room: String,
    user: String,
    sess: String,
}

#[derive(Deserialize, Default, Debug)]
struct Command {
    cmd: String,
    data: String,
}

#[tokio::main]
async fn main() {
    pretty_env_logger::init();

    // Keep track of all connected users, key is usize, value
    // is a websocket sender.
    let rooms = GlobalRooms::default();
    // Turn our "state" into a new Filter...
    let rooms = warp::any().map(move || rooms.clone());

    // GET /room -> websocket upgrade
    let room = warp::path("room")
        // The `ws()` filter will prepare Websocket handshake...
        .and(warp::ws())
        .and(rooms)
        .and(warp::query::<RoomLogin>())
        .map(|ws: warp::ws::Ws, rooms, login: RoomLogin| {
            // This will call our function if the handshake succeeds.
            ws.on_upgrade(move |socket| user_connected(socket, rooms, login))
        });

    // GET / -> index html
    let files = warp::fs::dir("../frontend/dist/");

    let routes = files.or(room);

    warp::serve(routes).run(([127, 0, 0, 1], 1239)).await;
}

async fn user_connected(ws: WebSocket, rooms: GlobalRooms, login: RoomLogin) {
    // Split the socket into a sender and receive of messages.
    let (user_ws_tx, mut user_ws_rx) = ws.split();
    let (tx, rx) = mpsc::unbounded_channel();
    tokio::task::spawn(rx.forward(user_ws_tx).map(|result| {
        if let Err(e) = result {
            error!("websocket send error: {}", e);
        }
    }));

    // Find our room, creating it if it doesn't exist
    let locked_room = {
        let mut rooms_lookup = rooms.write().await;
        if rooms_lookup.get(&login.room).is_none() {
            info!("[{}] Creating room", login.room);
            let mut new_room = Room::default();
            new_room.game = "wd".into(); // WD
            new_room.phase = Phase::Lobby;
            rooms_lookup.insert(login.room.clone(), Arc::new(RwLock::new(new_room)));
        }
        rooms_lookup.get(&login.room).unwrap().clone()
    };

    // Save the sender in our list of connected users.
    {
        let mut room = locked_room.write().await;
        if room.phase != Phase::Lobby {
            info!(
                "[{}] Rejecting {} ({}) from game in progress",
                login.room, login.user, login.sess
            );
            let full = RoomError {error: "Game in progress".into()};
            let msg = Message::text(serde_json::to_string(&full).unwrap());
            if let Err(_) = tx.send(Ok(msg)) {}
            return; // spectators?
        }
        info!("[{}] Adding {} ({})", login.room, login.user, login.sess);
        room.stacks.push(vec![]); // WD
        room.players.push(Player {
            name: login.user.clone(),
            sess: login.sess.clone(),
            conn: Some(tx),
        });
        sync_room(&room).await;
    }

    // Read from the websocket, update room state, broadcast updates
    while let Some(Ok(msg)) = user_ws_rx.next().await {
        let cmd: Command = match msg.is_text() {
            true => serde_json::from_str(msg.to_str().unwrap()).unwrap(),
            false => break,
        };
        match cmd.cmd.as_str() {
            "start" => {
                let mut room = locked_room.write().await;
                room.phase = Phase::Game;
                sync_room(&room).await;
            }
            "submit" => {
                // WD
                let mut room = locked_room.write().await;
                if let Some(pos) = room.players.iter().position(|x| *x.sess == login.sess) {
                    let players = room.stacks.len();
                    let round = room.stacks.iter().map(|s| s.len()).min().unwrap();
                    let my_stack = (pos + round) % players;
                    room.stacks[my_stack].push(cmd.data);

                    let round = room.stacks.iter().map(|s| s.len()).min().unwrap();
                    if round == players {
                        room.phase = Phase::GameOver;
                    }
                }
                sync_room(&room).await;
            }
            _ => {
                error!(
                    "[{}] Unrecognised message from {}: {:?}",
                    login.room, login.user, cmd
                );
            }
        }
    }

    // After we finish reading from the websocket (ie, it's closed), clean up
    {
        info!("[{}] Removing {} ({})", login.room, login.user, login.sess);
        let mut room = locked_room.write().await;

        if let Some(pos) = room.players.iter().position(|x| *x.sess == login.sess) {
            room.players.remove(pos);
            room.stacks.remove(pos); // WD
        }

        // If room is empty, delete room
        if room.players.len() == 0 {
            info!("[{}] Room is empty, cleaning it up", login.room);
            rooms.write().await.remove(&login.room);
        }
        debug!("[{}] Removed {}", login.room, login.user);
    }

    // If the game is in progress, let everybody know about the user
    // disconnecting. If we're in the GameOver screen, then don't
    // broadcast any changes so that we don't disrupt the scores screen.
    {
        let room = locked_room.read().await;
        if room.phase != Phase::GameOver {
            sync_room(&room).await;
        }
    }
}

async fn sync_room(room: &Room) {
    // Something happened. Serialize the current room state and
    // broadcast it to everybody in the room.
    // TODO: Broadcast a diff?
    let msg = Message::text(serde_json::to_string(room).unwrap());
    for player in room.players.iter() {
        if let Some(conn) = &player.conn {
            if let Err(_) = conn.send(Ok(msg.clone())) {
                // The tx is disconnected, our `user_disconnected` code
                // should be happening in another task, nothing more to
                // do here.
            }
        }
    }
}
