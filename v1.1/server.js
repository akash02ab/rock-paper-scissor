var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);
const { MongoClient } = require("mongodb");
const url = "mongodb+srv://admin:admin@cluster0.jjgzr.mongodb.net/rockpaperscissor?retryWrites=true&w=majority";
const client = new MongoClient(url, {useUnifiedTopology: true});

const run = async () => {
    try {
        await client.connect();
        console.log('Connected correctly to server');
    } 
    catch (err) {
        console.log(err.stack);
    }
}

run().catch(console.dir);;

stack = [];
leaderboard = {};

const sortLeaderboard = (leaderboard) => {
    const sortable = Object.entries(leaderboard)
     .sort(([,a],[,b]) => {
         if(a.points == b.points){
            return (a.wins + a.losses + a.draws) - (b.wins + b.losses + b.draws);
         }
         else{
             return b.points - a.points;
         }
     })
     .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

     return sortable;
}

const beautify = (leaderboard) => {
    let result = '';
    
    leaderboard = sortLeaderboard(leaderboard);

    for(let player in leaderboard){
        result += `${player}: ${leaderboard[player].points} points (${leaderboard[player].wins} wins, ${leaderboard[player].losses} losses, ${leaderboard[player].draws} draws)\n`;
    }

    return result;
}

const updateGameRecord = async (player1, player2, choice1, choice2, time) => {
    const db = client.db('rockpaperscissor');
    const col = db.collection('gameRecord');
    
    try{
        await col.insertOne({
            player_1: player1, 
            player_2: player2, 
            player_1_guess: choice1,
            player_2_guess: choice2,
            timestamp: time
        });
    }
    catch(err){
        console.log(err.stack);
    }
}

const updateLeaderBoard = async (leaderboard) => {
    const db = client.db('rockpaperscissor');
    const col = db.collection('leaderboard');
    
    try{
        col.countDocuments().then(count => {
            if(count == 0){
                col.insertOne(leaderboard);
            }
            else{
                col.replaceOne({}, leaderboard);
            }
        });
    }
    catch(err){
        console.log(err.stack);
    }
}

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

            const db = client.db('rockpaperscissor');

            db.collection('leaderboard').findOne({}, (err, docs) => {
                if (err){ 
                    console.log(err) 
                } 
                else{ 
                    if(docs){
                        leaderboard = docs;
                        delete leaderboard._id;
                    }
                    else{
                        leaderboard = {};
                    }
                    
                    if(!leaderboard.hasOwnProperty(player1)){
                        leaderboard[player1] = {
                            points: 0,
                            wins: 0,
                            losses: 0,
                            draws: 0
                        };
                    }
        
                    if(!leaderboard.hasOwnProperty(player2)){
                        leaderboard[player2] = {
                            points: 0,
                            wins: 0,
                            losses: 0,
                            draws: 0
                        };
                    }
        
                    if(choice1 == 'R'){
                        if(choice2 == 'R'){
                            leaderboard[player1].draws += 1;
                            leaderboard[player2].draws += 1;
                            io.to(player1).emit('result', `${player2} chose ${item[choice2]} - Draw\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            io.to(player2).emit('result', `${player1} chose ${item[choice1]} - Draw\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            
                        }
                        else if(choice2 == 'P'){
                            leaderboard[player1].points -= 1;
                            leaderboard[player2].points += 1;
                            leaderboard[player1].losses += 1;
                            leaderboard[player2].wins += 1;
                            io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Lose :(\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Won :)\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            status = `${player2} won`;
                        }
                        else if(choice2 == 'S'){
                            leaderboard[player1].points += 1;
                            leaderboard[player2].points -= 1;
                            leaderboard[player1].wins += 1;
                            leaderboard[player2].losses += 1;
                            io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Won :)\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Lose :(\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            status = `${player1} won`;
                        }
                    }
                    else if(choice1 == 'P'){
                        if(choice2 == 'P'){
                            leaderboard[player1].draws += 1;
                            leaderboard[player2].draws += 1;
                            io.to(player1).emit('result', `${player2} chose ${item[choice2]} - Draw\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            io.to(player2).emit('result', `${player1} chose ${item[choice1]} - Draw\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            
                        }
                        else if(choice2 == 'S'){
                            leaderboard[player1].points -= 1;
                            leaderboard[player2].points += 1;
                            leaderboard[player1].losses += 1;
                            leaderboard[player2].wins += 1;
                            io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Lose :(\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Won :)\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            status = `${player2} won`;
                        }
                        else if(choice2 == 'R'){
                            leaderboard[player1].points += 1;
                            leaderboard[player2].points -= 1;
                            leaderboard[player1].wins += 1;
                            leaderboard[player2].losses += 1;
                            io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Won :)\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Lose :(\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            status = `${player1} won`;
                        }
                    }
                    else if(choice1 == 'S'){
                        if(choice2 == 'S'){
                            leaderboard[player1].draws += 1;
                            leaderboard[player2].draws += 1;
                            io.to(player1).emit('result', `${player2} chose ${item[choice2]} - Draw\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            io.to(player2).emit('result', `${player1} chose ${item[choice1]} - Draw\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            
                        }
                        else if(choice2 == 'R'){
                            leaderboard[player1].points -= 1;
                            leaderboard[player2].points += 1;
                            leaderboard[player1].losses += 1;
                            leaderboard[player2].wins += 1;
                            io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Lose :(\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Won :)\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            status = `${player2} won`;
                        }
                        else if(choice2 == 'P'){
                            leaderboard[player1].points += 1;
                            leaderboard[player2].points -= 1;
                            leaderboard[player1].wins += 1;
                            leaderboard[player2].losses += 1;
                            io.to(player1).emit('result', `${player2} chose ${item[choice2]} - You Won :)\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            io.to(player2).emit('result', `${player1} chose ${item[choice1]} - You Lose :(\n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`);
                            status = `${player2} won`;
                        }
                    }
                   updateGameRecord(player1, player2, item[choice1], item[choice2], Date.now());
                   updateLeaderBoard(leaderboard);     
                }
            });
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});