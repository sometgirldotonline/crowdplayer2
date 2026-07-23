import { parseBlob } from "https://cdn.jsdelivr.net/npm/music-metadata-browser@2.5.11/+esm"
import { Peer } from "https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm";
let search = new URLSearchParams(window.search)
let id = search.get("id") || Math.random().toString(36).substring(2, 8).padEnd(6, '0')
var peer = new Peer(`CrowdPlayer-PeerJS-ID-${id}`,{
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
    document.body.classList.add("unfaded")
    document.querySelector("#code").innerText = id
});

peer.on('connection', function (conn) {
    console.log("Got connection from",conn.peer)
    conn.on("open", function () {
        // Receive messages
        conn.on("data", function (data) {
          if(data.msg == "ClientHello"){
            conn.send({"msg":"ServerHello","PartyName":localStorage.getItem("partyName") || "Untitled Party","ApplicationName":"Crowdplayer2.0"})
          }
        });

    });
});
