class Req{
constructor(element, interval){
        this.element = element;
        this.interval = interval;
    }
}

class ReqHandler{
    constructor(box){
        this.box = box;
        this.reqs = new Object();
        this.reqTime = 6;
    }
    addReq(name,id){
        if(this.reqs[id]) return;
        id = String(id);
        let time = this.reqTime;
        let html = `<div class="msg">${name} wants to play</div>
        <button class="yes" onclick="acceptRequest('${id}')" >yes</button>
        <button class="no" onclick="reqHandler.removeReq('${id}')" >no (${time})</button>`;
        let element = document.createElement("div");
        element.classList.add("req");
        element.innerHTML = html;
        element.id = id;
        this.box.append(element);
        time--;
        let interval = setInterval(()=>{
            element.querySelector(".no").innerText = `no (${time})`;
            if(time <= 0){
                this.removeReq(id);
            }
            time--;
        },1000);
        this.reqs[id] = new Req(element, interval);
    }
    removeReq(id){
        id = String(id);
        clearInterval(this.reqs[id].interval);
        this.reqs[id].element.remove();
        delete this.reqs[id];
    }
    getReqNumber(){
        return Object.keys(this.reqs).length;
    }
}

class Loading{
    constructor(box){
        this.box = box;
        this.loading = false;
        this.timeout = null;
        this.event = null;
    }
    startLoading(sec){
        if(this.loading) return;
        this.loading = true;
        this.box.classList.remove("hide");
        if(!sec) return;
        this.timeout = setTimeout(()=>{
            this.stopLoading();
        },sec*1000);
    }
    stopLoading(){
        this.loading = false;
        clearTimeout(this.timeout);
        this.box.classList.add("hide");
        this.box.querySelector(".cancel").classList.add("hide");
    }
    showCancel(event){
        this.event = event;
        this.box.querySelector(".cancel").classList.remove("hide");
    }
    onClick(){
        if(!this.event) return;
        socket.emit(this.event);
        this.box.querySelector(".cancel").classList.add("hide");
    }
}

class NotificationHandler{
    constructor(htmlObject){
        this.box = htmlObject;
        this.showing = false;
        this.timeout = null;
    }
    show(msg, bool, sec){
        if(this.showing) return;
        this.showing = true;
        if(bool){
            this.box.classList.remove("errmsg");
            this.box.classList.add("sucmsg");
        } else {
            this.box.classList.remove("sucmsg");
            this.box.classList.add("errmsg");
        }
        this.box.innerText = msg;
        if(!sec) return;
        this.timeout = setTimeout(()=>{
            this.clear();
        },sec*1000);
    }
    clear(){
        this.showing = false;
        clearTimeout(this.timeout);
        this.box.innerText = "";
    }
}

class DisplayHandler{
    constructor(box){
        this.box = box;
        this.turn = box.querySelector(".turn");
        this.timer = box.querySelector(".timer");
        this.time = 20;
        this.isTimerRunning = false;
        this.interval = null;
    }
    show(){
        this.box.classList.remove("hide");
    }
    hide(bool){
        this.box.classList.add("hide");
        if(bool)
        document.querySelector(".opponentName").innerText = "";
    }
    showOppName(name){
        document.querySelector(".opponentName").innerText = `Playing with ${name}`;
    }
    myTurn(yes){
        if(!this.active) return;
        if(yes){
            this.turn.innerText = "Your Turn";
            mainBox.startListen((data)=>{
                notification.clear();
                notification.show(`you marked ${data.num}`, true);
                socket.emit("mark",data);
                mainBox.stopListen();
                displayHandler.myTurn(false);
            });
            this.stopTimer();
            this.startTimer(()=>{
                let num = mainBox.makeRandomChoice();
                this.myTurn(false);
                notification.clear();
                notification.show(`you marked ${num}`, true);
                socket.emit("mark",{num});
                mainBox.stopListen();
            });
        } else {
            this.turn.innerText = "waiting..";
            this.stopTimer();
            this.startTimer();
        }
    }
    startTimer(callback){
        if(!this.active) return;
        if(this.isTimerRunning) return;
        this.isTimerRunning = true;
        let time = this.time;
        this.timer.innerText = `${time} sec`;
        this.interval = setInterval(()=>{
            time--;
            this.timer.innerText = `${time} sec`;
            if(time<=0){
                this.stopTimer();
                if(callback) callback();
            }
        },1000);
    }
    stopTimer(){
        this.isTimerRunning = false;
        clearInterval(this.interval);
    }
    setActive(bool){
        if(bool) this.active = true;
        else this.active = false;
    }
}

