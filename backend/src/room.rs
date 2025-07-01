use crate::player;
use serde::{Deserialize, Serialize};

#[derive(PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Phase {
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
pub struct Room {
    pub public: bool,
    pub game: String,
    pub phase: Phase,
    pub players: Vec<player::Player>,
    pub stacks: Vec<Vec<(String, String)>>, // WD
}

#[derive(Deserialize, Default, Debug)]
pub struct Command {
    cmd: String,
    data: String,
}

impl Room {
    pub fn command(&mut self, login: &crate::LoginArgs, cmd: &Command) {
        match cmd.cmd.as_str() {
            "start" => {
                self.phase = Phase::Game;
            }
            "submit" => {
                // WD
                if let Some(pos) = self.players.iter().position(|x| *x.sess == login.sess) {
                    let players = self.stacks.len();
                    let round = self.stacks.iter().map(|s| s.len()).min().unwrap();
                    let my_stack = (pos + round) % players;
                    debug!("[{}] {} submitted {}", login.room, login.user, cmd.data);

                    let data_is_img = cmd.data.starts_with("data:");
                    let prev_is_img = match self.stacks[my_stack].len() {
                        0 => true,
                        _ => self.stacks[my_stack].last().unwrap().1.starts_with("data:"),
                    };
                    if prev_is_img == data_is_img {
                        warn!("[{}] {} ignoring dupe submission", login.room, login.user);
                    } else {
                        self.stacks[my_stack].push((login.user.clone(), cmd.data.clone()));

                        let round = self.stacks.iter().map(|s| s.len()).min().unwrap();
                        if round == players {
                            self.phase = Phase::GameOver;
                        }
                    }
                }
            }
            _ => {
                error!(
                    "[{}] Unrecognised message from {}: {:?}",
                    login.room, login.user, cmd
                );
            }
        }
    }

    pub async fn sync(&self) {
        // Something happened. Serialize the current room state and
        // broadcast it to everybody in the room.
        for player in self.players.iter() {
            player.send(self);
        }
    }
}
