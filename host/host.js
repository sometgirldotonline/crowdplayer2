import { parseBlob } from "https://cdn.jsdelivr.net/npm/music-metadata@latest/+esm"
import { Peer } from "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm";
import '../helpers.js'
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
let library = {}
let musicFileFormats = ["mp3", "m4a", "aac", "wav", "flac", "ogg", "opus", "webm"]
let parsedSongs = false
let albumarts = {}

// readJsonFromOpfs("meta.json").then(meta => {
//     musicFilesMeta = meta
// }).catch(() => {
//     musicFilesMeta = {}
// })
// if (musicFilesMeta == null) {
//     musicFilesMeta = {}
// }



async function setup_walkFiles(folder, path = "/") {
    for await (const entry of folder.values()) {
        console.log(entry.kind, entry.name);
        if (entry.kind == "file" && musicFileFormats.includes(entry.name.split(".").pop().toLowerCase())) {
            // musicFiles.push(entry)
            musicFiles[`${path}${entry.name}`] = entry
            console.log("adding", `${path}${entry.name}`)
        }
        else if (entry.kind == "directory") {
            await setup_walkFiles(entry, path + entry.nfolderame + "/")
            console.log("trampling into ", path + entry.name + "/")
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
                    musicFilesMeta[path] = id3.common
                    if (id3.common.picture?.[0]) {
                        musicFilesMeta[path]._coverDataUri = toDataURI(id3.common.picture[0].data, id3.common.picture[0].format)
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
            if (library[meta.artist] == null || library[meta.artist] == undefined) {
                library[meta.artist] = {}
            }

            if (library[meta.artist][meta.album] == null || library[meta.artist][meta.album] == undefined) {
                library[meta.artist][meta.album] = {}
                albumarts[sha256(`${meta.artist}-${meta.album}`)] = meta._coverDataUri || null
            }
            library[meta.artist][meta.album][meta.title] = {
                "album": meta.album,
                "artists": meta.artists,
                "date": meta.date,
                "year": meta.year,
                "album": meta.album,
            }
            document.querySelector("#parseprocess").value = i + 1;
            i++;
        }
        // writeJsonToOpfs(`library-.json`, library)
        console.log("done")
        window.library = library
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


// Player
window.conns = []
function initPlayer() {
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
            window.conns.remove(conn)

        })
        console.log("Got connection from", conn.peer)
        conn.on("open", async function () {
            // Receive messages
            conn.on("data", async function (data) {
                console.log("Got", data)
                if (data.msg == "ClientHello") {
                    conn.send({ "msg": "ServerHello", "PartyName": partyName || "Untitled Party", "ApplicationName": "Crowdplayer2.0" })
                }
                if (data.msg == "Get-Library") {
                    let totalMessages = Object.values(library).reduce((sum, albums) => sum + Object.keys(albums).length, 0);
                    conn.send({ "msg": "Expect-Albums", "expect": totalMessages })
                    await delay(50)
                    let idx = 0;
                    for (const artist of Object.keys(library)) {
                        for (const album of Object.keys(library[artist])) {

                            console.log("Sending", artist, album);

                            conn.send({
                                "msg": "Library-Album",
                                "albumdata": library[artist][album],
                                artist,
                                album,
                                idx,
                                image: albumarts[sha256(`${artist}-${album}`)]
                            });
                            idx++;
                            // This will now properly pause the loop if the buffer is full
                            await waitForBuffer(conn);
                            // await delay(200)
                        }
                    }

                }
            });

        });
    });

}
if (search.get("id")) {
    partyName = search.get("id") + " Testing Party"
    initPlayer()
}