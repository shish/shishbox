// #![deny(warnings)]
use futures::{FutureExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::hash_map::Entry::{Occupied, Vacant};
use std::collections::HashMap;
use std::sync::{Arc};
use tokio::sync::{mpsc, RwLock};
use warp::ws::{Message, WebSocket};
use warp::Filter;

/// Our state of currently connected users.
#[derive(Serialize, Deserialize)]
struct Player {
    name: String,
    sess: String,
    #[serde(skip)]
    conn: Option<mpsc::UnboundedSender<std::result::Result<Message, warp::Error>>> // Message
}

#[derive(Serialize, Deserialize)]
#[derive(Default)]
struct Room {
    game: String,
    lobby: bool,
    players: Vec<Player>,
    stacks: Vec<Vec<String>>,
    tick: u32,
}
type Rooms = HashMap<usize, Room>;
type GlobalRooms = Arc<RwLock<Rooms>>;

#[derive(Deserialize)]
struct RoomLogin {
    room: String,
    user: String,
    sess: String,
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

    println!("Serving at localhost:1239");
    warp::serve(routes).run(([127, 0, 0, 1], 1239)).await;
}

async fn user_connected(ws: WebSocket, rooms: GlobalRooms, login: RoomLogin) {
    // Use a counter to assign a new unique ID for this user.
    let room_id = 0;

    // Split the socket into a sender and receive of messages.
    let (user_ws_tx, mut user_ws_rx) = ws.split();

    // Use an unbounded channel to handle buffering and flushing of messages
    // to the websocket...
    let (tx, rx) = mpsc::unbounded_channel();
    tokio::task::spawn(rx.forward(user_ws_tx).map(|result| {
        if let Err(e) = result {
            eprintln!("websocket send error: {}", e);
        }
    }));

    // Save the sender in our list of connected users.
    {
        let mut rooms_lookup = rooms.write().await;
        let room = match rooms_lookup.entry(room_id) {
            Vacant(entry) => {
                eprintln!(
                    "[{}] First user {} ({}) creates room ({})",
                    room_id, login.user, login.sess, login.room
                );
                entry.insert(Room::default())
            }
            Occupied(entry) => {
                eprintln!(
                    "[{}] Adding user {} ({}) into room",
                    room_id, login.user, login.sess
                );
                entry.into_mut()
            }
        };
        room.game = "wd".into();
        room.stacks.push(vec![]);
        room.lobby = true;
        room.players.push(Player{name: login.user.clone(), sess: login.sess.clone(), conn: Some(tx)});
    }

    // Broadcast join after adding user to room, so that as
    // soon as they connect they get a message to sync them
    sync_room(&rooms, room_id).await;

    // Read from the websocket, broadcast messages to all other users
    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("websocket error(user={}): {}", login.user, e);
                break;
            }
        };
        eprintln!("Got msg: {:?}", msg);
        sync_room(&rooms, room_id).await;
    }

    // After we finish reading from the websocket (ie, it's closed), clean up
    {
        eprintln!("[{}] Removing user {} ({})", room_id, login.user, login.sess);
        let mut rooms_lookup = rooms.write().await;

        // Stream closed up, so remove from the user list
        if let Some(room) = rooms_lookup.get_mut(&room_id) {
            if let Some(pos) = room.players.iter().position(|x| *x.sess == login.sess) {
                room.players.remove(pos);
            }

            // If room is empty, delete room
            if room.players.len() == 0 {
                eprintln!("[{}] Room is empty, cleaning it up", room_id);
                rooms_lookup.remove(&room_id);
            }
        }
        eprintln!("[{}] Removed user {}", room_id, login.user);
    }

    // Broadcast disconnect after removing user - don't want
    // to send to a dead socket
    sync_room(&rooms, room_id).await;
}

async fn sync_room(rooms: &GlobalRooms, room_id: usize) {
    println!("[{}] Syncing", room_id);
    if let Some(room) = rooms.read().await.get(&room_id) {
        // Something happened. Serialize the current room state and
        // broadcast it to everybody in the room.
        let msg = Message::text(serde_json::to_string(room).unwrap());
        for player in room.players.iter() {
            if let Some(conn) = &player.conn {
                if let Err(_disconnected) = conn.send(Ok(msg.clone())) {
                    // The tx is disconnected, our `user_disconnected` code
                    // should be happening in another task, nothing more to
                    // do here.
                }    
            }
        }
    }
    println!("[{}] Synced", room_id);
}
