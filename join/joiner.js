import '../helpers.js'
let join_Continue_Button = document.querySelector("#join-continue")
let join_Connect_Code = document.querySelector("#connect-code")
let join_Connect_Error = document.querySelector("#join-connect-error")
let join_Connect_Good = document.querySelector("#join-connect-good")
let join_connectChecker_Good = document.querySelector("#connect-checker-good")
let join_connectChecker_Bad = document.querySelector("#connect-checker-bad")
let join_connectChecker_Spinner = document.querySelector("#connect-checker-spinner")
let search = new URLSearchParams(window.location.search)
join_Connect_Code.value = search.get("id") || ""
window.library = {}
import { Peer } from "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm";
var peer = new Peer({
    config: {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            // {
            //     urls: 'turn:free.expressturn.com:3478',
            //     username: '000000002099904145',
            //     credential: 'QEmutNYA8Wredn4OZ7ITkQTRzAo='
            // }
            {
                url: 'turn:127.0.0.1:3478',
                credential: 'key1',
                username: 'username1'
            }
        ]
    }
});
let connstate = false
peer.on("open", function (id) {
    console.log("I am", id)
    join_Connect_Code.dispatchEvent(new Event('keyup', { bubbles: true, cancelable: true }));
    join_Connect_Code.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
    document.querySelector("#join_Loading").classList.add("hidden")
    document.querySelector("#join_Form").classList.remove("hidden")


});
let partyInfo = null
function faliureState(reason) {
    join_Connect_Error.classList.remove("hidden")
    join_Connect_Error.innerText = `Could not connect to party.
Reason: ${reason}`
    join_connectChecker_Spinner.classList.add("hidden")
    join_connectChecker_Bad.style.display = "block"
}
function successState(reason) {
    join_Connect_Good.classList.remove("hidden")
    join_Connect_Good.innerText = `${reason}`.trim()
    join_connectChecker_Spinner.classList.add("hidden")
    join_connectChecker_Bad.style.display = "none"
    join_connectChecker_Good.style.display = "block"
}
let hasSetup = false
join_Connect_Code.addEventListener("input", () => {
    if (join_Connect_Code.checkValidity() && join_Connect_Code.value.length == 6) {
        if (window.conn) {
            conn.close()
        }
        join_connectChecker_Spinner.classList.remove("hidden")
        join_Connect_Error.classList.add("hidden")
        join_connectChecker_Good.style.display = "none"
        join_connectChecker_Bad.style.display = "none"
        let startTime = Date.now()
        window.conn = peer.connect("CrowdPlayer-PeerJS-ID-" + join_Connect_Code.value);
        conn.on("open", () => {
            if (hasSetup == false) {
                console.log("Peer exists and connection established in", (Date.now() - startTime) / 1000, "seconds");
                console.log("Testing communication")
                connstate = true
                conn.on("data", function (data) {
                    if (hasSetup == false) {
                        if (data.msg == "ServerHello" && data.ApplicationName == "Crowdplayer2.0") {
                            join_connectChecker_Good.style.display = "block"
                            join_connectChecker_Spinner.classList.add("hidden")
                            connstate = true
                            join_Continue_Button.removeAttribute("disabled")
                            successState(`Successfully connected to "${data.PartyName}" party.`)
                            partyInfo = data
                            if (search.get("id")) {
                                join_Continue_Button.dispatchEvent(new Event('click', { "bubbles": true, "cancelable": true }))
                            }
                        }
                        else if (data.ApplicationName != "Crowdplayer2.0") {
                            faliureState("That doesn't seem to be a Crowdplayer (this shouldn't happen)")
                        }
                    }
                });
                conn.send({ "msg": "ClientHello", "ApplicationName": "Crowdplayer2.0" });
            }
        });

        conn.on("error", (err) => {
            if (hasSetup == false) {
                console.log("Connection failed:", err, "in", (Date.now() - startTime) / 1000, "seconds");
                faliureState(`Recieved an error after ${(Date.now() - startTime) / 1000} seconds
Error: ${err}`)
                connstate = true
                conn.close()
            }

        });

        // conn.on("close", () => {
        //     if (hasSetup == false) {
        //         console.log("Connection closed", "in", (Date.now() - startTime) / 1000, "seconds");
        //         faliureState(`Connection was closed by party after${(Date.now() - startTime) / 1000} seconds`)
        //         connstate = true
        //         conn.close()
        //     }
        // });
        setTimeout(() => {
            if (!connstate) {
                faliureState("Timed out connecting after 10s")
                conn.close()
                connstate = true
            }
        }, 10000)
    }
})
//<li class="list-row btn h-fit">
//    <div><img class="size-10 rounded-box"
//            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJ4AAACUCAMAAABVwGAvAAAAYFBMVEXx8vSRmKD29/mOlp2ipqvr7O+doKWKkZnBxsvb3eHAxczx8/OQl6H5+vuiqK6mq7KzuLzS1dnz9fGnr7Kxs7nMztOMkp7h4+a6vsSVnaHd4+OFjJOcoqrl5+fHzM7z+fisxJk4AAAEFUlEQVR4nO2b23qjIBCAZdASCx5yasz2sO//ljskmyaawSIK9mL+fu2V0T+Dwwxos4xhGIZhGIZhGIZhGIZhGCYpkBUJwctNQGso2zwhbTnFTxcHJQMx+DP5I/JtX/jbQaOMEaGC0xHCqMY7fnBUQsjzSzIECqqjr19RS6FeswrSUFXZBkNYew6vPmGw/WO9BJDjCJ+038GlDV5SvepVSVV6Hmz1Nmmjh3qS9QJhvTmsqaczO7fB2AlX1ANdbtq6bjcnd1+ynh5sG6nw4vjbOPuS9fQ6hQX8ipRdRleGlfS0Pihb72+oA33alfSgVaIHFksqfuvowVbJvp5U29+jVzQDO/QjW6FV9KBUQzsh3qm+aR29DaFHdsWr6FXPY4ujSyXvOnovlF5DHPmb9H5N9MjBbZPqjXQieFEiNboqnZ4uxAfsnCeiJhZqvRhLD5fEqnMeahfMw7HNk03LepdhxbcrdgdY1IZ2KYta1dmaipd0HayfWgK6pYqid9mLsSE5/3Ee3ahe7KhJL5IebOX/W8uc3fsj7b1pwdvUdarl9UCfbxc2snYOb7b9eLebhUa9v5RZum65eOm1wc7joCq7pmkOm9PoDLmwHuwf7yojN5Vjg0lrAK3Hpu8IetANc9KZvh4srQdHafp6RpTac4Muuh6Uz+VACsd9n1pPw4kopsJ8FKF+y+pltSRaJSHd1Tehnn2uQNnZkhXot6CeJtu4eem7oB4mrcsOq++kp08R9MjF60P+FiF+i+nB59kdPOFYiCXTg896LHhitPom0Gt+sAtL34X0niot6ffl+Gqx9eBr9L77vv/I9IVj5yzKi+iNJ+3dDtP32QOXRWofUw9OPnIWkxfD9sDOlgb9om3e6iwnKy2FOgzW5tV1n1Tt/8bSy35O2jvv/fS9rekwfmRXM1tvR+4ljozvY/Wtjt89BB2/2Xpo5zuyF6S6py/c7Wz8iK51rp5n0j76yU+42fW+mCTyd6YenMYrLYGR+bU7GD49sPFbWE9PtkOur6Zg7IaffZ5f5unBQRnS4Ac/PMnzkxfkbb+o3nCfaYLfkfzoMH5z9KppU8oDxnSOmfytf//N0NPbgPvuhvOjGL+HBA7Xw0o7Q89NL3+D9bSOY4cTz0P8wqPnWtPO91P3d/YC9XZe7XGgnpH1rf6G6dkVd6TYXfiOX2D0tiGzsTfm+/4L0oMyUlrcwfyFQD1dnKMOrcVc+5eg6O3fIsuJS/5CkF5gHzDdL9eXZ5fT9KqvaFPKALkH+3Km8dSzr7bKek6lnYZRTVELeT55Rq/Ik6ldkR/4J/e0uyz7EgtOea3aZx9qcbspL0pfXulP+NK8VIdiN+GpQ1W2TZ2Mpi2J9x9Gxzfpv5OMPg9kGIZhGIZhGIZhGIZhGIaJwD8W0Uo/DPnMSwAAAABJRU5ErkJggg==" /></div>
//    <div>
//        <div>Artist Name</div>
//        <div class="text-xs uppercase font-semibold opacity-60">10 songs</div>
//    </div>
//</li>
let albumsToExpect = -1
let albumArts = {}
join_Continue_Button.addEventListener("click", () => {
    document.querySelector("#connect").classList.add("hidden")
    document.querySelector("#connecting").classList.remove("hidden")
    // document.querySelector("#partyName").innerText = partyInfo.PartyName
    conn.send({ "msg": "Get-Library" })
    library = {}
    conn.on("data", (data) => {
        console.log("Got", data)
        if (data.msg == "Expect-Albums") {
            albumsToExpect = data.expect
        }
        if (data.msg == "PlaybackUpdate"){
            document.querySelector("#currentArt").src = albumArts[data.artkey]
            document.querySelector("#currentTrack").innerText = data.title
            document.querySelector("#currentArtist").innerText = data.artist.join(", ")
        }
        if (data.msg == "AddToQueue") {
            if (data.success) {
                showToast(`<b>Added track to queue successfully</b>`)

            }
            else{
                showToast(`<b>Failed adding track to queue</b>`)

            }
        }
        if (data.msg == "Library-Album") {
            if (!Object.hasOwn(library, data.artist)) {
                library[data.artist] = {}
            }
            if (Object.hasOwn(library, data.artist)) {
                library[data.artist][data.album] = data.albumdata
                albumArts[`${data.artist}-${data.album}`] = data.image
            }
            if (albumsToExpect == Object.values(library).reduce((sum, albums) => sum + Object.keys(albums).length, 0)) {
                console.log("Recieved", Object.values(library).reduce((sum, albums) => sum + Object.keys(albums).length, 0), "albums from peer")
                let artists = Object.keys(library).sort((a, b) => a.localeCompare(b))
                artists.forEach((artist) => {
                    let li = document.createElement("li")
                    li.classList.add("list-row")
                    li.classList.add("btn")
                    li.classList.add("h-fit")
                    let imgdiv = document.createElement("div")
                    let img = document.createElement("img")
                    img.src = "/"
                    img.classList.add("size-10")
                    img.classList.add("rounded-box")
                    imgdiv.appendChild(img)
                    li.appendChild(imgdiv)
                    let metaDiv = document.createElement("div")
                    let artistName = document.createElement("div")
                    artistName.innerText = artist
                    metaDiv.appendChild(artistName)
                    let artistInfo = document.createElement("div")
                    artistInfo.innerText = artist
                    metaDiv.appendChild(artistInfo)
                    li.appendChild(metaDiv)
                    document.querySelector("#artists-list").appendChild(li)
                    let albums = Object.keys(library[artist]).sort((a, b) => { a.localeCompare(b) })
                    albums.forEach(album => {
                        let alb = library[artist][album]
                        let li = document.createElement("li")
                        li.classList.add("list-row")
                        li.classList.add("btn")
                        li.classList.add("h-fit")
                        let imgdiv = document.createElement("div")
                        let img = document.createElement("img")
                        img.src = albumArts[`${artist}-${album}`]
                        img.classList.add("size-10")
                        img.classList.add("rounded-box")
                        imgdiv.appendChild(img)
                        li.appendChild(imgdiv)
                        let metaDiv = document.createElement("div")
                        let artistName = document.createElement("div")
                        artistName.innerText = album
                        metaDiv.appendChild(artistName)
                        let artistInfo = document.createElement("div")
                        artistInfo.innerText = artist
                        metaDiv.appendChild(artistInfo)
                        li.appendChild(metaDiv)
                        document.querySelector("#album-list").appendChild(li)
                        // console.log(library[artist][album])
                        let tracks = Object.keys(library[artist][album]).sort((a, b) => { a.localeCompare(b) })
                        // console.log(tracks)
                        tracks.forEach(track => {
                            if (track != "duration_key") {
                                let trk = library[artist][album][track]
                                let li = document.createElement("li")
                                li.classList.add("list-row")
                                li.classList.add("btn")
                                li.classList.add("h-fit")
                                let imgdiv = document.createElement("div")
                                let img = document.createElement("img")
                                img.src = albumArts[`${artist}-${album}`]
                                img.classList.add("size-10")
                                img.classList.add("rounded-box")
                                imgdiv.appendChild(img)
                                li.appendChild(imgdiv)
                                let metaDiv = document.createElement("div")
                                let artistName = document.createElement("div")
                                artistName.innerText = track
                                metaDiv.appendChild(artistName)
                                let artistInfo = document.createElement("div")
                                artistInfo.innerText = artist
                                metaDiv.appendChild(artistInfo)
                                li.appendChild(metaDiv)
                                li.onclick = () => {
                                    showToast(`<b>Adding <i>${htmlspecialchars(track)}</i> to the queue</b>`)
                                    let tmp= trk
                                    trk.msg = "AddToQueue"
                                    conn.send(tmp)
                                }
                                document.querySelector("#track-list").appendChild(li)
                            }
                        })

                    })
                })
                document.querySelector("#connecting").classList.add("hidden")
                document.querySelector("#library").classList.remove("hidden")
                // console.log(albumArts)
            }
        }
    })
})

