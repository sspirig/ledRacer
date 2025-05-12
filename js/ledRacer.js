"use strict";
/**
 * Projet: ledRacer
 * Fichier: fichier javascript
 * Auteur: Santiago Spirig
 * Date: 12.05.2025
 */

// variable globale pour l'envoi et la réception de messages vers l'équipement bluetooth distant
var rx = null;
var tx = null;

// identifiant standardisé pour une communication texte (le nom de ce service est dénommé: Nordic UART)
const serviceUuid = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
let device = null;
let countRed = 0;
let countBlue = 0;
const body = document.querySelector("body");
const GameButtonsDiv = document.querySelector(".gameButtons");
const blueBtn = document.querySelector("#blueBtn");
const redBtn = document.querySelector("#redBtn");
const toggleCmdBtn = document.querySelector("#toggle");
const initBtn = document.querySelector("#initBtn");
const connectBtn = document.querySelector("#connectBtn");
const info = document.querySelector("#info");
const raceBox = document.querySelector(".raceBox");
let timerIntervalId = "";
let isRaceFinished = false;
let sec;
let redName = "";
let blueName = "";
initBtn.addEventListener("click", e => {init();});
connectBtn.addEventListener("click", e => {connect();});
toggleCmdBtn.addEventListener("click", e => {
    console.log("displayed as", GameButtonsDiv.style.display);
    if (GameButtonsDiv.style.display == "none") {
        GameButtonsDiv.style.display = "flex";



        raceBox.querySelector("#red").innerHTML = "";
        raceBox.querySelector("#blue").innerHTML = "";
        info.innerHTML = "";
        body.style.backgroundColor = "rgb(255, 255, 255)";
        redBtn.addEventListener("touchstart", sendMoveCmd);
        blueBtn.addEventListener("touchstart", sendMoveCmd);
        StartRace();
    }
    sendCmd(e.target.id);
    ShowStartRaceBtnToggle();
    console.log("displayed now as", GameButtonsDiv.style.display);
});

const redRoad = document.querySelector(".road#red");
const blueRoad = document.querySelector(".road#blue");

async function init() {

    if (!('bluetooth' in navigator)) {
        alert("Support bluetooth non disponible, veuillez activer le mode expérimental")
        return;
    }

    //device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true });
    device = await navigator.bluetooth.requestDevice({ filters: [{ services: [serviceUuid] }] });
    let msg = `device.name=${device.name}`;
    document.getElementById("status").innerHTML = msg;
    console.log(msg);
}

async function listServices() {
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    // récupération des identifiants de services disponibles sous forme de tableau
    const uuids = services.map(service => service.uuid);

    let msg = `Available UUIDs:${uuids}`;
    document.getElementById("status").innerHTML = msg;
    console.log(msg);
}

async function connect() {
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(serviceUuid);
    tx = await service.getCharacteristic('6e400002-b5a3-f393-e0a9-e50e24dcca9e');

    rx = await service.getCharacteristic('6e400003-b5a3-f393-e0a9-e50e24dcca9e');
    // on écoute les notification de l'équipement bluetooth distant
    await rx.startNotifications();

    // on s'abonne au changement d'état de l'objet rx recevant les message de l'équipement BT distant
    // et on les affiche.
    rx.addEventListener('characteristicvaluechanged', event => {
        const receivedValue = event.target.value;
        const message = new TextDecoder().decode(receivedValue);
        console.log('Received message:', message);
        switch (message.split(":")[0]) {
            case "moveRed":
                countRed = parseInt(message.split(":")[1]);
                Move("red", message.split(":")[1]);
                break;
            case "moveBlue":
                countBlue = parseInt(message.split(":")[1]);
                Move("blue", message.split(":")[1]);
                break;
            case "count":
                countRed += 1;
                //info.innerHTML = countRed;
                break;
            default:
                break;
        }
        // document.getElementById("status").innerHTML = message.split(":")[1];
    });

    redName = prompt("Insérer le nom du joueur rouge :", "red");
    blueName = prompt("Insérer le nom du joueur bleu :", "blue");
    if (redName == "") redName = "red";
    if (blueName == "") blueName = "blue";
    initBtn.style.display = "none";
    connectBtn.style.display = "none";
    document.getElementById("status").innerHTML = "Connexion RX/TX effectuée";
    sendCmd("toggle");
    ShowStartRaceBtnToggle();
}

async function sendCmd(cmd) {
    const encoder = new TextEncoder();
    // document.getElementById("status").innerHTML = `commande à envoyer: ${cmd}`;
    const cmdBytes = encoder.encode(cmd);
    await tx.writeValue(cmdBytes);
}

function StartRace() {

    sec = 0;
    isRaceFinished = false;
    timerIntervalId = setInterval( ms => {

            sec += 1;
            document.getElementById("status").innerHTML = sec+"s";
    }, 1000);
    
}

function sendMoveCmd(event) {
    switch (event.target.id) {
        case "redBtn":
            sendCmd("moveRed 1");
            break;
        case "blueBtn":
            sendCmd("moveBlue 1");
            break;
        default:
            break;
    }
}

function ShowStartRaceBtnToggle() {
    if (toggleCmdBtn.style.display == "none"){
        toggleCmdBtn.style.display = "flex";
    }
    else {
        toggleCmdBtn.style.display = "none";
    }
    
    
}

function RegisterTime(name, sec) {
    if (localStorage.getItem("ledRacer_scoreboard")[name] != undefined) {
        if (parseInt(localStorage.getItem("ledRacer_scoreboard")[name]) < sec) {

            let scoreboard = localStorage.getItem("ledRacer_scoreboard");
            scoreboard[name] = sec;
            localStorage.setItem("ledRacer_scoreboard", scoreboard);
        }
    }
    else {
        let scoreboard = localStorage.getItem("ledRacer_scoreboard");
        scoreboard[name] = sec;
        localStorage.setItem("ledRacer_scoreboard", scoreboard);
    }
}

function Move(which, pos) {

    if (which == "red") {
        redRoad.innerHTML = redRoad.innerHTML+'<div id="red" class="roadLed"></div>';
        if (parseInt(pos) == 120) {
            GameButtonsDiv.style.display = "none";
            info.style.color = "crimson";
            body.style.backgroundColor = "rgb(255, 174, 191)";
            info.innerHTML = "Le joueur rouge ("+redName+") a gagné en "+sec+" secondes";
            RegisterTime(redName, sec);

            sendCmd("finishRace red");
            clearInterval(timerIntervalId);
            ShowStartRaceBtnToggle();
            return;
        }
    }
    else {
        blueRoad.innerHTML = blueRoad.innerHTML+'<div id="blue" class="roadLed"></div>';
        if (parseInt(pos) == 120) {
            GameButtonsDiv.style.display = "none";
            info.style.color = "dodgerblue";
            body.style.backgroundColor = "rgb(170, 213, 255)";
            info.innerHTML = "Le joueur bleu ("+blueName+") a gagné en "+sec+" secondes";
            RegisterTime(blueName, sec);

            sendCmd("finishRace blue");
            clearInterval(timerIntervalId);
            ShowStartRaceBtnToggle();
            return;
        }
    }


}