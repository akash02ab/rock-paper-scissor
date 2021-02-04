var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var firebase = require("firebase/app");
require('firebase/auth');
require('firebase/database');

var firebaseConfig = {
    apiKey: "AIzaSyCyKSdfPfG70umxQTxxfjTWa7GvsFZh2mA",
    authDomain: "rockpaperscissor-10d04.firebaseapp.com",
    projectId: "rockpaperscissor-10d04",
    storageBucket: "rockpaperscissor-10d04.appspot.com",
    messagingSenderId: "252668110518",
    appId: "1:252668110518:web:ab6986a56fe63a1041e817",
    measurementId: "G-VGK3Z4C4FY"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

let count = 1;

const writeUserData = (player1, choice1, player2, choice2, status) => {
    firebase.database().ref(`game${count++}`).set({
      player1: player1,
      choice1: choice1,
      player2: player2,
      choice2: choice2,
      status: status 
    });
}

stack = [];

io.on('connection', (socket) => {
    console.log('a user connected');
    
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    
    const isEmpty = (stack) => stack.length == 0;

    socket.on('gameOn', (info) => {
        socket.join(info.name);
        
        if(isEmpty(stack)){
            stack.push(info);
        }
        else{
            const {name: player1, choice: choice1} = stack.pop();
            const {name: player2, choice: choice2} = info;
            const item = {R: 'rock', P: 'paper', S: 'scissor'};
            let status = 'Draw';

            if(choice1 == 'R'){
                if(choice2 == 'R'){
                    console.log(socket.rooms)
                    io.to(player1).emit('result', `${player2} chose ${item[choice2]} - Draw`);
                    io.to(player2).emit('result', `${player1} chose ${item[choice1]} - Draw`);
                }
                else if(choice2 == 'P'){
                    io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Lose :(`);
                    io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Won :)`);
                    status = `${player2} won`;
                }
                else if(choice2 == 'S'){
                    io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Won :)`);
                    io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Lose :(`);
                    status = `${player1} won`;
                }
            }
            else if(choice1 == 'P'){
                if(choice2 == 'P'){
                    console.log(socket.rooms)
                    io.to(player1).emit('result', `${player2} chose ${item[choice2]} - Draw`);
                    io.to(player2).emit('result', `${player1} chose ${item[choice1]} - Draw`);
                }
                else if(choice2 == 'S'){
                    io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Lose :(`);
                    io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Won :)`);
                    status = `${player2} won`;
                }
                else if(choice2 == 'R'){
                    io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Won :)`);
                    io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Lose :(`);
                    status = `${player1} won`;
                }
            }
            else if(choice1 == 'S'){
                if(choice2 == 'S'){
                    console.log(socket.rooms)
                    io.to(player1).emit('result', `${player2} chose ${item[choice2]} - Draw`);
                    io.to(player2).emit('result', `${player1} chose ${item[choice1]} - Draw`);
                }
                else if(choice2 == 'R'){
                    io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Lose :(`);
                    io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Won :)`);
                    status = `${player2} won`;
                }
                else if(choice2 == 'P'){
                    io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Won :)`);
                    io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Lose :(`);
                    status = `${player2} won`;
                }
            }
            writeUserData(player1, item[choice1], player2, item[choice2], status);
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});