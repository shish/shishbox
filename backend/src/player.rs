use serde::{Deserialize, Serialize};
use tokio::sync::{mpsc};
use warp::ws::{Message};

use crate::room;

/// Our state of currently connected users.
#[derive(Serialize, Deserialize)]
pub struct Player {
    pub name: String,
    #[serde(skip)]
    pub sess: String,
    #[serde(skip)]
    pub conn: Option<mpsc::UnboundedSender<std::result::Result<Message, warp::Error>>>,
}

impl Player {
    pub fn send(&self, data: &room::Room) {
        // TODO: Broadcast a diff?
        let msg = Message::text(serde_json::to_string(data).unwrap());
        if let Some(conn) = &self.conn {
            if conn.send(Ok(msg)).is_err() {
                // The tx is disconnected, our `user_disconnected` code
                // should be happening in another task, nothing more to
                // do here.
            }
        }

    }
}

