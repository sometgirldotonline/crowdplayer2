let button_setup_pickFolder = document.querySelector("#setup-pick-folder")
let button_setup_Continue = document.querySelector("#setup-continue")
let button_setup_Process = document.querySelector("#setup-process-folder")

showQuota()

let musicFolder = null
let musicFiles = {}
let musicFilesMeta = {}
let library = {}
let musicFileFormats = ["mp3", "m4a", "aac", "wav", "flac", "ogg", "opus", "webm"]


readJsonFromOpfs("meta.json").then(meta => {
    musicFilesMeta = meta
}).catch(() => {
    musicFilesMeta = {}
})
if (musicFilesMeta == null) {
    musicFilesMeta = {}
}


async function walkFiles(folder, path = "/") {
    for await (const entry of folder.values()) {
        console.log(entry.kind, entry.name);
        if (entry.kind == "file" && musicFileFormats.includes(entry.name.split(".").pop().toLowerCase())) {
            // musicFiles.push(entry)
            musicFiles[`${path}${entry.name}`] = entry
            console.log("adding", `${path}${entry.name}`)
        }
        else if (entry.kind == "directory") {
            await walkFiles(entry, path + entry.name + "/")
            console.log("trampling into ", path + entry.name + "/")
        }
    }
}

async function processId3(file) {
    let fileFile = await file.getFile()
    metadata = await parseBlob(fileFile)
    return metadata
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
        await walkFiles(musicFolder)
        document.querySelector("#parseprocess").max = Object.entries(musicFiles).length
        let i = 0;
        console.log("grabbing id3 tag")
        for (const [path, file] of Object.entries(musicFiles)) {
            if (!Object.hasOwn(musicFilesMeta, path)) {
                try {
                    const id3 = await processId3(file);
                    musicFilesMeta[path] = id3
                    console.log(id3);
                } catch (err) {
                    console.error(e)
                    console.warn("Skipping (parse failed):", musicFiles[i].name, err);
                }
            }
            document.querySelector("#parseprocess").value = i + 1;
            i++;
        }
        console.log("saving meta")
        writeJsonToOpfs("meta.json", musicFilesMeta)
        // time to parse to library format!
        console.log("librarifying")
        document.querySelector("#parseprocess").max = Object.entries(musicFilesMeta).length
        i = 0;
        for (const [path, meta] of Object.entries(musicFilesMeta)) {
            if (library[meta.common.artist] == null || library[meta.common.artist] == undefined) {
                library[meta.common.artist] = {}
            }

            if (library[meta.common.artist][meta.common.album] == null || library[meta.common.artist][meta.common.album] == undefined) {
                library[meta.common.artist][meta.common.album] = {}
            }
            library[meta.common.artist][meta.common.album][meta.common.title] = meta
            document.querySelector("#parseprocess").value = i + 1;
            i++;
        }
        writeJsonToOpfs("library.json", library)
        console.log("done")
        button_setup_Continue.removeAttribute("disabled")
        document.querySelector("#parseprocess").setAttribute("hidden", "")

    }
    catch (e) {
        console.error(e)

        alert(`An error occured
Error code: ${e}`)
    }
    button_setup_Process.removeAttribute("disabled", "")
    button_setup_pickFolder.removeAttribute("disabled", "")
})

button_setup_Continue.addEventListener("click", () => {
    window.location.href = "./player/"
})