class ScoreHandler{
    constructor(box, winbox){
        this.score = 0;
        this.box = box;
        this.reset();
        this.myWins = 0;
        this.oppWins = 0;
        this.winBox = winbox;
        this.resetWins();
    }
    reset(){
        this.score = 0;
        this.box.querySelector(".score").innerText = this.score;
        this.box.querySelector(".gamestatus").classList.add("unvisible");
        Array.from(this.box.querySelector(".bingo").children).forEach(ele=>ele.classList.remove("mark"));
    }
    updateScore(){
        this.score = 0;
        let status;

        //checking for all rows
        for(let i=0; i<5; i++){
            status = true;
            for(let j=0; j<5; j++){
                if(!mainBox.numbers[i][j].marked){
                    status = false;
                    break;
                }
            }
            if(status) this.score++;
        }
        //checking for all columns
        for(let i=0; i<5; i++){
            status = true;
            for(let j=0; j<5; j++){
                if(!mainBox.numbers[j][i].marked){
                    status = false;
                    break;
                }
            }
            if(status) this.score++;
        }
        //checking for bl-tr diagonal
        status = true;
        for(let i=0; i<5; i++){
            if(!mainBox.numbers[i][4-i].marked){
                status = false;
                break;
            }
        }
        if(status) this.score++;

        //checking for tl-br diagonal
        status = true;
        for(let i=0; i<5; i++){
            if(!mainBox.numbers[i][i].marked){
                status = false;
                break;
            }
        }
        if(status) this.score++;
        if(this.score > 5) this.score = 5;
        this.box.querySelector(".score").innerText = this.score;
        
        let letters = this.box.querySelector(".bingo").children;
        for(let i=0; i<this.score; i++){
            letters[i].classList.add("mark");
        }

        if(this.score >= 5){
            socket.emit("claim_win",{key: matchKey});
        }
    }
    updateStatus(status){
        if(status){
            this.box.querySelector(".gamestatus").innerHTML = "wow!<br>You Won";
            this.myWins++;
        }
        else{
            this.box.querySelector(".gamestatus").innerHTML = "oops!<br>You Lost";
            this.oppWins++;
        }
        this.updateWins();
        this.box.querySelector(".gamestatus").classList.remove("unvisible");
    }
    resetWins(){
        this.myWins = 0;
        this.oppWins = 0;
        this.updateWins();
    }
    updateWins(){
        this.winBox.querySelector(".you").innerText = this.myWins;
        this.winBox.querySelector(".opp").innerText = this.oppWins;
    }
}

class LeaveBtn{
    constructor(btn){
        this.btn = btn;
    }
    show(){
        this.btn.classList.remove("hide");
    }
    hide(){
        this.btn.classList.add("hide");
    }
    onClick(){
        loader.startLoading(10);
        socket.emit("end_game");
    }
}
class PlayAgainBtn{
    constructor(btn){
        this.btn = btn;
        this.status = false;
    }
    show(){
        this.btn.classList.remove("hide");
    }
    hide(){
        this.btn.classList.add("hide");
        this.status = false;
    }
    onClick(){
        if(this.status){
            if(!mainBox.isFilled()){
                notification.clear();
                notification.show("Fill box and click again", false, 3);
                scroller.scroll(0);
                return;
            }
            loader.startLoading();
            loader.showCancel("cancel_play_again");
            socket.emit("play_again");
        } else {
            displayHandler.hide();
            mainBox.resetBox();
            refBox.fillBox();
            mainBox.unlock();
            notification.clear();
            notification.show("Fill box and click again", false, 4);
            scroller.scroll(0);
            this.status = true;
        }
    }
}

const reqHandler = new ReqHandler(document.querySelector(".reqbox"));
const loader = new Loading(document.querySelector(".loader"));
const notification = new NotificationHandler(document.querySelector(".notification"));
const displayHandler = new DisplayHandler(document.querySelector(".displaybox"));
const scoreHandler = new ScoreHandler(document.querySelector("#screen2"), document.querySelector(".wins"));
const leaveButton = new LeaveBtn(document.querySelector(".leave"));
const playAgainButton = new PlayAgainBtn(document.querySelector(".playagain"));