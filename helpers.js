
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

async function readBlobFromOpfs(fileName) {
    try {
        const root = await navigator.storage.getDirectory();
        const fileHandle = await root.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return file;
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
    const estimate = await navigator.storage.estimate();
    const totalUsedInMB = (estimate.usage / (1024 * 1024)).toFixed(0);
    const fileHandle = await root.getFileHandle("meta.json", { create: true });
    const fileHandle2 = await root.getFileHandle("library.json", { create: true });
    const fileSz = Math.round((await fileHandle.getFile()).size / (1e+6)) + Math.round((await fileHandle2.getFile()).size / (1e+6))
    await writeJsonToOpfs("meta.json", {})
    await writeJsonToOpfs("library.json", {})
    alert(`Cleared ${fileSz}MB
Could not clear ${totalUsedInMB - fileSz}MB (I have no clue what that is lol)`)
    showQuota()
}

function sha256(string) {
    console.log("sha'in", string);

    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let result = '';

    let words = [];
    const asciiBitLength = string.length * 8;

    // Initial hash values (first 32 bits of fractional parts of sqrt of first 8 primes)
    let hash = sha256.h = sha256.h || [];
    // Round constants (first 32 bits of fractional parts of cube roots of first 64 primes)
    let k = sha256.k = sha256.k || [];
    let primeCounter = k.length;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (let i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }

    string += '\x80'; // append a '1' bit plus zero padding
    while (string.length % 64 - 56) string += '\x00';

    for (let i = 0; i < string.length; i++) {
        const j = string.charCodeAt(i);
        if (j >> 8) return; // ASCII only
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words.length] = ((asciiBitLength / maxWord) | 0);
    words[words.length] = (asciiBitLength);

    // process each chunk
    for (let j = 0; j < words.length;) {
        const w = words.slice(j, j += 16);
        const oldHash = hash;
        hash = hash.slice(0, 8);

        for (let i = 0; i < 64; i++) {
            const w15 = w[i - 15], w2 = w[i - 2];

            const a = hash[0], e = hash[4];
            const temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                    w[i - 16]
                    + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                    + w[i - 7]
                    + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                ) | 0);

            const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
        }

        for (let i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (let i = 0; i < 8; i++) {
        for (let j = 3; j + 1; j--) {
            const b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? '0' : '') + b.toString(16);
        }
    }
    return result;
}