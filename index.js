button_EnterHost = document.querySelector("#enter-host")
button_EnterParty = document.querySelector("#enter-party")

button_EnterHost.addEventListener("click",()=>{
    window.location.href = "/host"
})

button_EnterParty.addEventListener("click",()=>{
    window.location.href = "/join"
})