button_setup_pickFolder = document.querySelector("#enter-host")
button_setup_Continue = document.querySelector("#enter-party")

button_setup_pickFolder.addEventListener("click",()=>{
    window.location.href = "./host/"
})

button_setup_Continue.addEventListener("click",()=>{
    window.location.href = "./join/"
})