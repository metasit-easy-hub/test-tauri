let folderHandle, folderDelete;
let storeDelete = [];
let archiveFolder = null;
let problemFolder = null;
let fileToUpload = []; // file video ที่ต้องการอัพโหลด
let otherFileProblem = [];

let dbName = 'DirectoryAccessDBMove';
let storeName = 'handlesMove';
let handleKey = 'dirHandleMove';
let progress = "0"
let storeSelectMove = [];
let statusUpload = false;
let percentCompleted = null;

try {
    // prompt("Please enter your text:")

    // ฟังก์ชันสำหรับบันทึกค่าลงใน array โดยไม่ซ้ำกัน
    function saveUniqueToArray(array, value) {
        // ตรวจสอบว่าค่ายังไม่มีใน array
        if (!array.includes(value)) {
            array.push(value);
            return array
        }
        else {
            const index = array.indexOf(value);
            if (index > -1) {
                array.splice(index, 1);
            }
            return array;
        }
        // return array;
    }

    // เลือกไฟล์จาก problem folder
    function selectMove(event) {
        const targetId = event.target.id;
        if (storeSelectMove.includes(targetId)) {
            event.target.classList.remove('bg-select');
        }
        else {
            event.target.classList.add('bg-select');
        }

        storeSelectMove = saveUniqueToArray(storeSelectMove, targetId);
        console.log(storeSelectMove, 'storeSelectMove');

        // Disable/enable buttons based on storeSelectMove length
        const synFileProblemBtn = document.getElementById('syn-file-problem');
        const btnDelete = document.getElementById('btn-delete');

        if (storeSelectMove.length === 0) {
            synFileProblemBtn.disabled = true;
            btnDelete.disabled = true;
        } else {
            synFileProblemBtn.disabled = false;
            btnDelete.disabled = false;
        }

    }

    async function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(dbName, 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };
        });
    }

    async function loadDirHandle() {
        try {
            const db = await openDB();
            const transaction = db.transaction(storeName, 'readonly');
            const store = transaction.objectStore(storeName);
            const handle = await new Promise((resolve, reject) => {
                const request = store.get(handleKey);
                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });

            if (handle && handle instanceof FileSystemDirectoryHandle) {
                return handle;
            } else {
                return null;
            }

        } catch (err) {
            console.error('Error loading from DB:', err);
            return null;
        }
    }

    async function saveDirHandle(handle) {
        try {
            const db = await openDB();
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            await new Promise((resolve, reject) => {
                const request = store.put(handle, handleKey);

                request.onsuccess = () => {
                    // console.log('Successfully saved handle to DB');
                    resolve();
                };

                request.onerror = () => {
                    // console.error('Failed to save handle:', request.error);
                    reject(request.error);
                };
            });

            return true;
        } catch (err) {
            // console.error('Error saving to DB:', err);
            throw err;
        }
    }


    // check folderHandle ใน db ถ้ามีให้เอามาใช้ ถ้าไม่มีก็ไม่ต้องทำอะไรให้ user เลือกโฟลเดอร์
    async function setFolder() {
        // console.log('setFolder');
        if (!folderHandle) {
            folderHandle = await loadDirHandle()
        }

        // folderHandle = null;
        // console.log(folderHandle,'folderHandle');
        // console.log(folderHandle.name,'name');
        // console.log(folderHandle.values(),'values');
        // console.log(folderHandle.entries(),'folderHandle.entries');


        if (folderHandle) {
            try {

                document.getElementById("input-key").value = folderHandle.name;

                // ติดตามการเปลี่ยนแปลงของ fileToUpload
                await getList('fileList')
                await getList('deleteList')

                // กำหนดให้ทำงาน ทุก 5 วินาที
                setInterval(async () => {
                    // ถ้าไม่ได้มีการทำงานอยู่ ให้ get list of file
                    if (!statusUpload) {
                        await getList('fileList')
                    }
                    // ถ้าไม่มีการทำงานอยู่ และมีไฟล์อยู่ ให้ syn file
                    if (fileToUpload.length > 0 && !statusUpload) {
                        synFile();
                    }

                    // update เวลาเช็คคิวไฟล์วิดีโอล่าสุด
                    document.getElementById("check-queue-file-time").innerText = new Date().toLocaleTimeString('th-TH', { 
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                }, 5000);

            } catch (error) {
                console.log('error', error.message);
            }
        }
    }

    
    // ปุ่ม folder ที่กำลังอัพโหลด
    document.getElementById("btn-progress").addEventListener("click", async () => {
        getList("fileList")
    })

    // ปุ่ม folder ที่มีปัญหา
    document.getElementById("btn-problem").addEventListener("click", async () => {
        getList("deleteList")
    })

    // ปุ่มลบไฟล์ที่มีปัญหา
    document.getElementById("btn-delete").addEventListener("click", async () => {
        let fileProblem = [];

        if (confirm('คุณต้องการลบไฟล์ที่เลือกใช่หรือไม่?')) {
            for await (const entry of problemFolder.values()) {
                if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.webm') &&
                    storeSelectMove.includes(entry.name)
                ) {
                    fileProblem.push(entry);
                }
            }
            for await (const entry of fileProblem.values()) {
                if (entry.kind === "file") {
                    await entry.remove()
                    // ลบค่าออกจาก storeSelectMove หลังจากลบไฟล์
                    const index = storeSelectMove.indexOf(entry.name);
                    if (index > -1) {
                        storeSelectMove.splice(index, 1);
                    }
                }
            }
            // upload filelist
            getList("fileList")
            getList("deleteList")

            if (storeSelectMove.length == 0) {
                document.getElementById('syn-file-problem').disabled = true;
                document.getElementById('btn-delete').disabled = true;
            }
        }
    })

    // ปุ่มซิงค์ไฟล์ที่มีปัญหากลับไปเข้า queue รออัพโหลด
    document.getElementById("syn-file-problem").addEventListener("click", async () => {

        let fileProblem = []
        for await (const entry of problemFolder.values()) {
            if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.webm') &&
                storeSelectMove.includes(entry.name)
            ) {
                fileProblem.push(entry);
            }
        }

        for await (const entry of fileProblem.values()) {
            if (entry.kind === "file") {
                const file = await entry.getFile();
                const newHandle = await folderHandle.getFileHandle(entry.name, { create: true });
                const writable = await newHandle.createWritable();
                await writable.write(file);
                await writable.close();
                await entry.remove()
                await getList("fileList");
                await getList("deleteList");
            }
        }
        getList("fileList");
        getList("deleteList");

        otherFileProblem = [];
        storeSelectMove = [];
        document.getElementById('syn-file-problem').disabled = true;
        document.getElementById('btn-delete').disabled = true;
    });



    async function synFile() {

        try {
            let recordedVideo = fileToUpload.filter(file => file.name.toLowerCase().endsWith('.webm'))
            console.log(recordedVideo, 'recordedVideo');
            for (let i = 0; i < recordedVideo.length; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                const file = recordedVideo[i];

                try {
                    let siteId = null;
                    let hash = null;
                    let invoice = null;
                    let name_file = file.name.split("_");

                    // ถ้าแตกมาแล้วได้ 3 array และ siteId ตัวเลขเท่านั้น และ invoice เริ่มด้วย INV
                    if (name_file.length == 3 
                        && isOnlyDigits(name_file[0])
                        && name_file[1].substring(0, 3) === 'INV'
                    ) {
                        name_file[2] = name_file[2].split(".")[0];
                        siteId = name_file[0];
                        invoice = name_file[1]
                        hash = name_file[2];

                        statusUpload = true;
                        let url = `${APIURL}/api/v2/site/${siteId}/pack-upload/${invoice}/pre-signed-put?hash=${hash}`
                        let response_presigned = await axios.get(url, {
                            headers: {
                                'Authorization': `Bearer ` + getApiKey()
                            }
                        });

                        let linkSigned

                        try {
                            
                            linkSigned = response_presigned.data['pre-signed'];

                            // ดึง data ของ file เพื่อทำการอัพโหลด
                            const fileData = await file.getFile();

                            // upload to digital ocean
                            const response = await axios.put(linkSigned, fileData, {
                                onUploadProgress: (progressEvent) => {
                                    percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                                    document.getElementById("progress_bar").style.width = `${percentCompleted}%`;
                                    document.getElementById("progress_bar").innerHTML = `${percentCompleted}%`;
                                    document.getElementById("name-file").innerText = file.name;
                                    progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                                }
                            });

                            if (response.status === 200) {
                                console.log('TRUE-success');
                                document.getElementById("name-file").innerText = '';
                                document.getElementById("progress_bar").style.width = `0%`;
                                document.getElementById("progress_bar").innerHTML = `0%`;
                                await new Promise(resolve => setTimeout(resolve, 500));
    
                                // ย้ายไฟล์ไปไว้ในโฟลเดอร์ archive
                                const newHandle = await archiveFolder.getFileHandle(file.name, { create: true });
                                const fileToMove = await file.getFile();
                                const writable = await newHandle.createWritable();
                                await writable.write(fileToMove);
                                await writable.close();
                                await file.remove();
                                await getList("fileList");
                                await getList("deleteList");
    
                                progress = "0"

                                await updataUploadDt(siteId, invoice, hash);
                            }else{
                                throw new Error('อัพโหลดไม่สำเร็จ');
                            }

                        } catch (error) {
                            console.log('เกิดข้อผิดพลาดในการอัพโหลด:', error.message);
                            linkSigned = null;
                            throw new Error('อัพโหลดไม่สำเร็จ');
                        }

                        
                    }else{
                        // มีปัญหาย้ายไป problem folder
                        throw new Error('รูปแบบของ file ไม่ถูกต้อง');
                    }
                    

                } catch (error) {
                    // มีปัญหาย้ายไป problem folder
                    console.log('เกิดข้อผิดพลาดในการอัพโหลด:', error.message);
                    const newHandle = await problemFolder.getFileHandle(file.name, { create: true });
                    const fileToMove = await file.getFile();
                    const writable = await newHandle.createWritable();
                    await writable.write(fileToMove);
                    await writable.close();
                    await file.remove();
                    await getList("fileList");
                    await getList("deleteList");
                }
            }

        } catch (error) {
            console.error('เกิดข้อผิดพลาด:', error);
        }

        statusUpload = false
        fileToUpload = [];
    };

    document.getElementById("deleteList").addEventListener("input", (e) => {
        if (e.target.type === "checkbox") {
            if (e.target.checked) {
                storeDelete.push(e.target.value);
            } else {
                const index = storeDelete.indexOf(e.target.value);
                if (index > -1) {
                    storeDelete.splice(index, 1);
                }
            }
        }
    });

    async function updataUploadDt(siteId, invoice, hash) {
        console.log(siteId, invoice, hash, 'siteId, invoice, hash');
        try {
            let url = `${APIURL}/api/v2/site/${siteId}/pack-upload/${invoice}/uploaded`

            let requestBody = {
                hash: hash,
                upload_dt: formatDateTime(new Date())
            }

            let response = await axios.patch(url, requestBody, {
                headers: {
                    'Authorization': `Bearer ` + getApiKey()
                }
            });

            console.log(response, 'response');
        } catch (error) {
            console.log('เกิดข้อผิดพลาดในการอัพเดทเวลาอัพโหลด:', error.message);
        }
    }

    async function getList(str) {
        
        if (str === "fileList") {
            if (!folderHandle) return;
        }

        const fileList = document.getElementById(str);
        fileList.innerHTML = ""; // Clear previous list
        // Iterate through all files in the directory


        if (str === "fileList") {

            try {
                let dataText = ""
                let checkFolder = []
                for await (const entry of folderHandle?.values() || []) {

                    if (entry.kind == 'directory' && entry.name == 'archive') {
                        checkFolder.push(entry.name);
                        archiveFolder = entry
                    }
                    else if (entry.kind == 'directory' && entry.name == 'problem') {
                        problemFolder = entry
                        checkFolder.push(entry.name);
                    }
                    else {
                        if (entry.kind == 'file') {
                            // หา file ที่นามสกุล .webm
                            if (entry.name.toLowerCase().endsWith('.webm')) {
                                // ถ้าไม่มีใน fileToUpload ให้เพิ่มเข้าไป
                                if (!fileToUpload.some(file => file.name === entry.name)) {
                                    fileToUpload.push(entry)
                                }
                            }
                            dataText += entry.name + "\n";
                        }
                    }
                }

                // สร้างโฟลเดอร์ที่ขาด
                if (!checkFolder.includes('archive')) {
                    archiveFolder = await folderHandle.getDirectoryHandle('archive', { create: true });
                }
                if (!checkFolder.includes('problem')) {
                    problemFolder = await folderHandle.getDirectoryHandle('problem', { create: true });
                }

                dataText = dataText.split('\n')
                    .filter(name => name.toLowerCase().endsWith('.webm'))
                    .join('\n');

                document.getElementById("fileList").innerText = dataText;
            } catch (error) {
                console.error('Error processing files:', error);
            }
        }
        //  file-problem
        else if (str === "deleteList") {

            let dataText = "";
            for await (const entry of problemFolder.values()) {
                if (entry.kind == 'file') {
                    if (entry.name.toLowerCase().endsWith('.webm')) {
                        // otherFile.push(entry)
                    }
                    dataText += entry.name + "\n";
                    if (entry.name.toLowerCase().endsWith('.webm')) {
                        document.getElementById("deleteList").innerHTML += `<div class="px-2 a-click" onclick='selectMove(event)' id='${entry.name}'>${entry.name}</div>`;
                    }
                }
            }

        }
    }

    // Request user permission to access a folder
    document
        .getElementById("selectFolder")
        .addEventListener("click", async () => {
            try {
                folderHandle = await window.showDirectoryPicker({ mode: "readwrite" });

                // เช็คโฟลเดอร์ย่อยทั้งหมด
                let hasArchive = false;
                let hasProblem = false;

                // วนตรวจสอบโฟลเดอร์ย่อย
                for await (const entry of folderHandle.values()) {
                    if (entry.kind === 'directory') {
                        if (entry.name === 'archive') {
                            hasArchive = true;
                            archiveFolder = entry;
                        }
                        if (entry.name === 'problem') {
                            hasProblem = true;
                            problemFolder = entry;
                        }
                    }
                }

                // สร้างโฟลเดอร์ที่ขาดไป
                if (!hasArchive) {
                    archiveFolder = await folderHandle.getDirectoryHandle('archive', { create: true });
                }
                if (!hasProblem) {
                    problemFolder = await folderHandle.getDirectoryHandle('problem', { create: true });
                }

                try {
                    await saveDirHandle(folderHandle);

                } catch (dbError) {
                    console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูลใน IndexedDB:', dbError);
                }

                setFolder();
            } catch (error) {
                console.error("Folder selection canceled:", error);
            }
        });

        // กดบันทึก apikey
        document.getElementById('saveApiKey').addEventListener('click', function () {
            const apiKey = document.getElementById('apiKey').value;
        
            // ตรวจสอบความยาวของ API Key
            if (apiKey.length !== 32) {
                // สร้าง alert แจ้งเตือน
                alert('กรุณากรอก API Key ให้ครบ 32 ตัวอักษร');
                return;
            }
        
            // ถ้าผ่านการตรวจสอบ จึงบันทึกค่า
            localStorage.setItem('apiKey', apiKey);
        
            // ปิด Modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
            modal.hide();
        
            // ตรวจสอบและซ่อน/แสดง warning
            checkAndToggleApiKeyWarning();
        
            // แจ้งเตือนว่าบันทึกสำเร็จ
            alert('บันทึก API Key เรียบร้อยแล้ว');
        });
        
        // โหลด API Key เมื่อเปิด Modal
        document.getElementById('settingsModal').addEventListener('show.bs.modal', function () {
            const apiKey = localStorage.getItem('apiKey') || '';
            document.getElementById('apiKey').value = apiKey;
        });
        
        
        // ฟังก์ชันสำหรับดึง API Key
        function getApiKey() {
            const apiKey = localStorage.getItem('apiKey') || '';
            return apiKey;
        }
        
        // ฟังก์ชันสำหรับตรวจสอบและซ่อน/แสดง warning
        function checkAndToggleApiKeyWarning() {
            const apiKey = localStorage.getItem('apiKey');
            const warningElement = document.getElementById('apiKeyWarning');
            const selectFolderBtn = document.getElementById('selectFolder');
        
            if (apiKey && apiKey.length === 32) {
                warningElement.classList.add('d-none');
                selectFolderBtn.disabled = false;
                // เช็คว่ามี folderhandle หรือยัง
                setFolder();
            } else {
                warningElement.classList.remove('d-none');
                selectFolderBtn.disabled = true;
            }
        }
        
        // เรียกใช้ตอนโหลดหน้า
        document.addEventListener('DOMContentLoaded', () => {
            // เช็คว่าเป็น apikey หรือยัง
            checkAndToggleApiKeyWarning();
        });

        function isOnlyDigits(str) {
            return /^\d+$/.test(str);
        }

        function formatDateTime(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
        
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        }

} catch (error) {
    alert(error.message);
    // console.log(error.message);
}

