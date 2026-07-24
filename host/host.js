import { parseBlob } from "https://cdn.jsdelivr.net/npm/music-metadata@latest/+esm"
import { Peer } from "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm";
import '../helpers.js'
window.CrowdplayerState = {}
window.CrowdplayerState.rlistIndex = -1
function broadcastUpNext(cns = conns) {
    const rlist = CrowdplayerState.rlist || []
    const queue = CrowdplayerState.queue || []
    const idx = CrowdplayerState.rlistIndex

    let upNext
    if (idx === -1) {
        upNext = [...queue, ...rlist]
    } else {
        upNext = [
            ...rlist.slice(0, idx + 1),
            ...queue,
            ...rlist.slice(idx + 1)
        ]
    }

    cns.forEach(c => c.send({ "msg": "upnext", "list": upNext }))
}
let button_setup_pickFolder = document.querySelector("#setup-pick-folder")
let button_setup_Continue = document.querySelector("#setup-continue")
let button_setup_Process = document.querySelector("#setup-process-folder")
let input_setup_Name = document.querySelector("#party-name")
let partyName = "Untitled Party"
let search = new URLSearchParams(window.location.search)
// showQuota()
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function waitForBuffer(conn, threshold = 64 * 1024) {
    // conn.dataChannel is the raw WebRTC RTCDataChannel
    while (conn.dataChannel && conn.dataChannel.bufferedAmount > threshold) {
        // Wait 50ms before checking the buffer size again
        await delay(50);
    }
}
function toDataURI(uint8Array, mimeType) {
    // Convert bytes to a binary string in chunks to avoid call-stack limits
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, chunk);
    }
    const base64 = btoa(binary);
    return `data:${mimeType};base64,${base64}`;
}
let musicFolder = null
let musicFiles = {}
let musicFilesMeta = {}
window.CrowdplayerState.library = {}
let musicFileFormats = ["mp3", "m4a", "aac", "wav", "flac", "ogg", "opus", "webm"]
let parsedSongs = false
let albumarts = {}
const DEFAULT_ALBUM_ART_URL = 'https://placehold.co/400x400?text=No+Image';

