const express = require("express");
const socket = require("socket.io");

const app = express();
const server = app.listen(process.env.PORT || "5400");
const io = socket(server);

const resourcesPrefix = process.env.DEV ? "" : "generated/";

app.use("/", express.static("public"));
app.use("/scripts", express.static(resourcesPrefix + "scripts"));
app.use("/styles", express.static(resourcesPrefix + "styles"));

let connections = 0;

class Users {
  constructor() {
    this.users = new Object();
    this.idle = new Object();
    this.matches = new Object();
    this.turn = new Object();
    this.runningMatches = new Object();
    this.registry = new Object();
    this.userIds = new Object();
    this.queue = new Array();
    this.autoMatch = new Object();
    this.playAgains = new Object();
  }
  addUser(id, name) {
    this.users[id] = name;
  }
  removeUser(id) {
    delete this.users[id];
    delete this.idle[id];
    delete this.turn[id];
    delete this.autoMatch[id];
    this.clearMatch(id);
    this.removeMatch(id);
    this.removeUserId(id);
    this.clearPlayAgain(id);
  }
  setIdle(id, status) {
    if (status) {
      this.idle[id] = true;
      delete this.turn[id];
    } else delete this.idle[id];
  }
  isIdle(id) {
    return this.idle[id];
  }
  isExist(id) {
    return this.users[id];
  }
  getUsername(id) {
    return this.users[id];
  }
  createMatch(id1, id2) {
    this.matches[id1] = id2;
    this.matches[id2] = id1;
  }
  getMatch(id) {
    return this.matches[id];
  }
  removeMatch(id) {
    delete this.matches[this.matches[id]];
    delete this.matches[id];
  }
  setTurn(id) {
    this.turn[id] = true;
  }
  isTurn(id) {
    return this.turn[id];
  }
  changeTurn(id) {
    delete this.turn[id];
    this.turn[this.getMatch(id)] = true;
  }
  runMatch(id) {
    let matchId = String(Math.round(Math.random() * 1000));
    this.runningMatches[id] = matchId;
    this.runningMatches[this.getMatch(id)] = matchId;
    return matchId;
  }
  endMatch(id, matchId) {
    if (this.runningMatches[id] && this.runningMatches[id] == matchId) {
      delete this.runningMatches[id];
      delete this.runningMatches[this.getMatch(id)];
      return true;
    }
    return false;
  }
  clearMatch(id) {
    delete this.runningMatches[id];
    delete this.runningMatches[this.getMatch(id)];
  }
  createUserId(id) {
    let uid = String(
      id[0] + id[3] + Math.round(Math.random() * 10000)
    ).toUpperCase();
    this.registry[uid] = id;
    this.userIds[id] = uid;
    return uid;
  }
  removeUserId(id) {
    delete this.registry[this.userIds[id]];
    delete this.userIds[id];
  }
  getId(uid) {
    return this.registry[uid];
  }
  getAutoMatch(myId) {
    let id;
    while (true) {
      id = this.queue.pop();
      if (id) {
        if (this.autoMatch[id]) {
          delete this.autoMatch[id];
          return id;
        }
      } else {
        this.queue.unshift(myId);
        this.autoMatch[myId] = true;
        return false;
      }
    }
  }
  removeAutoMatch(myId) {
    delete this.autoMatch[myId];
  }
  setPlayAgain(id) {
    this.playAgains[id] = true;
  }
  getPlayAgain(id) {
    return this.playAgains[id];
  }
  clearPlayAgain(id) {
    delete this.playAgains[id];
  }
}
const users = new Users();

console.log("All set..@", process.env.PORT || "5400");

