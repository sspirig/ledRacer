"use strict";


// variable globale pour l'envoi et la réception de messages vers l'équipement bluetooth distant
var rx = null;
var tx = null;

// identifiant standardisé pour une communication texte (le nom de ce service est dénommé: Nordic UART)
const serviceUuid = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
let device = null;
let countRed = 0;
let countBlue = 0;
const testGameDiv = document.querySelector(".testGame");
const blueBtn = document.querySelector("#blueBtn");
const redBtn = document.querySelector("#redBtn");
const customCmdBtn = document.querySelector("#custom");
const toggleCmdBtn = document.querySelector("#toggle");
const initBtn = document.querySelector("#initBtn");
const listBtn = document.querySelector("#listBtn");
const connectBtn = document.querySelector("#connectBtn");
const info = document.querySelector("#info");
initBtn.addEventListener("click", e => {init();});
listBtn.addEventListener("click", e => {listServices();});
connectBtn.addEventListener("click", e => {connect();});
customCmdBtn.addEventListener("click", e => {
    let value = document.querySelector('#myCmdInput').value;
    sendCmd(value);
});
toggleCmdBtn.addEventListener("click", e => {
    sendCmd(e.target.id);
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
                info.innerHTML = countRed;
                break;
            default:
                break;
        }
        document.getElementById("status").innerHTML = message.split(":")[1];
    });


    document.getElementById("status").innerHTML = "Connexion RX/TX effectuée";
    EnableTestGame();
}

async function sendCmd(cmd) {
    const encoder = new TextEncoder();
    document.getElementById("status").innerHTML = `commande à envoyer: ${cmd}`;
    const cmdBytes = encoder.encode(cmd);
    await tx.writeValue(cmdBytes);
}

function EnableTestGame() {
    testGameDiv.style.display = "flex";
    redBtn.addEventListener("touchstart", sendMoveCmd);
    blueBtn.addEventListener("touchstart", sendMoveCmd);
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

function Move(which, pos) {

    if (which == "red") {
        redRoad.innerHTML = redRoad.innerHTML+'<div id="red" class="roadLed"></div>';
        if (parseInt(pos) == 120) {
            info.style.color = "crimson";
            info.innerHTML = "Le joueur rouge a gagné";
            return;
        }
    }
    else {
        blueRoad.innerHTML = blueRoad.innerHTML+'<div id="blue" class="roadLed"></div>';
        if (parseInt(pos) == 120) {
            info.style.color = "dodgerblue";
            info.innerHTML = "Le joueur bleu a gagné";
            return;
        }
    }


}