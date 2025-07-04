// #![deny(warnings)]
use futures::{FutureExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};
use tokio_stream::wrappers::UnboundedReceiverStream;
use warp::ws::{Message, WebSocket};
use warp::Filter;

mod player;
mod room;

#[macro_use]
extern crate log;

type Rooms = HashMap<String, Arc<RwLock<room::Room>>>;
type GlobalRooms = Arc<RwLock<Rooms>>;

#[derive(Serialize)]
struct RoomSummary {
    name: String,
    game: String,
    players: usize,
    limit: usize,
}

#[derive(Serialize)]
struct RoomError {
    error: String,
}

#[derive(Deserialize)]
pub struct LoginArgs {
    room: String,
    user: String,
    sess: String,
}

#[tokio::main]
async fn main() {
    pretty_env_logger::init();

    let rooms_map = GlobalRooms::default();
    let rooms_filter = warp::any().map(move || rooms_map.clone());

    // GET /room -> websocket upgrade
    let room = warp::path("room")
        // The `ws()` filter will prepare Websocket handshake...
        .and(warp::ws())
        .and(rooms_filter.clone())
        .and(warp::query::<LoginArgs>())
        .map(|ws: warp::ws::Ws, rooms, mut login: LoginArgs| {
            login.room = login.room.to_uppercase();
            // This will call our function if the handshake succeeds.
            ws.on_upgrade(move |socket| user_connected(socket, rooms, login))
        });

    // GET /rooms -> list of rooms
    let rooms = warp::path("rooms")
        .and(rooms_filter.clone())
        .and_then(list_rooms);

    // GET / -> index html
    let files = warp::fs::dir("../frontend/dist/");

    let routes = room.or(rooms).or(files);

    warp::serve(routes).run(([0, 0, 0, 0], 8000)).await;
}

async fn list_rooms(rooms: GlobalRooms) -> Result<impl warp::reply::Reply, warp::Rejection> {
    let mut room_list = Vec::new();
    {
        let rooms_lookup = rooms.read().await;
        for (name, locked_room) in rooms_lookup.iter() {
            let room = locked_room.read().await;
            if room.public && room.phase == room::Phase::Lobby {
                room_list.push(RoomSummary {
                    name: name.clone(),
                    game: room.game.clone(),
                    players: room.players.len(),
                    limit: 0,
                });
            }
        }
    };
    Ok(warp::reply::json(&room_list))
}

async fn user_connected(ws: WebSocket, rooms: GlobalRooms, login: LoginArgs) {
    // Split the socket into a sender and receive of messages.
    let (user_ws_tx, mut user_ws_rx) = ws.split();
    let (tx, rx) = mpsc::unbounded_channel();
    let rx_stream = UnboundedReceiverStream::new(rx);
    tokio::task::spawn(rx_stream.forward(user_ws_tx).map(|result| {
        if let Err(e) = result {
            error!("websocket send error: {}", e);
        }
    }));

    // Find our room, creating it if it doesn't exist
    let locked_room = {
        let mut rooms_lookup = rooms.write().await;
        if rooms_lookup.get(&login.room).is_none() {
            info!("[{}] Creating room", login.room);
            let mut new_room = room::Room::default();
            new_room.public = true;
            new_room.game = "wd".into(); // WD
            new_room.phase = room::Phase::Lobby;
            rooms_lookup.insert(login.room.clone(), Arc::new(RwLock::new(new_room)));
        }
        rooms_lookup.get(&login.room).unwrap().clone()
    };

    // Save the sender in our list of connected users.
    {
        let mut room = locked_room.write().await;
        if room.phase != room::Phase::Lobby {
            info!(
                "[{}] Rejecting {} ({}) from game in progress",
                login.room, login.user, login.sess
            );
            let full = RoomError {
                error: "Game in progress".into(),
            };
            let msg = Message::text(serde_json::to_string(&full).unwrap());
            if tx.send(Ok(msg)).is_err() {}
            return; // spectators?
        }
        info!("[{}] Adding {} ({})", login.room, login.user, login.sess);
        room.stacks.push(vec![]); // WD
        room.players.push(player::Player {
            name: login.user.clone(),
            sess: login.sess.clone(),
            conn: Some(tx),
        });
        room.sync().await;
    }

    // Read from the websocket, update room state, broadcast updates
    while let Some(Ok(msg)) = user_ws_rx.next().await {
        let cmd: room::Command = match msg.is_text() {
            true => serde_json::from_str(msg.to_str().unwrap()).unwrap(),
            false => break,
        };
        {
            let mut room = locked_room.write().await;
            room.command(&login, &cmd);
            room.sync().await;
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
        if room.players.is_empty() {
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
        if room.phase != room::Phase::GameOver {
            room.sync().await;
        }
    }
}