// readJsonFromOpfs("meta.json").then(meta => {
//     musicFilesMeta = meta
// }).catch(() => {
//     musicFilesMeta = {}
// })
// if (musicFilesMeta == null) {
//     musicFilesMeta = {}
// }
function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    const mm = String(minutes).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');

    return `${mm}:${ss}`;
}
function getImageDimensions(base64String) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = function () {
            resolve({
                width: img.naturalWidth,
                height: img.naturalHeight
            });
        };

        img.onerror = function () {
            reject(new Error("Failed to load image from base64 string."));
        };

        img.src = base64String;
    });
}
let currentSong = {}
async function playSongByPath(songData, from = "Other", onEnded = () => { }) {
    console.log(songData)
    currentSong = songData
    currentSong.from = from
    return new Promise(async (resolve, reject) => {
        songData = await songData
        const parts = songData.path.replace(/^\/+|\/+$/g, '').split('/');
        let currentHandle = musicFolder;

        for (let i = 0; i < parts.length - 1; i++) {
            currentHandle = await currentHandle.getDirectoryHandle(parts[i]);
        }

        const fileHandle = await currentHandle.getFileHandle(parts[parts.length - 1]);
        const file = await fileHandle.getFile();
        document.querySelector("#songname").innerText = songData.title
        document.querySelector("#artname").innerText = songData.artists.join(", ")
        document.querySelector("#albname").innerText = songData.album
        document.querySelector("#albart").src = albumarts[`${songData.artists[0]}-${songData.album}`]
        console.log(albumarts)
        document.querySelector("#playerhero").style.backgroundImage = `url("${albumarts[`${songData.artists[0]}-${songData.album}`]}")`
        conns.forEach(con => {
            console.log("Sending playback update from the playsong")

            con.send({ "msg": "PlaybackUpdate", "title": currentSong.title, "album": currentSong.album || "Unknown", "artist": currentSong.artists || "Unknown", "artkey": `${currentSong.artists[0] || "Unknown"}-${currentSong.album || "Unknown"}`, "from": currentSong.from })
        });
        const audioUrl = URL.createObjectURL(file);
        const audio = document.getElementById('player');
        audio.src = audioUrl;
        audio.onerror = (error) => reject(error);
        audio.onended = resolve;
        audio.addEventListener("timeupdate", () => {
            document.querySelector("#pos").innerText = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`
        })
        if ("mediaSession" in navigator) {
            try {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: songData.title,
                    artist: songData.artists.join(", "),
                    album: songData.album,
                    artwork: [
                        {
                            src: albumarts[`${songData.artists[0]}-${songData.album}`],
                        },
                    ],
                });
            }
            catch (e) {
                // presume it was the 
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: songData.title,
                    artist: songData.artists.join(", "),
                    album: songData.album,
                });
            }
            navigator.mediaSession.setActionHandler("play", () => {
                audio.play()
            });
            navigator.mediaSession.setActionHandler("pause", () => {
                audio.pause()
            });
            navigator.mediaSession.setActionHandler("previoustrack", null);
            navigator.mediaSession.setActionHandler("nexttrack", () => {
                audio.currentTime = audio.duration;
            });
        }
        audio.play().catch(reject);
    });

}


function pickRandomSong() {
    let artistArray = Object.keys(window.CrowdplayerState.library)
    let randomArtist = artistArray[Math.floor(Math.random() * artistArray.length)]
    let albumArray = Object.keys(window.CrowdplayerState.library[randomArtist])
    let randomAlbum = albumArray[Math.floor(Math.random() * albumArray.length)]
    let trackArray = Object.keys(window.CrowdplayerState.library[randomArtist][randomAlbum])
    let randomTrack = trackArray[Math.floor(Math.random() * trackArray.length)]
    console.log(window.CrowdplayerState.library[randomArtist][randomAlbum][randomTrack])
    return window.CrowdplayerState.library[randomArtist][randomAlbum][randomTrack]

}
function shuffle(array) {
    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
}
function pickRandomPlaylist() {
    let list = []
    for (let artist of Object.keys(window.CrowdplayerState.library)) {
        for (let album of Object.keys(window.CrowdplayerState.library[artist])) {
            console.log(window.CrowdplayerState.library[artist][album])
            for (let track of Object.keys(window.CrowdplayerState.library[artist][album])) {
                list.push(window.CrowdplayerState.library[artist][album][track])
            }
        }
    }
    return shuffle(list)
}

async function setup_walkFiles(folder, path = "/") {
    for await (const entry of folder.values()) {
        console.log(entry.kind, entry.name);

        if (
            entry.kind === "file" &&
            musicFileFormats.includes(entry.name.split(".").pop().toLowerCase())
        ) {
            musicFiles[`${path}${entry.name}`] = entry;
            console.log("adding", `${path}${entry.name}`);
        } else if (entry.kind === "directory") {
            const dirPath = `${path}${entry.name}/`;
            console.log("trampling into", dirPath);
            await setup_walkFiles(entry, dirPath);
        }
    }
}

async function setup_processId3(file) {
    try {
        let fileFile = await file.getFile()
        let metadata = await parseBlob(fileFile)
        return metadata
    } catch (error) {
        console.error("Failed to parse metadata:", error);
    }
}



button_setup_pickFolder.addEventListener("click", async () => {
    try {
        musicFolder = await window.showDirectoryPicker();
        button_setup_Process.removeAttribute("disabled")
        button_setup_pickFolder.innerText = `Selected: ${musicFolder.name}`

    }
    catch (e) {
        console.error(e)
        alert(`Sorry! 
It seems your browser might be too old for some of our functionality, maybe check for updates? 
Error code: ${e}`)
    }
})


button_setup_Process.addEventListener("click", async () => {
    try {
        button_setup_Process.setAttribute("disabled", "")
        button_setup_pickFolder.setAttribute("disabled", "")

        document.querySelector("#parseprocess").removeAttribute("hidden")
        document.querySelector("#parseprocess").removeAttribute("value")
        document.querySelector("#parseprocess").removeAttribute("max")
        await setup_walkFiles(musicFolder)
        document.querySelector("#parseprocess").max = Object.entries(musicFiles).length
        let i = 0;
        console.log("grabbing id3 tag")
        for (const [path, file] of Object.entries(musicFiles)) {
            if (!Object.hasOwn(musicFilesMeta, path)) {
                try {
                    const id3 = await setup_processId3(file);
                    if (id3 !== undefined) {
                        console.log(id3)
                        musicFilesMeta[path] = id3.common
                        if (id3.common.picture?.[0]) {
                            musicFilesMeta[path]._coverDataUri = toDataURI(id3.common.picture[0].data, id3.common.picture[0].format)
                            // console.log("AArt1 for ", id3.common.artist, "-", id3.common.album, "=", toDataURI(id3.common.picture[0].data, id3.common.picture[0].format))
                        }
                    }
                    else {
                        console.warn("Skipping (parse failed):", musicFiles[i], "id3 was undefined");
                    }
                } catch (err) {
                    console.error(err)
                    console.warn("Skipping (parse failed):", musicFiles[i], err);
                }
            }
            document.querySelector("#parseprocess").value = i + 1;
            i++;
        }
        console.log("saving meta")
        // writeJsonToOpfs(`meta-.json`, musicFilesMeta)
        // time to parse to library format!
        console.log("librarifying")
        document.querySelector("#parseprocess").max = Object.entries(musicFilesMeta).length
        i = 0;
        for (const [path, meta] of Object.entries(musicFilesMeta)) {
            try {

                if (window.CrowdplayerState.library[meta.artists[0] || meta.artist] == null || window.CrowdplayerState.library[meta.artists[0] || meta.artist] == undefined) {
                    window.CrowdplayerState.library[meta.artists[0] || meta.artist] = {}
                }

                if (window.CrowdplayerState.library[meta.artists[0] || meta.artist][meta.album] == null || window.CrowdplayerState.library[meta.artists[0] || meta.artist][meta.album] == undefined) {
                    window.CrowdplayerState.library[meta.artists[0] || meta.artist][meta.album] = {}
                    // Use timestamp to ensure each album gets a unique key
                    const albumArtKey = `${meta.artists[0]}-${meta.album}`;
                    // console.log(`${meta.artist}-${meta.album}`, albumArtKey)
                    // Use actual cover image if available, otherwise use default placeholder URL
                    albumarts[albumArtKey] = meta._coverDataUri || DEFAULT_ALBUM_ART_URL;
                    // console.log("AArt2 for ", meta.artist, "-", meta.album, "=", albumArtKey, meta._coverDataUri)
                    // Store album art mapping with album reference for client
                    // library[meta.artist][meta.album].duration_key = albumArtKey;
                }
                window.CrowdplayerState.library[meta.artists[0] || meta.artist][meta.album][meta.title] = {
                    "album": meta.album,
                    "artists": meta.artists,
                    "artist": meta.artist,
                    "date": meta.date,
                    "year": meta.year,
                    "album": meta.album,
                    "path": path,
                    "title": meta.title
                }
            }
            catch (e) {
                console.error(e)
            }
            document.querySelector("#parseprocess").value = i + 1;
            i++;
        }
        console.log(albumarts)
        // writeJsonToOpfs(`library-.json`, library)
        console.log("done")
        // window.library = window.CrowdplayerState.library
        // window.meta = meta
        parsedSongs = true
        if (input_setup_Name.checkValidity()) {
            button_setup_Continue.removeAttribute("disabled")
        }
        document.querySelector("#parseprocess").setAttribute("hidden", "")

    }
    catch (e) {
        if (e !== undefined) {
            console.error(e)
            alert(`An error occured
                Error code: ${e}`)

        }

    }
    button_setup_Process.removeAttribute("disabled", "")
    button_setup_pickFolder.removeAttribute("disabled", "")
})

input_setup_Name.addEventListener("keyup", () => {
    if (input_setup_Name.checkValidity()) {
        if (parsedSongs) {
            button_setup_Continue.removeAttribute("disabled")
        }
    }
    else {
        button_setup_Continue.setAttribute("disabled", "true")

    }
})

button_setup_Continue.addEventListener("click", () => {
    if (input_setup_Name.checkValidity()) {
        partyName = input_setup_Name.value
        document.body.classList.add("faded");
        setTimeout(() => {
            // window.location.href = "./player/"
            initPlayer()
        }, 110)
    }
})
let runLoop = true
// pickRandomPlaylist()
window.CrowdplayerState.queue = []
CrowdplayerState.rlist = []
// Player
window.conns = []
async function initPlayer() {
    let id = search.get("id") || Math.random().toString(36).substring(2, 8).padEnd(6, '0')
    document.querySelector("main.setup").classList.add("hidden")
    document.querySelector("main.party").classList.remove("hidden")
    var peer = new Peer(`CrowdPlayer-PeerJS-ID-${id}`, {
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                // {
                //   urls: 'turn:free.expressturn.com:3478',
                //   username: '000000002099904145',
                //   credential: 'QEmutNYA8Wredn4OZ7ITkQTRzAo='
                // }
                {
                    url: 'turn:127.0.0.1:3478',
                    credential: 'key1',
                    username: 'username1'
                }
            ]
        }
    });
    peer.on("open", function (gotid) {
        document.body.classList.remove("faded");
        document.querySelector("#code").innerText = id
    });

    peer.on('connection', function (conn) {
        window.conns.push(conn)
        conn.on("close", () => {
            const index = window.conns.indexOf(conn);
            if (index > -1) {
                window.conns.splice(index, 1);
            }
        })
        console.log("Got connection from", conn.peer)


        conn.on("open", async function () {
            // Receive messages
            conn.on("data", async function (data) {
                console.log("Got", data)
                if (data.msg == "ClientHello") {
                    conn.send({ "msg": "ServerHello", "PartyName": partyName || "Untitled Party", "ApplicationName": "Crowdplayer2.0" })
                }
                if (data.msg == "AddToQueue") {
                    try {
                        CrowdplayerState.queue.push(data)
                        conn.send({ "msg": "AddToQueue", "success": true })
                    } catch (error) {
                        conn.send({ "msg": "AddToQueue", "success": false, "error": error })
                    }
                    broadcastUpNext()

                }
                if (data.msg == "Get-Library") {
                    let totalMessages = Object.values(window.CrowdplayerState.library).reduce((sum, albums) => sum + Object.keys(albums).length, 0);
                    conn.send({ "msg": "Expect-Albums", "expect": totalMessages })
                    await delay(50)
                    let idx = 0;
                    for (const artist of Object.keys(window.CrowdplayerState.library)) {
                        for (const album of Object.keys(window.CrowdplayerState.library[artist])) {

                            console.log("Sending", artist, album);

                            conn.send({
                                "msg": "Library-Album",
                                "albumdata": window.CrowdplayerState.library[artist][album],
                                artist,
                                album,
                                idx,
                                // Get the album art key from the stored duration_key
                                image: albumarts[`${artist}-${album}`]
                            });
                            idx++;
                            // This will now properly pause the loop if the buffer is full
                            await waitForBuffer(conn);
                            // await delay(200)
                        }
                    }
                    setTimeout(() => {
                        if (currentSong != {}) {
                            console.log("Sending playback update from the init")
                            conn.send({ "msg": "PlaybackUpdate", "title": currentSong.title, "artist": currentSong.artists, "album": currentSong.album, "artkey": `${currentSong.artists[0]}-${currentSong.album}`, "from": currentSong.from })

                        }
                        conn.send({ "msg": "queue", "list": CrowdplayerState.queue })
                        conn.send({ "msg": "randomplaylist", "list": CrowdplayerState.rlist })
                        broadcastUpNext([conn])
                    }, 100)
                }
            });

        });
    });
    while (runLoop) {
        CrowdplayerState.rlist = pickRandomPlaylist()
        for (let song = 0; song < CrowdplayerState.rlist.length; song++) {
            CrowdplayerState.rlistIndex = song
            await playSongByPath(CrowdplayerState.rlist[song], "rlist")
            broadcastUpNext()
            while (window.CrowdplayerState.queue.length > 0) {
                let queuedTrack = window.CrowdplayerState.queue[0]
                await playSongByPath(queuedTrack, "queue")
                window.CrowdplayerState.queue.shift()
                // tracks now dont disapear into the aether
                CrowdplayerState.rlistIndex++
                CrowdplayerState.rlist.splice(CrowdplayerState.rlistIndex, 0, queuedTrack)
                song = CrowdplayerState.rlistIndex
                broadcastUpNext()
            }
        }
    }
}
if (search.get("id")) {
    partyName = search.get("id") + " Testing Party"
    document.querySelector("#party-name").value = partyName
    // initPlayer()
}