const socket = io.connect("/",{reconnection: false});
let matchKey = null;

function registerUser(name){
    //start loading screen
    loader.startLoading();

    socket.emit("register",{name});
}

socket.on("connect",reason=>{
    loader.stopLoading();
    console.log("connected");
})

socket.on("registered",(data)=>{
    document.querySelector(".myId").innerText = `My Id: ${data.uid}`;
    rightScreen.loadScreen(1);
    //end loading screen
    loader.stopLoading();
});

function sendRequest(id){
    //start loading screen
    loader.startLoading(reqHandler.reqTime + 1);
    console.log("req sent for", id);
    socket.emit("request",{id});
}

socket.on("request",data=>{
    notification.clear();
    notification.show(`${data.name} sent request (see requests)`, true, 3);
    reqHandler.addReq(data.name,data.id);
    if(reqHandler.getReqNumber() > 1) return;
    setTimeout(()=>scroller.scroll(innerHeight),500);
});

socket.on("request_rejected",data=>{
    notification.clear();
    notification.show(data.message, false, 4);
    //end loading screen
    loader.stopLoading();
    if(data.message) scroller.scroll(0);
});

function acceptRequest(id){
    if(!mainBox.isFilled()){
        notification.clear();
        notification.show("Please fill the box", false, 4);
        scroller.scroll(0);
        return;
    }
    //start loading screen
    loader.startLoading();
    socket.emit("request_accepted",{id});
    reqHandler.removeReq(id);
}

socket.on("start_game_first",(data)=>{
    mainBox.lock();
    notification.clear();
    notification.show("Match started with your turn", true);
    matchKey = data.key;
    scoreHandler.reset();
    leaveButton.hide();
    playAgainButton.hide();
    rightScreen.loadScreen(2);
    displayHandler.setActive(true);
    displayHandler.showOppName(data.name);
    displayHandler.myTurn(true);
    displayHandler.show();
    scroller.scroll(0);
    loader.stopLoading();
});

socket.on("start_game_second",(data)=>{
    mainBox.lock();
    notification.clear();
    notification.show("Match started with opponent's turn", true);
    matchKey = data.key;
    scoreHandler.reset();
    leaveButton.hide();
    playAgainButton.hide();
    rightScreen.loadScreen(2);
    displayHandler.setActive(true);
    displayHandler.showOppName(data.name);
    displayHandler.myTurn(false);
    displayHandler.show();
    scroller.scroll(0);
    loader.stopLoading();

});

socket.on("op_mark",data=>{
    notification.clear();
    notification.show(`opponent marked ${data.num}`, false);
    mainBox.mark(data.num);
    displayHandler.myTurn(true);
});

socket.on("win_confirm",()=>{
    notification.clear();
    notification.show("Congratulations! you won", true);
    scoreHandler.updateStatus(true);
    matchFinished();
    playAgainButton.show();
    setTimeout(()=>scroller.scroll(innerHeight),1000);
});

socket.on("opponent_win",()=>{
    scoreHandler.updateStatus(false);
    matchFinished();
    playAgainButton.show();
    setTimeout(()=>{
        notification.clear();
        if(scoreHandler.score >= 5)
            notification.show("almost! but opponent marked first");
        else
            notification.show("oops! opponent won");
    },500);
    setTimeout(()=>scroller.scroll(innerHeight),1000);
});

function matchFinished(){
    displayHandler.stopTimer();
    displayHandler.setActive(false);
    mainBox.stopListen();
    leaveButton.show();
    playAgainButton.hide();
}

socket.on("player_left",()=>{
    loader.stopLoading();
    notification.clear();
    notification.show("Player has left the match", false);
    matchFinished();
    setTimeout(()=>scroller.scroll(innerHeight),1000);
});

socket.on("game_ended",()=>{
    if(mainBox.locked){
        mainBox.unlock();
        resetBox();
    }
    scoreHandler.resetWins();
    displayHandler.hide(true);
    notification.clear();
    leaveButton.hide();
    playAgainButton.hide();
    rightScreen.loadScreen(1);
    loader.stopLoading();
});

socket.on("disconnect",reason=>{
    console.log(reason);
    notification.clear();
    notification.show("Connection lost, refresh the page", false);
    mainBox.stopListen();
    document.querySelector(".disconnect").classList.remove("hide");
});

function match(){
    if(!mainBox.isFilled()){
        notification.show("Please fill the box", false, 4);
        scroller.scroll(0);
        return;
    }
    loader.startLoading();
    loader.showCancel("cancle_auto_match");
    socket.emit("auto_match");
}

setInterval(()=>{
    socket.emit("ping");
},1000);