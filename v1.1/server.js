const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const {MongoClient} = require('mongodb');
const url = 'mongodb+srv://admin:admin@cluster0.jjgzr.mongodb.net/rockpaperscissor?retryWrites=true&w=majority';
const client = new MongoClient(url, {useUnifiedTopology: true});

// connect to mongodb
const connectDB = async () => {
    try{
        await client.connect();
        console.log('Connected successfully to server');
    }
    catch(err){
        console.log(err.stack);
    }
}

connectDB().catch(console.dir);

// stack to keep track of players
stack = [];
// stores points, wins, losses, draws of each player
leaderboard = {};
// get name from abbrevation
const item = {R: 'rock', P: 'paper', S: 'scissor'};

const updateGameRecord = async (player1, player2, choice1, choice2, time) => {
    const db = client.db('rockpaperscissor');
    const col = db.collection('gameRecord');

    // insert game record into collection
    try{
        await col.insertOne({
            player1: player1,
            player2: player2,
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
            // if collection 'leaderboard' is empty insert a new document
            if(count == 0){
                col.insertOne(leaderboard);
            }
            // else replace the old document with new one (we want only one instance of leaderborad in our collection)
            else{
                col.replaceOne({}, leaderboard);
            }
        });
    }
    catch(err){
        console.log(err.stack);
    }
}

const sortLeaderboard = (leaderboard) => {
    const sortable = Object.entries(leaderboard).sort(([, a], [, b]) => {
        // if points are equal then player who played least game among two will appear first on leaderboard
        if(a.points == b.points){
            return (a.wins + a.losses + a.draws) - (b.wins + b.losses + b.draws);
        }
        // else sort by points, players who has most point will appear first on leaderboard
        else{
            return b.points - a.points;
        }
    }).reduce((r, [k, v]) => ({...r, [k]: v}), {});

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

const win = (player1, player2, choice, leaderboard) => {
    leaderboard[player1].points += 1;
    leaderboard[player1].wins += 1;

    return `${player2} chose ${item[choice]} - You Won :)
        \n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`;
}

const loose = (player1, player2, choice, leaderboard) => {
    leaderboard[player1].points -= 1;
    leaderboard[player1].losses += 1;

    return `${player2} chose ${item[choice]} - You Lose (:
        \n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`;
}

const draw = (player1, player2, choice, leaderboard) => {
    leaderboard[player1].draws += 1

    return `${player2} chose ${item[choice]} - Draw
        \n--------------Leaderboard--------------\n${beautify(leaderboard)}\n---------------------------------------`;
}

const createEntry = (leaderboard, player) => {
    if(!leaderboard.hasOwnProperty(player)){
        leaderboard[player] = {
            points: 0,
            wins: 0, 
            losses: 0, 
            draws: 0
        };
    }
}

io.on('connection', (socket) => {
    console.log('new player joined');

    socket.on('disconnect', () => {
        console.log('player disconnected');
    });

    const isEmpty = (stack) => stack.length == 0;

    // start playing the game
    socket.on('gameOn', (info) => {
        // add player name to socket
        socket.join(info.name);

        // is stack is empty add info to stack
        if(isEmpty(stack)){
            stack.push(info);
        }
        else{
            const {name: player1, choice: choice1} = stack.pop();
            const {name: player2, choice: choice2} = info;
            const db = client.db('rockpaperscissor');
            // get leaderboard from collection
            db.collection('leaderboard').findOne({}, (err, docs) => {
                if(err){
                    console.log(err);
                }
                else{
                    if(docs){
                        leaderboard = docs;
                        delete leaderboard._id;
                    }
                    else{
                        leaderboard = {};
                    }
                }

                // insert players info to leaderborad if not already present (when new player joined)
                createEntry(leaderboard, player1);
                createEntry(leaderboard, player2);

                let choice = choice1 + choice2;

                switch(choice){
                    case 'RS':
                    case 'PR':
                    case 'SP':
                    io.to(player1).emit('result', win(player1, player2, choice2, leaderboard));
                    io.to(player2).emit('result', loose(player2, player1, choice1, leaderboard));
                    break;

                    case 'RP':
                    case 'PS':
                    case 'SR':
                    io.to(player2).emit('result', win(player2, player1, choice1, leaderboard));
                    io.to(player1).emit('result', loose(player1, player2, choice2, leaderboard));
                    break;

                    case 'RR':
                    case 'PP':
                    case 'SS':
                    io.to(player1).emit('result', draw(player1, player2, choice2, leaderboard));
                    io.to(player2).emit('result', draw(player2, player1, choice1, leaderboard));
                    break;
                }
                
                // update game record collection
                updateGameRecord(player1, player2, item[choice1], item[choice2], Date.now());
                // update leaderboard collection
                updateLeaderBoard(leaderboard);  
            });
        }
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});