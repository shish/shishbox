// #![deny(warnings)]
use futures::{FutureExt, StreamExt};
use serde::Deserialize;
use std::collections::hash_map::Entry::{Occupied, Vacant};
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicUsize, Ordering},
    Arc,
};
use tokio::sync::{mpsc, RwLock};
use warp::ws::{Message, WebSocket};
use warp::Filter;

/// Our global unique user id counter.
static NEXT_USER_ID: AtomicUsize = AtomicUsize::new(1);

/// Our state of currently connected users.
struct Player {
    name: String,
    conn: mpsc::UnboundedSender<Result<Message, warp::Error>>
}

#[derive(Default)]
struct Room {
    players: HashMap<usize, Player>,
}
type Rooms = HashMap<usize, Room>;
type GlobalRooms = Arc<RwLock<Rooms>>;

#[derive(Deserialize)]
struct RoomLogin {
    room: String,
    user: String,
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
    let my_id = NEXT_USER_ID.fetch_add(1, Ordering::Relaxed);

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
                    room_id, login.user, my_id, login.room
                );
                entry.insert(Room::default())
            }
            Occupied(entry) => {
                eprintln!(
                    "[{}] Adding user {} ({}) into room",
                    room_id, login.user, my_id
                );
                entry.into_mut()
            }
        };
        room.players.insert(my_id, Player{name: login.user.clone(), conn: tx});
    }

    // Read from the websocket, broadcast messages to all other users
    while let Some(result) = user_ws_rx.next().await {
        let msg = match result {
            Ok(msg) => msg,
            Err(e) => {
                eprintln!("websocket error(uid={}): {}", my_id, e);
                break;
            }
        };
        user_message(room_id, my_id, &login.user, msg, &rooms).await;
    }

    // After we finish reading from the websocket (ie, it's closed), clean up
    {
        let mut rooms_lookup = rooms.write().await;

        // Stream closed up, so remove from the user list
        if let Some(room) = rooms_lookup.get_mut(&room_id) {
            eprintln!("[{}] Removing user {}", room_id, my_id);
            room.players.remove(&my_id);

            // If room is empty, delete room
            if room.players.len() == 0 {
                eprintln!("[{}] Room is empty, cleaning it up", room_id);
                rooms_lookup.remove(&room_id);
            }
        }
    }
}

async fn user_message(room_id: usize, my_id: usize, my_name: &String, msg: Message, rooms: &GlobalRooms) {
    // Skip any non-Text messages...
    let msg = if let Ok(s) = msg.to_str() {
        s
    } else {
        return;
    };

    let new_msg = format!("[{}] <{}> {}", room_id, my_name, msg);
    let room_id = 0;
    if let Some(room) = rooms.read().await.get(&room_id) {
        // New message from this user, send it to everyone else (except same uid)...
        for (&uid, player) in room.players.iter() {
            if my_id != uid {
                if let Err(_disconnected) = player.conn.send(Ok(Message::text(new_msg.clone()))) {
                    // The tx is disconnected, our `user_disconnected` code
                    // should be happening in another task, nothing more to
                    // do here.
                }
            }
        }
    }
}
