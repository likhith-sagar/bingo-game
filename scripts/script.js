class Num{
    constructor(num, element){
        this.num = num;
        this.element = element;
        this.marked = false;
    }
    setMark(){
        if(this.marked == true) return false;
        this.marked = true;
        this.element.classList.add("marked");
        return true;
    }
}

class MainBox{
    constructor(htmlObject){
        this.box = htmlObject;
        this.resetBox();
        this.locked = false;
        this.listening = false;
        this.callback = null;
        this.count = 0;
        this.randomizeInterval = null;
        this.resetBox();
        this.box.addEventListener("click",e=>{
            if(!this.listening) return;
            if(e.target.classList.contains("numbox")){
                let num = e.target.dataset.num;
                if(this.mark(num)){
                    this.callback({num});
                }
            }
        });
    }
    addNumber(num){
        if(this.j >= 5){
            this.j = 0;
            this.i++;
        }
        if(this.i >= 5){
            return;
        }
        this.count++;
        let html = document.createElement("div");
        html.classList.add("numbox");
        html.innerText = num;
        this.box.append(html);
        html.dataset.i = this.i;
        html.dataset.j = this.j;
        html.dataset.num = num;
        this.numbers[this.i][this.j] = new Num(num, html);
        this.numPos[String(num)] = {i: this.i, j: this.j};
        this.j++;
    }
    resetBox(){
        this.numPos = new Object();
        this.count = 0;
        clearInterval(this.randomizeInterval);
        this.randomizeInterval = null;
        this.box.innerHTML = '';
        this.numbers = new Array();
        for(let i=0;i<5;i++){
            this.numbers[i] = new Array();
        }
        this.i = 0;
        this.j = 0;
    }
    randomFill(){
        if(this.locked) return;
        if(this.randomizeInterval) return;
        this.resetBox();
        let temp = new Array();
        for(let i=1; i<=25; i++){
            temp.push(i);
        }
        temp = temp.sort((a,b)=>{
            if(Math.random() <0.50)
            return -1;
            else return 1;
        });
        // while(temp.length){
        //     this.addNumber(temp.pop());
        // }
        this.randomizeInterval = setInterval(()=>{
            if(!temp.length){
                clearInterval(this.randomizeInterval);
                this.randomizeInterval = null;
            }
            this.addNumber(temp.pop());
        }, 100);
    }
    lock(){
        this.locked = true;
    }
    unlock(){
        this.locked = false;
    }
    startListen(callback){
        this.callback = callback;
        this.listening = true;
    }
    stopListen(){
        this.listening = false;
    }
    mark(num){
        let res =  this.numbers[this.numPos[String(num)].i][this.numPos[String(num)].j].setMark();
        scoreHandler.updateScore();
        return res;
    }
    isFilled(){
        return this.count == 25;
    }
    makeRandomChoice(){
        if(!this.listening) return;
        let vals = Object.values(this.numPos).filter(data=>{
            if(this.numbers[data.i][data.j].marked != true){
                return true;
            }
            return false;
        });
        let val = vals.find(a=>Math.round(Math.random()));
        if(!val) val = vals.pop();
        this.mark(this.numbers[val.i][val.j].num);
        return this.numbers[val.i][val.j].num;
    }
}


class CreateRef{
    constructor(htmlObject, callback){
        this.box = htmlObject;
        for(let i=1;i<=25;i++){
            this.addNumber(i);
        }
        this.setListener(callback);
    }
    addNumber(num){
        let html = document.createElement("div");
        html.classList.add("refnumbox");
        html.innerText = num;
        this.box.append(html);
    }
    setListener(callback){
        this.box.addEventListener("click",e=>{
            if(e.target.classList.contains("refnumbox")){
                callback(Number(e.target.innerText));
                e.target.remove();
            }
        });
    }
    clearBox(){
        this.box.innerHTML = '';
    }
    fillBox(){
        this.clearBox();
        for(let i=1;i<=25;i++){
            this.addNumber(i);
        }
    }
}

class RightScreen{
    constructor(htmlObject){
        this.box = htmlObject;
        this.currentScreen = 0;
    }
    loadScreen(num){
        if(num < 0) return;
        this.hideCurrentScreen();
        document.querySelector(`#screen${num}`).classList.remove("hide");
        this.currentScreen = num;
    }
    hideCurrentScreen(){
        document.querySelector(`#screen${this.currentScreen}`).classList.add("hide");
    }
}

function autoFill(){
    mainBox.randomFill();
    refBox.clearBox();
}

function resetBox(){
    if(mainBox.locked) return;
    mainBox.resetBox();
    refBox.fillBox();
}


let mainBox = new MainBox(document.querySelector(".box"));
let refBox = new CreateRef(document.querySelector(".refbox .nums"),num=>mainBox.addNumber(num));
let rightScreen = new RightScreen(document.querySelector(".right"));

rightScreen.loadScreen(0);

let playform = document.querySelector(".playform");
playform.addEventListener("submit",e=>{
    e.preventDefault();
    let name = playform.name.value.trim();
    if(name.length > 12){
        name = name.substr(0,12);
    }
    if(name){
        registerUser(name);
        playform.reset();
        document.querySelector(".myName").innerText = `logged in as ${name}`;
    }
});

let joinform = document.querySelector(".joinform");
joinform.addEventListener("submit",e=>{
    e.preventDefault();
    let joinId = joinform.joinId.value.trim();
    if(!mainBox.isFilled()){
        notification.clear();
        notification.show("Please fill the box", false, 4);
        scroller.scroll(0);
        return;
    }
    if(joinId){
        sendRequest(joinId);
    }
});

class Scroller{
    constructor(){
        this.isScrolling = false;
        this.interval = null;
    }
    scroll(pos){
        if(this.isScrolling) return;
        if(Math.abs(pos - window.scrollY) < 30) return;
        this.isScrolling = true;
        let start = window.scrollY;
        let delta = (pos - window.scrollY) / Math.abs(pos - window.scrollY) * 6;
        this.interval = setInterval(()=>{
            window.scroll(0,start);
            start+=delta;
            if(Math.abs(pos - start) < 8){
                this.isScrolling = false;
                clearInterval(this.interval);
            }
        },1);
    }
}
const scroller = new Scroller();