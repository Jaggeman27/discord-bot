const Discord = require('discord.js');
const {
    prefix,
    token,
} = require('./config.json');
const ytdl = require('ytdl-core');

const client = new Discord.Client();

var Spotify = require('node-spotify-api');
 
var spotify = new Spotify({
  id: "2f2177109bd94975bf0447615bf5cf97",
  secret: "8f68f16b230d45cb8cf77764a4a5b35f"
});


const { createAudio } = require('node-mp3-player');
const Audio = createAudio();


client.once('ready', () => {
    console.log("Ready!");
});

client.once('reconnecting', () => {
    console.log("Reconnecting!");
});

client.once('disconnect', () => {
    console.log("Disconnect!");
});

client.on('message', async message => {

    if (message.author.bot) return;

    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith(`${prefix}play`)) {
        playSong(message, serverQueue);
        return;
    }

    else if (message.content.startsWith(`${prefix}skip`)) {
        skipSong(message, serverQueue);
        return;
    }
    else if (message.content.startsWith(`${prefix}stop`)) {
        stopMusic(message, serverQueue);
        return;
    }
    else {
        message.channel.send("Invalid message");
    }
})

const queue = new Map();

async function playSong(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send("You need to be in a voice channel to play music!");

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send("I need permissions to join and speak!");
    }


    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo,
        url: songInfo.video_url,
    };

    if (!serverQueue) {
        const queueContract = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 1,
            playing: true
        };

        queue.set(message.guild.id, queueContract);

        queueContract.songs.push(song);

        try {
            var connection = await voiceChannel.join();
            queueContract.connection = connection;

            play(message.guild, queueContract.songs[0]);
        } catch (err) {
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
}

async function playLocal() {
    spotify.request("https://open.spotify.com/track/1jWJcuTUgO99gntArSPmrB?si=DOrn71k_T2WheQFuBbtx9A")
    .then(function(data) {
        console.log(data);
    }).catch((errr) => {
        console.log(errr);
    })
}

function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }
    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Start playing: ${song.title.title}`);
}



function skipSong(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send("You need to be in a voice channel!");
    if (!serverQueue)
        return message.channel.send("There is no song that I could skip!");
    serverQueue.connection.dispatcher.end();
}

function stopMusic(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send("You need to be in a voice channel!");
    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}

client.login(token);