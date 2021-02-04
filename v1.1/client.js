const io = require("socket.io-client");
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin,  output: process.stdout });

rl.question('What\'s your name ? ', (name) => {
    const socket = io('http://localhost:3000');

    const getPrompt = (choice) => {
        switch(choice){
            case 'R': return 'You chose rock';
            case 'P': return 'You chose paper';
            case 'S': return 'You chose scissor';
            default : return 'Enter the correct option';
        }
    }

    const playGame = () => {
        rl.question('(R)ock, (P)aper or (S)cissors ? ', (choice) => {
            console.log(getPrompt(choice));
            socket.emit('gameOn', {name: name, choice: choice});
            console.log('Waiting for response');
            setTimeout(() => {
                playGame();
            }, 8000);
        });
    }

    socket.on('connect', () => {
        console.log('Successfully connected to server.');
        playGame();
    });

    socket.on('disconnect', () => {
        console.log('Connection lost...')
    });
    
    socket.on('result', (message) => {
        console.log(message); 
    });

});