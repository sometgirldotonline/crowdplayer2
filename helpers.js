
if (!navigator.storage && !navigator.storage.estimate) {
    alert(`Sorry! 
It seems your browser might be too old for some of our functionality, maybe check for updates?
If you're just controlling music and don't want to send over any of your own files, you can disregard this message
Error code: ENoNavStor`)
}
async function writeJsonToOpfs(fileName, jsonObject) {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    const jsonString = JSON.stringify(jsonObject, null, 2);
    await writable.write(jsonString);
    await writable.close();
    showQuota()
    console.log(`${fileName} written successfully.`);
}
async function readJsonFromOpfs(fileName) {
    try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        const text = await file.text();
        const jsonObject = JSON.parse(text);
        return jsonObject;
    } catch (error) {
        console.error(`Error reading ${fileName}:`, error);
        return {};
    }
}
async function showQuota() {
    try {
        const estimate = await navigator.storage.estimate();
        const quotaInMB = (estimate.quota / (1024 * 1024)).toFixed(0);
        const totalUsedInMB = (estimate.usage / (1024 * 1024)).toFixed(0);
        document.querySelector("#quota").innerText = `${totalUsedInMB}MB / ${quotaInMB}MB Used`
    }
    catch (e) {
        alert(`Error calculating storage usage
Error code: ${e}`)
            console.error(e)
    }
}
async function purgeCache() {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle("meta.json", { create: true });
    const fileHandle2 = await root.getFileHandle("library.json", { create: true });
    const fileSz = Math.round((await fileHandle.getFile()).size / (1e+6)) + Math.round((await fileHandle2.getFile()).size / (1e+6))
    await writeJsonToOpfs("meta.json", {})
    await writeJsonToOpfs("library.json", {})
    alert(`Cleared ${fileSz}MB`)
    showQuota()
}

async function sha256(string) {
    const msgBuffer = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}