io.on("connection", (socket) => {
  connections++;
  console.log("connected ", socket.id);
  console.log("connections ", connections);

  //socket connection related stuffs
  socket.on("register", (data) => {
    users.addUser(socket.id, data.name);
    users.setIdle(socket.id, true);
    let uid = users.createUserId(socket.id);
    socket.emit("registered", { uid });
  });

  socket.on("request", (data) => {
    data.id = users.getId(data.id);
    if (data.id && users.isExist(data.id)) {
      if (users.isIdle(data.id)) {
        socket.broadcast.to(data.id).emit("request", {
          name: users.getUsername(socket.id),
          id: socket.id,
        });
      } else {
        socket.emit("request_rejected", { message: "user is in a match" });
      }
    } else {
      socket.emit("request_rejected", { message: "user doesn't exists" });
    }
  });

  socket.on("request_accepted", (data) => {
    startMatch(socket, data);
  });

  socket.on("auto_match", () => {
    let id = users.getAutoMatch(socket.id);
    if (!id) return;
    startMatch(socket, { id });
  });

  socket.on("cancle_auto_match", () => {
    users.removeAutoMatch(socket.id);
    socket.emit("request_rejected", { message: "" });
  });

  socket.on("end_game", () => {
    users.setIdle(socket.id, true);
    let matchedId = users.getMatch(socket.id);
    if (matchedId) {
      users.removeMatch(socket.id);
      users.clearPlayAgain(socket.id);
      users.clearPlayAgain(matchedId);
      socket.broadcast.to(matchedId).emit("player_left");
    }
    socket.emit("game_ended");
  });

  //game related

  socket.on("mark", (data) => {
    if (!users.isTurn(socket.id)) return;
    users.changeTurn(socket.id);
    socket.broadcast.to(users.getMatch(socket.id)).emit("op_mark", data);
  });

  socket.on("claim_win", (data) => {
    if (users.endMatch(socket.id, data.key)) {
      socket.emit("win_confirm");
      socket.broadcast.to(users.getMatch(socket.id)).emit("opponent_win");
    }
  });

  socket.on("play_again", (data) => {
    let matchedId = users.getMatch(socket.id);
    if (!matchedId) {
      socket.emit("player_left");
      return;
    }
    if (users.getPlayAgain(matchedId)) {
      users.clearPlayAgain(matchedId);
      //start match between them
      startMatchAgain(socket, { id: matchedId });
    } else {
      users.setPlayAgain(socket.id);
    }
  });

  socket.on("cancel_play_again", (data) => {
    users.clearPlayAgain(socket.id);
    socket.emit("request_rejected", { message: "" });
  });

  socket.on("disconnect", (data) => {
    connections--;
    console.log("Disconnected ", socket.id);
    console.log("Connections ", connections);
    let matchedId = users.getMatch(socket.id);
    if (matchedId) {
      socket.broadcast.to(matchedId).emit("player_left");
    }
    users.removeUser(socket.id);
  });
});

function startMatch(socket, data) {
  if (users.isIdle(data.id)) {
    //create a match
    users.createMatch(socket.id, data.id);
    users.setIdle(socket.id, false);
    users.setIdle(data.id, false);
    let key = users.runMatch(socket.id);
    if (Math.random() > 0.5) {
      users.setTurn(socket.id);
      socket.emit("start_game_first", {
        key,
        name: users.getUsername(data.id),
      });
      socket.broadcast
        .to(data.id)
        .emit("start_game_second", { key, name: users.getUsername(socket.id) });
    } else {
      users.setTurn(data.id);
      socket.emit("start_game_second", {
        key,
        name: users.getUsername(data.id),
      });
      socket.broadcast
        .to(data.id)
        .emit("start_game_first", { key, name: users.getUsername(socket.id) });
    }
  } else {
    socket.emit("request_rejected", { message: "user disconnected" });
  }
}

function startMatchAgain(socket, data) {
  if (users.isExist(data.id)) {
    let key = users.runMatch(socket.id);
    if (Math.random() > 0.5) {
      users.setTurn(socket.id);
      socket.emit("start_game_first", {
        key,
        name: users.getUsername(data.id),
      });
      socket.broadcast
        .to(data.id)
        .emit("start_game_second", { key, name: users.getUsername(socket.id) });
    } else {
      users.setTurn(data.id);
      socket.emit("start_game_second", {
        key,
        name: users.getUsername(data.id),
      });
      socket.broadcast
        .to(data.id)
        .emit("start_game_first", { key, name: users.getUsername(socket.id) });
    }
  } else {
    socket.emit("request_rejected", { message: "user disconnected" });
  }
}
