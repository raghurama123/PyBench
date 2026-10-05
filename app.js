// ============================================================
// GLOBAL SETTINGS
// ============================================================

let pyodide = null;
let editor = null;
let autosaveTimer = null;
let currentSessionName = "";
let localWorkspaceHandle = null;
let localWorkspaceConnected = false;
let workspaceFileOrigins = new Map();

const DATA_DIR = "/data";
const WORKBENCH_DIR = "/data/.workbench";
const SESSION_DIR = "/data/.workbench/sessions";
const DRAFT_FILE = "/data/.workbench/current.json";

const HANDLE_DB_NAME = "python-workbench-handles";
const HANDLE_DB_VERSION = 1;
const HANDLE_STORE_NAME = "handles";
const HANDLE_KEY = "local-workspace";

const LOCAL_DIRS = {
  data: "data",
  scripts: "scripts",
  sessions: "sessions",
  output: "output"
};

const AUTOSAVE_LOCAL_FILE = "_autosave.json";

const DEFAULT_CODE = `import pandas as pd
import numpy as np

# Replace "data.csv" with your uploaded filename
df = pd.read_csv("data.csv")

print(df.head())
print()
print(df.describe())`;


// Workbench tabs keep independent editor buffers.
let workbenchTabs = [];
let activeWorkbenchTabId = null;
let nextWorkbenchTabNumber = 1;
let suppressWorkbenchSync = false;


// ============================================================
// DOM ELEMENTS
// ============================================================

const statusElement = document.getElementById("status");
const runButton = document.getElementById("runButton");
const outputElement = document.getElementById("output");
const fileInput = document.getElementById("fileInput");
const uploadedFilesElement = document.getElementById("uploadedFiles");
const previewFile = document.getElementById("previewFile");
const previewButton = document.getElementById("previewButton");
const previewArea = document.getElementById("previewArea");
const plotArea = document.getElementById("plotArea");
const refreshFilesButton = document.getElementById("refreshFilesButton");
const clearAllButton = document.getElementById("clearAllButton");
const downloadFilename = document.getElementById("downloadFilename");
const downloadButton = document.getElementById("downloadButton");
const generatedFiles = document.getElementById("generatedFiles");
const exampleButton = document.getElementById("exampleButton");
const plotExampleButton = document.getElementById("plotExampleButton");
const clearButton = document.getElementById("clearButton");

const sessionSelect = document.getElementById("sessionSelect");
const newSessionButton = document.getElementById("newSessionButton");
const saveSessionButton = document.getElementById("saveSessionButton");
const saveAsSessionButton = document.getElementById("saveAsSessionButton");
const deleteSessionButton = document.getElementById("deleteSessionButton");
const openPyInput = document.getElementById("openPyInput");
const downloadPyButton = document.getElementById("downloadPyButton");
const autosaveStatus = document.getElementById("autosaveStatus");
const copyButton = document.getElementById("copyButton");
const workbenchTabsElement = document.getElementById("workbenchTabs");
const newWorkbenchTabButton = document.getElementById("newWorkbenchTabButton");

const chooseWorkspaceButton = document.getElementById("chooseWorkspaceButton");
const reconnectWorkspaceButton = document.getElementById("reconnectWorkspaceButton");
const syncWorkspaceButton = document.getElementById("syncWorkspaceButton");
const disconnectWorkspaceButton = document.getElementById("disconnectWorkspaceButton");
const workspaceCard = document.getElementById("workspaceCard");
const workspaceName = document.getElementById("workspaceName");
const workspaceStatusText = document.getElementById("workspaceStatusText");

const editorResizable = document.getElementById("editorResizable");
const editorWindowBar = document.getElementById("editorWindowBar");
const editorSmallButton = document.getElementById("editorSmallButton");
const editorLargeButton = document.getElementById("editorLargeButton");
const editorFullscreenButton = document.getElementById("editorFullscreenButton");
const editorFloatButton = document.getElementById("editorFloatButton");


// ============================================================
// ACE EDITOR
// ============================================================

function initializeEditor() {

  if (typeof ace === "undefined") {
    throw new Error("Ace Editor failed to load.");
  }

  editor = ace.edit("pythonEditor");

  editor.setTheme("ace/theme/monokai");

  editor.session.setMode("ace/mode/python");

  editor.session.setUseSoftTabs(true);

  editor.session.setTabSize(4);

  editor.session.setUseWrapMode(false);

  editor.setShowPrintMargin(false);

  editor.setHighlightActiveLine(true);

  editor.setOptions({
    fontSize: "14px",
    showLineNumbers: true,
    showGutter: true,
    highlightSelectedWord: true,
    enableBasicAutocompletion: false,
    enableLiveAutocompletion: false,
    enableSnippets: false
  });

  editor.setValue(
    DEFAULT_CODE,
    -1
  );


  // Ctrl/Cmd + Enter → run

  editor.commands.addCommand({

    name: "runPython",

    bindKey: {
      win: "Ctrl-Enter",
      mac: "Command-Enter"
    },

    exec: () => runPython()

  });


  // Ctrl/Cmd + S → save

  editor.commands.addCommand({

    name: "saveWorkbenchSession",

    bindKey: {
      win: "Ctrl-S",
      mac: "Command-S"
    },

    exec: () => saveCurrentSession()

  });


  // Ctrl/Cmd + Shift + S → Save As

  editor.commands.addCommand({

    name: "saveWorkbenchSessionAs",

    bindKey: {
      win: "Ctrl-Shift-S",
      mac: "Command-Shift-S"
    },

    exec: () => saveSessionAs()

  });


  editor.session.on(
    "change",
    () => {
      syncActiveWorkbenchTabFromEditor();
      scheduleAutosave();
    }
  );

  initializeWorkbenchTabs();
  initializeEditorWindowControls();

}



// ============================================================
// WORKBENCH TABS
// ============================================================

function initializeWorkbenchTabs() {
  workbenchTabs = [];
  activeWorkbenchTabId = null;
  nextWorkbenchTabNumber = 1;

  const scratch = createWorkbenchTab("Scratch 1", DEFAULT_CODE, { activate: true, closable: false });
  nextWorkbenchTabNumber = 2;

  newWorkbenchTabButton?.addEventListener("click", () => {
    createWorkbenchTab(`Scratch ${nextWorkbenchTabNumber++}`, "# Write Python code here\n", { activate: true });
    editor.focus();
  });

  if (newWorkbenchTabButton) newWorkbenchTabButton.disabled = false;
  return scratch;
}

function createWorkbenchTab(name, code = "", options = {}) {
  const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tab = {
    id,
    name,
    code,
    kind: options.kind || "scratch",
    closable: options.closable !== false
  };
  workbenchTabs.push(tab);
  renderWorkbenchTabs();
  if (options.activate !== false) activateWorkbenchTab(id);
  return tab;
}

function renderWorkbenchTabs() {
  if (!workbenchTabsElement) return;
  workbenchTabsElement.innerHTML = "";

  for (const tab of workbenchTabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workbench-tab" + (tab.id === activeWorkbenchTabId ? " active" : "");
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", tab.id === activeWorkbenchTabId ? "true" : "false");

    const label = document.createElement("span");
    label.textContent = tab.name;
    button.appendChild(label);

    if (tab.closable) {
      const close = document.createElement("span");
      close.className = "workbench-tab-close";
      close.textContent = "×";
      close.title = "Close tab";
      close.addEventListener("click", (event) => {
        event.stopPropagation();
        closeWorkbenchTab(tab.id);
      });
      button.appendChild(close);
    }

    button.addEventListener("click", () => activateWorkbenchTab(tab.id));
    workbenchTabsElement.appendChild(button);
  }
}

function syncActiveWorkbenchTabFromEditor() {
  if (suppressWorkbenchSync || !editor || !activeWorkbenchTabId) return;
  const tab = workbenchTabs.find(item => item.id === activeWorkbenchTabId);
  if (tab) tab.code = editor.getValue();
}

function activateWorkbenchTab(id) {
  if (!editor) return;
  syncActiveWorkbenchTabFromEditor();
  const tab = workbenchTabs.find(item => item.id === id);
  if (!tab) return;

  activeWorkbenchTabId = id;
  suppressWorkbenchSync = true;
  editor.setValue(tab.code || "", -1);
  suppressWorkbenchSync = false;
  renderWorkbenchTabs();
  editor.resize();
}

function closeWorkbenchTab(id) {
  const index = workbenchTabs.findIndex(item => item.id === id);
  if (index < 0 || !workbenchTabs[index].closable) return;

  const wasActive = activeWorkbenchTabId === id;
  workbenchTabs.splice(index, 1);

  if (wasActive) {
    const replacement = workbenchTabs[Math.max(0, index - 1)] || workbenchTabs[0];
    activeWorkbenchTabId = null;
    if (replacement) activateWorkbenchTab(replacement.id);
  } else {
    renderWorkbenchTabs();
  }
}

function loadCodeIntoWorkbenchTab(name, code, kind = "example") {
  syncActiveWorkbenchTabFromEditor();

  let tab = workbenchTabs.find(item => item.kind === kind && kind === "example");
  if (!tab) {
    tab = createWorkbenchTab(name, code, { kind, activate: false });
  } else {
    tab.name = name;
    tab.code = code;
  }

  activateWorkbenchTab(tab.id);
  return tab;
}

// ============================================================
// RESIZABLE / FLOATING EDITOR WINDOW
// ============================================================

function initializeEditorWindowControls() {

  if (!editorResizable || !editor) {
    return;
  }


  // Keep Ace correctly sized when container is resized.

  const resizeObserver =
    new ResizeObserver(() => {

      editor.resize();

    });


  resizeObserver.observe(
    editorResizable
  );


  editorSmallButton.addEventListener(
    "click",
    () => setEditorPreset("small")
  );


  editorLargeButton.addEventListener(
    "click",
    () => setEditorPreset("large")
  );


  editorFullscreenButton.addEventListener(
    "click",
    toggleEditorFullscreen
  );


  editorFloatButton.addEventListener(
    "click",
    toggleEditorFloat
  );


  // ----------------------------------------------------------
  // ESCAPE EXITS FULL SCREEN
  // ----------------------------------------------------------

  document.addEventListener(
    "keydown",
    event => {

      if (event.key !== "Escape") {
        return;
      }


      if (
        editorResizable.classList.contains(
          "editor-fullscreen"
        )
      ) {

        editorResizable.classList.remove(
          "editor-fullscreen"
        );


        document.body.classList.remove(
          "editor-overlay-active"
        );


        editorFullscreenButton.textContent =
          "Full screen";


        requestAnimationFrame(
          () => editor.resize()
        );

      }

    }
  );


  // ----------------------------------------------------------
  // FLOATING EDITOR DRAGGING
  // ----------------------------------------------------------

  let dragging = false;

  let dragOffsetX = 0;

  let dragOffsetY = 0;


  editorWindowBar.addEventListener(
    "pointerdown",
    event => {

      if (
        !editorResizable.classList.contains(
          "editor-floating"
        )
      ) {
        return;
      }


      if (event.button !== 0) {
        return;
      }


      const rect =
        editorResizable.getBoundingClientRect();


      dragging = true;


      dragOffsetX =
        event.clientX -
        rect.left;


      dragOffsetY =
        event.clientY -
        rect.top;


      editorWindowBar.setPointerCapture(
        event.pointerId
      );


      event.preventDefault();

    }
  );


  editorWindowBar.addEventListener(
    "pointermove",
    event => {

      if (!dragging) {
        return;
      }


      const rect =
        editorResizable.getBoundingClientRect();


      const maxLeft =
        Math.max(
          0,
          window.innerWidth -
          rect.width
        );


      const maxTop =
        Math.max(
          0,
          window.innerHeight -
          40
        );


      const nextLeft =
        Math.min(
          maxLeft,
          Math.max(
            0,
            event.clientX -
            dragOffsetX
          )
        );


      const nextTop =
        Math.min(
          maxTop,
          Math.max(
            0,
            event.clientY -
            dragOffsetY
          )
        );


      editorResizable.style.left =
        `${nextLeft}px`;


      editorResizable.style.top =
        `${nextTop}px`;

    }
  );


  const endDrag =
    event => {

      if (!dragging) {
        return;
      }


      dragging = false;


      try {

        editorWindowBar.releasePointerCapture(
          event.pointerId
        );

      }

      catch {

        // Ignore.

      }

    };


  editorWindowBar.addEventListener(
    "pointerup",
    endDrag
  );


  editorWindowBar.addEventListener(
    "pointercancel",
    endDrag
  );


  window.addEventListener(
    "resize",
    () => {

      keepFloatingEditorOnScreen();

      editor.resize();

    }
  );

}


// ============================================================
// EDITOR SIZE PRESETS
// ============================================================

function setEditorPreset(size) {

  exitEditorOverlayModes();


  if (size === "small") {

    editorResizable.style.width =
      "100%";

    editorResizable.style.height =
      "350px";

  }

  else if (size === "large") {

    editorResizable.style.width =
      "100%";

    editorResizable.style.height =
      "700px";

  }


  requestAnimationFrame(
    () => editor.resize()
  );

}


// ============================================================
// FULLSCREEN EDITOR
// ============================================================

function toggleEditorFullscreen() {

  const entering =
    !editorResizable.classList.contains(
      "editor-fullscreen"
    );


  editorResizable.classList.remove(
    "editor-floating"
  );


  editorResizable.style.left =
    "";


  editorResizable.style.top =
    "";


  editorResizable.classList.toggle(
    "editor-fullscreen",
    entering
  );


  document.body.classList.toggle(
    "editor-overlay-active",
    entering
  );


  editorFullscreenButton.textContent =
    entering
      ? "Exit full screen"
      : "Full screen";


  editorFloatButton.textContent =
    "Float";


  requestAnimationFrame(
    () => editor.resize()
  );

}


// ============================================================
// FLOATING EDITOR
// ============================================================

function toggleEditorFloat() {

  const entering =
    !editorResizable.classList.contains(
      "editor-floating"
    );


  editorResizable.classList.remove(
    "editor-fullscreen"
  );


  document.body.classList.remove(
    "editor-overlay-active"
  );


  editorFullscreenButton.textContent =
    "Full screen";


  if (entering) {

    editorResizable.classList.add(
      "editor-floating"
    );


    const rect =
      editorResizable.getBoundingClientRect();


    const left =
      Math.max(
        12,
        Math.round(
          (
            window.innerWidth -
            rect.width
          ) /
          2
        )
      );


    const top =
      Math.max(
        12,
        Math.round(
          (
            window.innerHeight -
            rect.height
          ) /
          2
        )
      );


    editorResizable.style.left =
      `${left}px`;


    editorResizable.style.top =
      `${top}px`;


    editorFloatButton.textContent =
      "Dock";

  }

  else {

    editorResizable.classList.remove(
      "editor-floating"
    );


    editorResizable.style.left =
      "";


    editorResizable.style.top =
      "";


    editorResizable.style.width =
      "100%";


    editorResizable.style.height =
      "500px";


    editorFloatButton.textContent =
      "Float";

  }


  requestAnimationFrame(
    () => editor.resize()
  );

}


// ============================================================
// EXIT EDITOR OVERLAY MODES
// ============================================================

function exitEditorOverlayModes() {

  editorResizable.classList.remove(
    "editor-fullscreen",
    "editor-floating"
  );


  document.body.classList.remove(
    "editor-overlay-active"
  );


  editorFullscreenButton.textContent =
    "Full screen";


  editorFloatButton.textContent =
    "Float";


  editorResizable.style.left =
    "";


  editorResizable.style.top =
    "";

}


// ============================================================
// KEEP FLOATING WINDOW ON SCREEN
// ============================================================

function keepFloatingEditorOnScreen() {

  if (
    !editorResizable.classList.contains(
      "editor-floating"
    )
  ) {

    return;

  }


  const rect =
    editorResizable.getBoundingClientRect();


  const left =
    Math.min(
      Math.max(
        0,
        rect.left
      ),

      Math.max(
        0,
        window.innerWidth -
        rect.width
      )
    );


  const top =
    Math.min(
      Math.max(
        0,
        rect.top
      ),

      Math.max(
        0,
        window.innerHeight -
        40
      )
    );


  editorResizable.style.left =
    `${left}px`;


  editorResizable.style.top =
    `${top}px`;

}


// ============================================================
// INDEXEDDB-BACKED PYODIDE FILESYSTEM
// ============================================================

function syncFromIndexedDB() {

  return new Promise(
    (resolve, reject) => {

      pyodide.FS.syncfs(
        true,
        error => {

          if (error) {

            reject(error);

          }

          else {

            resolve();

          }

        }
      );

    }
  );

}


function syncToIndexedDB() {

  return new Promise(
    (resolve, reject) => {

      pyodide.FS.syncfs(
        false,
        error => {

          if (error) {

            reject(error);

          }

          else {

            resolve();

          }

        }
      );

    }
  );

}


// ============================================================
// DIRECTORY HANDLE STORAGE
// ============================================================

function openHandleDB() {

  return new Promise(
    (resolve, reject) => {

      const request =
        indexedDB.open(
          HANDLE_DB_NAME,
          HANDLE_DB_VERSION
        );


      request.onupgradeneeded =
        () => {

          const db =
            request.result;


          if (
            !db.objectStoreNames.contains(
              HANDLE_STORE_NAME
            )
          ) {

            db.createObjectStore(
              HANDLE_STORE_NAME
            );

          }

        };


      request.onsuccess =
        () =>
          resolve(
            request.result
          );


      request.onerror =
        () =>
          reject(
            request.error
          );

    }
  );

}


// ============================================================
// SAVE WORKSPACE HANDLE
// ============================================================

async function saveWorkspaceHandle(
  handle
) {

  const db =
    await openHandleDB();


  await new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          HANDLE_STORE_NAME,
          "readwrite"
        );


      tx
        .objectStore(
          HANDLE_STORE_NAME
        )
        .put(
          handle,
          HANDLE_KEY
        );


      tx.oncomplete =
        resolve;


      tx.onerror =
        () =>
          reject(
            tx.error
          );

    }
  );


  db.close();

}


// ============================================================
// LOAD WORKSPACE HANDLE
// ============================================================

async function loadWorkspaceHandle() {

  const db =
    await openHandleDB();


  const handle =
    await new Promise(
      (resolve, reject) => {

        const tx =
          db.transaction(
            HANDLE_STORE_NAME,
            "readonly"
          );


        const request =
          tx
            .objectStore(
              HANDLE_STORE_NAME
            )
            .get(
              HANDLE_KEY
            );


        request.onsuccess =
          () =>
            resolve(
              request.result ||
              null
            );


        request.onerror =
          () =>
            reject(
              request.error
            );

      }
    );


  db.close();


  return handle;

}


// ============================================================
// FORGET WORKSPACE HANDLE
// ============================================================

async function forgetWorkspaceHandle() {

  const db =
    await openHandleDB();


  await new Promise(
    (resolve, reject) => {

      const tx =
        db.transaction(
          HANDLE_STORE_NAME,
          "readwrite"
        );


      tx
        .objectStore(
          HANDLE_STORE_NAME
        )
        .delete(
          HANDLE_KEY
        );


      tx.oncomplete =
        resolve;


      tx.onerror =
        () =>
          reject(
            tx.error
          );

    }
  );


  db.close();

}


// ============================================================
// GENERIC PYODIDE FILESYSTEM HELPERS
// ============================================================

function ensureDirectory(path) {

  try {

    pyodide.FS.mkdir(
      path
    );

  }

  catch (error) {

    try {

      const stat =
        pyodide.FS.stat(
          path
        );


      if (
        !pyodide.FS.isDir(
          stat.mode
        )
      ) {

        throw error;

      }

    }

    catch {

      throw error;

    }

  }

}


function writeTextFile(
  path,
  text
) {

  pyodide.FS.writeFile(
    path,
    new TextEncoder()
      .encode(
        text
      )
  );

}


function readTextFile(path) {

  return new TextDecoder()
    .decode(
      pyodide.FS.readFile(
        path
      )
    );

}


function fileExists(path) {

  try {

    pyodide.FS.stat(
      path
    );

    return true;

  }

  catch {

    return false;

  }

}


function safeSessionFilename(name) {

  return name
    .trim()
    .replace(
      /[\\/:*?"<>|]/g,
      "_"
    )
    .replace(
      /\s+/g,
      " "
    )
    .slice(
      0,
      120
    );

}


function sessionPath(name) {

  return (
    `${SESSION_DIR}/` +
    `${safeSessionFilename(name)}.json`
  );

}


// ============================================================
// LOCAL WORKSPACE HELPERS
// ============================================================

function supportsLocalWorkspace() {

  return (
    "showDirectoryPicker"
    in window
  );

}


// ============================================================
// GET LOCAL SUBDIRECTORY
// ============================================================

async function getLocalSubdir(
  key,
  create = true
) {

  if (!localWorkspaceHandle) {

    throw new Error(
      "No local workspace is connected."
    );

  }


  return await localWorkspaceHandle
    .getDirectoryHandle(
      LOCAL_DIRS[key],
      {
        create
      }
    );

}


// ============================================================
// CREATE LOCAL WORKSPACE FOLDERS
// ============================================================

async function ensureLocalWorkspaceLayout() {

  for (
    const key of Object.keys(
      LOCAL_DIRS
    )
  ) {

    await getLocalSubdir(
      key,
      true
    );

  }

}


// ============================================================
// WRITE FILE TO LOCAL DIRECTORY
// ============================================================

async function writeFileToDirectory(
  dirHandle,
  filename,
  bytes
) {

  const fileHandle =
    await dirHandle
      .getFileHandle(
        filename,
        {
          create: true
        }
      );


  const writable =
    await fileHandle
      .createWritable();


  await writable.write(
    bytes
  );


  await writable.close();

}


// ============================================================
// WRITE LOCAL TEXT
// ============================================================

async function writeLocalText(
  folderKey,
  filename,
  text
) {

  const dir =
    await getLocalSubdir(
      folderKey,
      true
    );


  await writeFileToDirectory(
    dir,
    filename,
    text
  );

}


// ============================================================
// WRITE LOCAL BYTES
// ============================================================

async function writeLocalBytes(
  folderKey,
  filename,
  bytes
) {

  const dir =
    await getLocalSubdir(
      folderKey,
      true
    );


  await writeFileToDirectory(
    dir,
    filename,
    bytes
  );

}


// ============================================================
// READ LOCAL DIRECTORY FILES
// ============================================================

async function readLocalDirectoryFiles(
  folderKey
) {

  const dir =
    await getLocalSubdir(
      folderKey,
      true
    );


  const files = [];


  for await (
    const [
      name,
      handle
    ]
    of dir.entries()
  ) {

    if (
      handle.kind !== "file"
    ) {

      continue;

    }


    const file =
      await handle.getFile();


    files.push({
      name,
      file
    });

  }


  return files;

}


// ============================================================
// DELETE LOCAL FILE
// ============================================================

async function deleteLocalFile(
  folderKey,
  filename
) {

  const dir =
    await getLocalSubdir(
      folderKey,
      true
    );


  try {

    await dir.removeEntry(
      filename
    );

  }

  catch (error) {

    if (
      error &&
      error.name !== "NotFoundError"
    ) {

      throw error;

    }

  }

}


// ============================================================
// TEST LOCAL FILE EXISTENCE
// ============================================================

async function localFileExists(
  folderKey,
  filename
) {

  try {

    const dir =
      await getLocalSubdir(
        folderKey,
        true
      );


    await dir.getFileHandle(
      filename
    );


    return true;

  }

  catch {

    return false;

  }

}


// ============================================================
// WORKSPACE UI
// ============================================================

function updateWorkspaceUI(
  state,
  message = ""
) {

  workspaceCard.classList.remove(
    "connected",
    "disconnected",
    "needs-permission"
  );


  if (
    state === "connected"
  ) {

    workspaceCard.classList.add(
      "connected"
    );


    workspaceName.textContent =
      localWorkspaceHandle?.name ||
      "Local workspace";


    workspaceStatusText.textContent =
      message ||
      "Connected to local folder.";


    reconnectWorkspaceButton.disabled =
      true;


    syncWorkspaceButton.disabled =
      false;


    disconnectWorkspaceButton.disabled =
      false;

  }

  else if (
    state === "permission"
  ) {

    workspaceCard.classList.add(
      "needs-permission"
    );


    workspaceName.textContent =
      localWorkspaceHandle?.name ||
      "Saved local workspace";


    workspaceStatusText.textContent =
      message ||
      "Permission is required to reconnect.";


    reconnectWorkspaceButton.disabled =
      false;


    syncWorkspaceButton.disabled =
      true;


    disconnectWorkspaceButton.disabled =
      false;

  }

  else {

    workspaceCard.classList.add(
      "disconnected"
    );


    workspaceName.textContent =
      "Browser storage only";


    workspaceStatusText.textContent =
      message ||
      "No local folder connected.";


    reconnectWorkspaceButton.disabled =
      true;


    syncWorkspaceButton.disabled =
      true;


    disconnectWorkspaceButton.disabled =
      true;

  }

}


// ============================================================
// REQUEST WORKSPACE PERMISSION
// ============================================================

async function requestWorkspacePermission(
  handle
) {

  if (!handle) {

    return false;

  }


  const options = {
    mode: "readwrite"
  };


  if (
    (
      await handle.queryPermission(
        options
      )
    ) === "granted"
  ) {

    return true;

  }


  return (
    await handle.requestPermission(
      options
    )
  ) === "granted";

}


// ============================================================
// RECOVER REMEMBERED WORKSPACE
// ============================================================

async function recoverRememberedWorkspace() {

  if (
    !supportsLocalWorkspace()
  ) {

    chooseWorkspaceButton.disabled =
      true;


    updateWorkspaceUI(
      "disconnected",
      "Direct folder access is not supported by this browser. IndexedDB fallback is active."
    );


    return;

  }


  try {

    const handle =
      await loadWorkspaceHandle();


    if (!handle) {

      updateWorkspaceUI(
        "disconnected"
      );

      return;

    }


    localWorkspaceHandle =
      handle;


    const permission =
      await handle.queryPermission({
        mode: "readwrite"
      });


    if (
      permission === "granted"
    ) {

      await activateLocalWorkspace(
        false
      );

    }

    else {

      updateWorkspaceUI(
        "permission",
        "Click Reconnect to grant access to this folder again."
      );

    }

  }

  catch (error) {

    console.warn(
      "Could not recover saved workspace handle:",
      error
    );


    updateWorkspaceUI(
      "disconnected",
      "Saved workspace could not be restored; browser storage is active."
    );

  }

}


// ============================================================
// ACTIVATE LOCAL WORKSPACE
// ============================================================

async function activateLocalWorkspace(
  requestPermission = true
) {

  if (!localWorkspaceHandle) {

    return false;

  }


  if (requestPermission) {

    const granted =
      await requestWorkspacePermission(
        localWorkspaceHandle
      );


    if (!granted) {

      updateWorkspaceUI(
        "permission",
        "Permission was not granted."
      );


      return false;

    }

  }


  await ensureLocalWorkspaceLayout();


  localWorkspaceConnected =
    true;


  updateWorkspaceUI(
    "connected",
    "Local folder connected. Loading its files..."
  );


  await hydrateRuntimeFromLocalWorkspace();


  await restoreDraft();


  refreshSessionList();


  refreshFileList();


  updateWorkspaceUI(
    "connected",
    "Local files and sessions are synchronized."
  );


  return true;

}


// ============================================================
// CHOOSE LOCAL WORKSPACE
// ============================================================

async function chooseLocalWorkspace() {

  if (
    !supportsLocalWorkspace()
  ) {

    alert(
      "This browser does not support direct local-folder access. Use Chrome or Edge on GitHub Pages, or continue with browser storage."
    );

    return;

  }


  try {

    const handle =
      await window.showDirectoryPicker({
        mode: "readwrite"
      });


    localWorkspaceHandle =
      handle;


    await saveWorkspaceHandle(
      handle
    );


    await activateLocalWorkspace(
      true
    );

  }

  catch (error) {

    if (
      error?.name !== "AbortError"
    ) {

      console.error(
        error
      );


      alert(
        `Could not open local workspace:\n${error}`
      );

    }

  }

}


// ============================================================
// RECONNECT LOCAL WORKSPACE
// ============================================================

async function reconnectLocalWorkspace() {

  if (!localWorkspaceHandle) {

    await chooseLocalWorkspace();

    return;

  }


  try {

    await activateLocalWorkspace(
      true
    );

  }

  catch (error) {

    console.error(
      error
    );


    alert(
      `Could not reconnect workspace:\n${error}`
    );

  }

}


// ============================================================
// DISCONNECT WORKSPACE
// ============================================================

async function disconnectLocalWorkspace() {

  if (
    !confirm(
      "Disconnect the local workspace?\n\nFiles on disk will not be deleted. The workbench will continue using browser storage."
    )
  ) {

    return;

  }


  localWorkspaceConnected =
    false;


  localWorkspaceHandle =
    null;


  workspaceFileOrigins.clear();


  await forgetWorkspaceHandle();


  updateWorkspaceUI(
    "disconnected",
    "Local workspace disconnected. Browser storage remains active."
  );


  refreshFileList();

}


// ============================================================
// MIRROR LOCAL WORKSPACE INTO PYODIDE
// ============================================================

async function hydrateRuntimeFromLocalWorkspace() {

  if (!localWorkspaceConnected) {

    return;

  }


  workspaceFileOrigins.clear();


  // Remove ordinary runtime files before mirroring local files.

  for (
    const filename of getStoredFiles()
  ) {

    try {

      pyodide.FS.unlink(
        `${DATA_DIR}/${filename}`
      );

    }

    catch {

      // Ignore files that disappear during refresh.

    }

  }


  // data/

  const dataFiles =
    await readLocalDirectoryFiles(
      "data"
    );


  for (
    const {
      name,
      file
    }
    of dataFiles
  ) {

    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );


    pyodide.FS.writeFile(
      `${DATA_DIR}/${name}`,
      bytes
    );


    workspaceFileOrigins.set(
      name,
      "data"
    );

  }


  // output/

  const outputFiles =
    await readLocalDirectoryFiles(
      "output"
    );


  for (
    const {
      name,
      file
    }
    of outputFiles
  ) {

    // Input/data version wins on collision.

    if (
      workspaceFileOrigins.has(
        name
      )
    ) {

      continue;

    }


    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );


    pyodide.FS.writeFile(
      `${DATA_DIR}/${name}`,
      bytes
    );


    workspaceFileOrigins.set(
      name,
      "output"
    );

  }


  // Remove internal session mirrors.

  for (
    const filename of getInternalSessionFiles()
  ) {

    try {

      pyodide.FS.unlink(
        `${SESSION_DIR}/${filename}`
      );

    }

    catch {

      // Ignore.

    }

  }


  // sessions/

  const sessionFiles =
    await readLocalDirectoryFiles(
      "sessions"
    );


  for (
    const {
      name,
      file
    }
    of sessionFiles
  ) {

    if (
      !name.endsWith(
        ".json"
      )
    ) {

      continue;

    }


    const text =
      await file.text();


    if (
      name === AUTOSAVE_LOCAL_FILE
    ) {

      writeTextFile(
        DRAFT_FILE,
        text
      );

    }

    else {

      writeTextFile(
        `${SESSION_DIR}/${name}`,
        text
      );

    }

  }


  await syncToIndexedDB();

}


// ============================================================
// SYNCHRONIZE RUNTIME FILES TO LOCAL WORKSPACE
// ============================================================

async function syncRuntimeToLocalWorkspace(
  changedNames = null
) {

  if (!localWorkspaceConnected) {

    return;

  }


  const names =
    changedNames ||
    getStoredFiles();


  for (
    const filename of names
  ) {

    if (
      !fileExists(
        `${DATA_DIR}/${filename}`
      )
    ) {

      continue;

    }


    const bytes =
      pyodide.FS.readFile(
        `${DATA_DIR}/${filename}`
      );


    const origin =
      workspaceFileOrigins.get(
        filename
      ) ||
      "output";


    await writeLocalBytes(
      origin,
      filename,
      bytes
    );


    workspaceFileOrigins.set(
      filename,
      origin
    );

  }


  await syncSessionStorageToLocal();

}


// ============================================================
// SYNCHRONIZE SESSION STORAGE TO LOCAL
// ============================================================

async function syncSessionStorageToLocal() {

  if (!localWorkspaceConnected) {

    return;

  }


  if (
    fileExists(
      DRAFT_FILE
    )
  ) {

    await writeLocalText(
      "sessions",
      AUTOSAVE_LOCAL_FILE,
      readTextFile(
        DRAFT_FILE
      )
    );

  }


  for (
    const filename of getInternalSessionFiles()
  ) {

    await writeLocalText(
      "sessions",
      filename,
      readTextFile(
        `${SESSION_DIR}/${filename}`
      )
    );

  }

}


// ============================================================
// SAVE SCRIPT TO LOCAL WORKSPACE
// ============================================================

async function syncCurrentScriptToLocal(
  name,
  code
) {

  if (
    !localWorkspaceConnected ||
    !name
  ) {

    return;

  }


  const base =
    safeSessionFilename(
      name
    ) ||
    "analysis";


  await writeLocalText(
    "scripts",
    `${base}.py`,
    code
  );

}


// ============================================================
// SNAPSHOT RUNTIME FILES
// ============================================================

function snapshotRuntimeFiles() {

  const snapshot =
    new Map();


  for (
    const name of getStoredFiles()
  ) {

    try {

      const stat =
        pyodide.FS.stat(
          `${DATA_DIR}/${name}`
        );


      snapshot.set(
        name,
        {
          size:
            stat.size,

          mtime:
            stat.mtime instanceof Date
              ? stat.mtime.getTime()
              : Number(
                  stat.mtime
                ) ||
                0
        }
      );

    }

    catch {

      // Ignore.

    }

  }


  return snapshot;

}


// ============================================================
// DETECT CHANGED RUNTIME FILES
// ============================================================

function changedRuntimeFiles(
  before
) {

  const changed = [];


  for (
    const name of getStoredFiles()
  ) {

    const stat =
      pyodide.FS.stat(
        `${DATA_DIR}/${name}`
      );


    const after = {

      size:
        stat.size,

      mtime:
        stat.mtime instanceof Date
          ? stat.mtime.getTime()
          : Number(
              stat.mtime
            ) ||
            0

    };


    const previous =
      before.get(
        name
      );


    if (
      !previous ||
      previous.size !== after.size ||
      previous.mtime !== after.mtime
    ) {

      changed.push(
        name
      );

    }

  }


  return changed;

}


// ============================================================
// WORKSPACE BUTTONS
// ============================================================

chooseWorkspaceButton.addEventListener(
  "click",
  chooseLocalWorkspace
);


reconnectWorkspaceButton.addEventListener(
  "click",
  reconnectLocalWorkspace
);


disconnectWorkspaceButton.addEventListener(
  "click",
  disconnectLocalWorkspace
);


syncWorkspaceButton.addEventListener(
  "click",
  async () => {

    if (
      !localWorkspaceConnected
    ) {

      return;

    }


    try {

      updateWorkspaceUI(
        "connected",
        "Synchronizing..."
      );


      await syncRuntimeToLocalWorkspace();


      await hydrateRuntimeFromLocalWorkspace();


      refreshSessionList();


      refreshFileList();


      updateWorkspaceUI(
        "connected",
        "Synchronization complete."
      );

    }

    catch (error) {

      console.error(
        error
      );


      updateWorkspaceUI(
        "connected",
        "Synchronization failed; see output."
      );


      outputElement.textContent =
        `Workspace synchronization failed:\n${error}`;

    }

  }
);


// ============================================================
// INITIALIZE PYODIDE
// ============================================================

async function initializePython() {

  try {

    initializeEditor();


    statusElement.textContent =
      "Loading Python...";


    statusElement.className =
      "status loading";


    pyodide =
      await loadPyodide();


    statusElement.textContent =
      "Loading scientific packages...";


    await pyodide.loadPackage([
      "numpy",
      "pandas",
      "matplotlib",
      "scipy"
    ]);


    ensureDirectory(
      DATA_DIR
    );


    pyodide.FS.mount(
      pyodide.FS.filesystems.IDBFS,
      {},
      DATA_DIR
    );


    statusElement.textContent =
      "Restoring browser workspace...";


    await syncFromIndexedDB();


    ensureDirectory(
      WORKBENCH_DIR
    );


    ensureDirectory(
      SESSION_DIR
    );


    pyodide.FS.chdir(
      DATA_DIR
    );


    await pyodide.runPythonAsync(`
import os
import sys
import io
import traceback

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

os.chdir("/data")
    `);


    await recoverRememberedWorkspace();


    if (
      !localWorkspaceConnected
    ) {

      await restoreDraft();

      refreshSessionList();

    }


    statusElement.textContent =
      "Python ready";


    statusElement.className =
      "status ready";


    outputElement.textContent =
      "Python is ready.\n" +
      (
        localWorkspaceConnected

          ? `Local workspace connected: ${localWorkspaceHandle.name}\n`

          : "Persistent browser storage is active.\n"
      ) +
      "Runtime working directory: /data";


    enableControls();


    refreshFileList();

  }

  catch (error) {

    console.error(
      error
    );


    statusElement.textContent =
      "Python failed to load";


    statusElement.className =
      "status error";


    outputElement.textContent =
      error.toString();

  }

}


// ============================================================
// ENABLE CONTROLS
// ============================================================

function enableControls() {

  [
    runButton,
    previewFile,
    previewButton,
    refreshFilesButton,
    clearAllButton,
    downloadFilename,
    downloadButton,
    exampleButton,
    plotExampleButton,
    clearButton,
    sessionSelect,
    newSessionButton,
    saveSessionButton,
    saveAsSessionButton,
    deleteSessionButton,
    downloadPyButton,
    editorSmallButton,
    editorLargeButton,
    editorFullscreenButton,
    editorFloatButton
  ]
    .forEach(
      element => {

        if (element) {

          element.disabled =
            false;

        }

      }
    );

}


// ============================================================
// SESSION / AUTOSAVE
// ============================================================

function getSessionPayload(
  name = currentSessionName
) {

  return {

    version:
      2,

    name:
      name ||
      "",

    code:
      editor.getValue(),

    selectedFile:
      previewFile.value ||
      "",

    workspaceName:
      localWorkspaceConnected
        ? localWorkspaceHandle.name
        : "",

    savedAt:
      new Date()
        .toISOString()

  };

}


// ============================================================
// SCHEDULE AUTOSAVE
// ============================================================

function scheduleAutosave() {

  if (!pyodide) {

    return;

  }


  autosaveStatus.textContent =
    "Unsaved changes...";


  clearTimeout(
    autosaveTimer
  );


  autosaveTimer =
    setTimeout(
      () =>
        autosaveDraft(),
      1000
    );

}


// ============================================================
// AUTOSAVE DRAFT
// ============================================================

async function autosaveDraft() {

  if (
    !pyodide ||
    !editor
  ) {

    return;

  }


  try {

    const payload =
      getSessionPayload();


    writeTextFile(
      DRAFT_FILE,
      JSON.stringify(
        payload,
        null,
        2
      )
    );


    await syncToIndexedDB();


    if (
      localWorkspaceConnected
    ) {

      await writeLocalText(
        "sessions",
        AUTOSAVE_LOCAL_FILE,
        JSON.stringify(
          payload,
          null,
          2
        )
      );

    }


    autosaveStatus.textContent =
      `Autosaved ${
        new Date()
          .toLocaleTimeString(
            [],
            {
              hour:
                "2-digit",

              minute:
                "2-digit",

              second:
                "2-digit"
            }
          )
      }`;

  }

  catch (error) {

    console.error(
      "Autosave failed:",
      error
    );


    autosaveStatus.textContent =
      "Autosave failed";

  }

}


// ============================================================
// RESTORE DRAFT
// ============================================================

async function restoreDraft() {

  if (
    !fileExists(
      DRAFT_FILE
    )
  ) {

    editor.setValue(
      DEFAULT_CODE,
      -1
    );

    return;

  }


  try {

    const payload =
      JSON.parse(
        readTextFile(
          DRAFT_FILE
        )
      );


    if (
      typeof payload.code ===
      "string"
    ) {

      editor.setValue(
        payload.code,
        -1
      );

    }


    currentSessionName =
      payload.name ||
      "";


    autosaveStatus.textContent =
      "Draft restored";

  }

  catch (error) {

    console.warn(
      "Could not restore draft:",
      error
    );


    editor.setValue(
      DEFAULT_CODE,
      -1
    );

  }

}


// ============================================================
// INTERNAL SESSION FILES
// ============================================================

function getInternalSessionFiles() {

  if (
    !pyodide ||
    !fileExists(
      SESSION_DIR
    )
  ) {

    return [];

  }


  return pyodide.FS
    .readdir(
      SESSION_DIR
    )
    .filter(
      name =>
        name !== "." &&
        name !== ".." &&
        name.endsWith(
          ".json"
        )
    );

}


// ============================================================
// SAVED SESSIONS
// ============================================================

function getSavedSessions() {

  return getInternalSessionFiles()
    .map(
      filename => {

        const path =
          `${SESSION_DIR}/${filename}`;


        try {

          const payload =
            JSON.parse(
              readTextFile(
                path
              )
            );


          return {

            filename,

            name:
              payload.name ||
              filename.replace(
                /\.json$/,
                ""
              ),

            savedAt:
              payload.savedAt ||
              ""

          };

        }

        catch {

          return null;

        }

      }
    )
    .filter(
      Boolean
    )
    .sort(
      (a, b) =>
        (
          b.savedAt ||
          ""
        ).localeCompare(
          a.savedAt ||
          ""
        )
    );

}


// ============================================================
// REFRESH SESSION LIST
// ============================================================

function refreshSessionList() {

  const sessions =
    getSavedSessions();


  const previous =
    currentSessionName;


  sessionSelect.innerHTML =
    '<option value="">Untitled analysis</option>';


  for (
    const item of sessions
  ) {

    const option =
      document.createElement(
        "option"
      );


    option.value =
      item.name;


    option.textContent =
      item.name;


    sessionSelect.appendChild(
      option
    );

  }


  if (
    previous &&
    sessions.some(
      item =>
        item.name === previous
    )
  ) {

    sessionSelect.value =
      previous;

  }

  else {

    sessionSelect.value =
      "";

  }

}


// ============================================================
// SAVE NAMED SESSION
// ============================================================

async function saveNamedSession(
  name
) {

  const cleaned =
    safeSessionFilename(
      name
    );


  if (!cleaned) {

    return false;

  }


  currentSessionName =
    cleaned;


  const payload =
    getSessionPayload(
      cleaned
    );


  const json =
    JSON.stringify(
      payload,
      null,
      2
    );


  writeTextFile(
    sessionPath(
      cleaned
    ),
    json
  );


  writeTextFile(
    DRAFT_FILE,
    json
  );


  await syncToIndexedDB();


  if (
    localWorkspaceConnected
  ) {

    await writeLocalText(
      "sessions",
      `${cleaned}.json`,
      json
    );


    await writeLocalText(
      "sessions",
      AUTOSAVE_LOCAL_FILE,
      json
    );


    await syncCurrentScriptToLocal(
      cleaned,
      editor.getValue()
    );

  }


  refreshSessionList();


  sessionSelect.value =
    cleaned;


  autosaveStatus.textContent =
    `Saved ${
      new Date()
        .toLocaleTimeString(
          [],
          {
            hour:
              "2-digit",

            minute:
              "2-digit"
          }
        )
    }`;


  return true;

}


// ============================================================
// SAVE CURRENT SESSION
// ============================================================

async function saveCurrentSession() {

  if (!pyodide) {

    return;

  }


  if (
    !currentSessionName
  ) {

    await saveSessionAs();

    return;

  }


  await saveNamedSession(
    currentSessionName
  );

}


// ============================================================
// SAVE SESSION AS
// ============================================================

async function saveSessionAs() {

  if (!pyodide) {

    return;

  }


  const suggested =
    currentSessionName ||
    "analysis";


  const name =
    window.prompt(
      "Session name:",
      suggested
    );


  if (
    name === null
  ) {

    return;

  }


  const cleaned =
    safeSessionFilename(
      name
    );


  if (!cleaned) {

    alert(
      "Please enter a valid session name."
    );

    return;

  }


  const path =
    sessionPath(
      cleaned
    );


  if (
    fileExists(
      path
    ) &&
    cleaned !== currentSessionName
  ) {

    const overwrite =
      confirm(
        `A session named "${cleaned}" already exists. Replace it?`
      );


    if (!overwrite) {

      return;

    }

  }


  await saveNamedSession(
    cleaned
  );

}


// ============================================================
// LOAD SESSION
// ============================================================

async function loadSession(
  name
) {

  if (!name) {

    currentSessionName =
      "";


    sessionSelect.value =
      "";


    return;

  }


  const path =
    sessionPath(
      name
    );


  if (
    !fileExists(
      path
    )
  ) {

    alert(
      `Session "${name}" could not be found.`
    );


    refreshSessionList();


    return;

  }


  try {

    const payload =
      JSON.parse(
        readTextFile(
          path
        )
      );


    currentSessionName =
      payload.name ||
      name;


    editor.setValue(
      payload.code ||
      "",
      -1
    );


    if (
      payload.selectedFile
    ) {

      const existsInSelect =
        [
          ...previewFile.options
        ]
          .some(
            option =>
              option.value ===
              payload.selectedFile
          );


      if (
        existsInSelect
      ) {

        previewFile.value =
          payload.selectedFile;

      }

    }


    sessionSelect.value =
      currentSessionName;


    autosaveStatus.textContent =
      `Loaded ${currentSessionName}`;


    await autosaveDraft();

  }

  catch (error) {

    alert(
      `Could not load session:\n${error}`
    );

  }

}


// ============================================================
// DELETE CURRENT SESSION
// ============================================================

async function deleteCurrentSession() {

  const name =
    sessionSelect.value ||
    currentSessionName;


  if (!name) {

    alert(
      "No named session is selected."
    );

    return;

  }


  if (
    !confirm(
      `Delete session "${name}"?\n\nData files will not be deleted.`
    )
  ) {

    return;

  }


  const path =
    sessionPath(
      name
    );


  if (
    fileExists(
      path
    )
  ) {

    pyodide.FS.unlink(
      path
    );

  }


  if (
    localWorkspaceConnected
  ) {

    await deleteLocalFile(
      "sessions",
      `${safeSessionFilename(name)}.json`
    );


    await deleteLocalFile(
      "scripts",
      `${safeSessionFilename(name)}.py`
    );

  }


  currentSessionName =
    "";


  await syncToIndexedDB();


  refreshSessionList();


  await autosaveDraft();


  autosaveStatus.textContent =
    `Deleted session ${name}`;

}


// ============================================================
// NEW SESSION
// ============================================================

async function newSession() {

  if (
    editor.getValue().trim() &&
    editor.getValue() !== DEFAULT_CODE
  ) {

    const proceed =
      confirm(
        "Start a new session?\n\nYour current code is autosaved. Save it as a named session if you want a permanent named copy."
      );


    if (!proceed) {

      return;

    }

  }


  currentSessionName =
    "";


  sessionSelect.value =
    "";


  editor.setValue(
    DEFAULT_CODE,
    -1
  );


  previewFile.value =
    "";


  autosaveStatus.textContent =
    "New untitled session";


  await autosaveDraft();

}


// ============================================================
// SESSION EVENTS
// ============================================================

sessionSelect.addEventListener(
  "change",
  async () => {

    const name =
      sessionSelect.value;


    if (!name) {

      currentSessionName =
        "";

      return;

    }


    await loadSession(
      name
    );

  }
);


newSessionButton.addEventListener(
  "click",
  newSession
);


saveSessionButton.addEventListener(
  "click",
  saveCurrentSession
);


saveAsSessionButton.addEventListener(
  "click",
  saveSessionAs
);


deleteSessionButton.addEventListener(
  "click",
  deleteCurrentSession
);


// ============================================================
// OPEN / DOWNLOAD .PY
// ============================================================

openPyInput.addEventListener(
  "change",
  async event => {

    const file =
      event.target.files[0];


    if (!file) {

      return;

    }


    const text =
      await file.text();


    editor.setValue(
      text,
      -1
    );


    currentSessionName =
      file.name.replace(
        /\.py$/i,
        ""
      );


    sessionSelect.value =
      "";


    autosaveStatus.textContent =
      `Opened ${file.name}`;


    if (
      localWorkspaceConnected
    ) {

      await writeLocalText(
        "scripts",
        file.name,
        text
      );

    }


    await autosaveDraft();


    openPyInput.value =
      "";

  }
);


downloadPyButton.addEventListener(
  "click",
  () => {

    const base =
      safeSessionFilename(
        currentSessionName ||
        "analysis"
      ) ||
      "analysis";


    downloadText(
      editor.getValue(),
      `${base}.py`,
      "text/x-python"
    );

  }
);


// ============================================================
// COPY CODE
// ============================================================

copyButton.addEventListener(
  "click",
  async function () {

    try {

      await navigator.clipboard
        .writeText(
          editor.getValue()
        );

    }

    catch {

      const textarea =
        document.createElement(
          "textarea"
        );


      textarea.value =
        editor.getValue();


      document.body.appendChild(
        textarea
      );


      textarea.select();


      document.execCommand(
        "copy"
      );


      textarea.remove();

    }


    this.textContent =
      "Copied";


    setTimeout(
      () => {

        this.textContent =
          "Copy";

      },
      1200
    );

  }
);


// ============================================================
// FILE UPLOAD
// ============================================================

fileInput.addEventListener(
  "change",
  async function (event) {

    if (!pyodide) {

      alert(
        "Python is still loading."
      );

      return;

    }


    const files =
      event.target.files;


    if (!files.length) {

      return;

    }


    try {

      for (
        const file of files
      ) {

        const data =
          new Uint8Array(
            await file.arrayBuffer()
          );


        pyodide.FS.writeFile(
          `${DATA_DIR}/${file.name}`,
          data
        );


        workspaceFileOrigins.set(
          file.name,
          "data"
        );


        if (
          localWorkspaceConnected
        ) {

          await writeLocalBytes(
            "data",
            file.name,
            data
          );

        }

      }


      await syncToIndexedDB();


      refreshFileList();


      outputElement.textContent =
        localWorkspaceConnected

          ? `${files.length} file(s) uploaded and saved to the local data/ folder.`

          : `${files.length} file(s) uploaded and saved in browser storage.`;


      fileInput.value =
        "";

    }

    catch (error) {

      console.error(
        error
      );


      outputElement.textContent =
        "Upload failed:\n" +
        error.toString();

    }

  }
);


// ============================================================
// GET STORED DATA FILES
// ============================================================

function getStoredFiles() {

  if (!pyodide) {

    return [];

  }


  return pyodide.FS
    .readdir(
      DATA_DIR
    )
    .filter(
      name =>
        name !== "." &&
        name !== ".." &&
        name !== ".workbench"
    )
    .filter(
      name => {

        try {

          const stat =
            pyodide.FS.stat(
              `${DATA_DIR}/${name}`
            );


          return pyodide.FS.isFile(
            stat.mode
          );

        }

        catch {

          return false;

        }

      }
    )
    .sort(
      (a, b) =>
        a.localeCompare(
          b
        )
    );

}


// ============================================================
// REFRESH FILE LIST
// ============================================================

function refreshFileList() {

  if (!pyodide) {

    return;

  }


  const files =
    getStoredFiles();


  uploadedFilesElement.innerHTML =
    "";


  const currentSelection =
    previewFile.value;


  previewFile.innerHTML =
    '<option value="">Select a file</option>';


  if (
    files.length === 0
  ) {

    uploadedFilesElement.textContent =
      "No files stored.";


    generatedFiles.textContent =
      "No available files.";


    return;

  }


  files.forEach(
    filename => {

      const fullPath =
        `${DATA_DIR}/${filename}`;


      let size = 0;


      try {

        size =
          pyodide.FS.stat(
            fullPath
          ).size;

      }

      catch {

        size = 0;

      }


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "file-item";


      const info =
        document.createElement(
          "div"
        );


      info.className =
        "file-info";


      const name =
        document.createElement(
          "div"
        );


      name.className =
        "file-name";


      name.textContent =
        filename;


      if (
        localWorkspaceConnected
      ) {

        const badge =
          document.createElement(
            "span"
          );


        badge.className =
          "file-origin";


        badge.textContent =
          workspaceFileOrigins.get(
            filename
          ) ||
          "output";


        name.appendChild(
          badge
        );

      }


      const sizeText =
        document.createElement(
          "div"
        );


      sizeText.className =
        "file-size";


      sizeText.textContent =
        formatBytes(
          size
        );


      info.appendChild(
        name
      );


      info.appendChild(
        sizeText
      );


      const actions =
        document.createElement(
          "div"
        );


      actions.className =
        "file-actions";


      const download =
        document.createElement(
          "button"
        );


      download.className =
        "small-button";


      download.textContent =
        "Download";


      download.addEventListener(
        "click",
        () =>
          downloadPyodideFile(
            filename
          )
      );


      const deleteButton =
        document.createElement(
          "button"
        );


      deleteButton.className =
        "delete-button";


      deleteButton.textContent =
        "Delete";


      deleteButton.addEventListener(
        "click",
        () =>
          deleteStoredFile(
            filename
          )
      );


      actions.appendChild(
        download
      );


      actions.appendChild(
        deleteButton
      );


      row.appendChild(
        info
      );


      row.appendChild(
        actions
      );


      uploadedFilesElement.appendChild(
        row
      );


      if (
        /\.(csv|tsv|txt|dat)$/i
          .test(
            filename
          )
      ) {

        const option =
          document.createElement(
            "option"
          );


        option.value =
          filename;


        option.textContent =
          filename;


        previewFile.appendChild(
          option
        );

      }

    }
  );


  if (
    [
      ...previewFile.options
    ]
      .some(
        option =>
          option.value ===
          currentSelection
      )
  ) {

    previewFile.value =
      currentSelection;

  }


  updateGeneratedFiles();

}


// ============================================================
// REFRESH BUTTON
// ============================================================

refreshFilesButton.addEventListener(
  "click",
  async function () {

    try {

      if (
        localWorkspaceConnected
      ) {

        await hydrateRuntimeFromLocalWorkspace();

      }

      else {

        await syncFromIndexedDB();

      }


      refreshFileList();


      refreshSessionList();


      outputElement.textContent =
        "File and session lists refreshed.";

    }

    catch (error) {

      outputElement.textContent =
        error.toString();

    }

  }
);


// ============================================================
// DELETE A SINGLE DATA/OUTPUT FILE
// ============================================================

async function deleteStoredFile(
  filename
) {

  const confirmed =
    window.confirm(
      `Delete "${filename}"?`
    );


  if (!confirmed) {

    return;

  }


  try {

    const origin =
      workspaceFileOrigins.get(
        filename
      );


    pyodide.FS.unlink(
      `${DATA_DIR}/${filename}`
    );


    if (
      localWorkspaceConnected
    ) {

      if (
        origin === "data" ||
        origin === "output"
      ) {

        await deleteLocalFile(
          origin,
          filename
        );

      }

      else {

        if (
          await localFileExists(
            "data",
            filename
          )
        ) {

          await deleteLocalFile(
            "data",
            filename
          );

        }


        if (
          await localFileExists(
            "output",
            filename
          )
        ) {

          await deleteLocalFile(
            "output",
            filename
          );

        }

      }


      workspaceFileOrigins.delete(
        filename
      );

    }


    await syncToIndexedDB();


    refreshFileList();


    outputElement.textContent =
      `Deleted ${filename}.`;


    if (
      previewFile.value ===
      filename
    ) {

      previewArea.innerHTML =
        '<p class="muted">Select a file to inspect it.</p>';

    }

  }

  catch (error) {

    console.error(
      error
    );


    outputElement.textContent =
      `Could not delete ${filename}:\n${error}`;

  }

}


// ============================================================
// CLEAR ALL DATA/OUTPUT FILES
// Sessions/scripts are preserved deliberately.
// ============================================================

clearAllButton.addEventListener(
  "click",
  async function () {

    const files =
      getStoredFiles();


    if (
      files.length === 0
    ) {

      alert(
        "There are no data/output files to delete."
      );

      return;

    }


    const confirmed =
      window.confirm(

        localWorkspaceConnected

          ? "Delete ALL data and output files from the connected local workspace?\n\nSaved sessions and scripts will be kept."

          : "Delete ALL stored data files from this browser?\n\nSaved sessions will be kept."

      );


    if (!confirmed) {

      return;

    }


    try {

      for (
        const filename of files
      ) {

        try {

          pyodide.FS.unlink(
            `${DATA_DIR}/${filename}`
          );

        }

        catch {

          // Ignore.

        }

      }


      if (
        localWorkspaceConnected
      ) {

        for (
          const folderKey of [
            "data",
            "output"
          ]
        ) {

          const localFiles =
            await readLocalDirectoryFiles(
              folderKey
            );


          for (
            const {
              name
            }
            of localFiles
          ) {

            await deleteLocalFile(
              folderKey,
              name
            );

          }

        }


        workspaceFileOrigins.clear();

      }


      await syncToIndexedDB();


      refreshFileList();


      previewArea.innerHTML =
        '<p class="muted">Select a file to inspect it.</p>';


      plotArea.innerHTML =
        '<p class="muted">No plot.</p>';


      outputElement.textContent =
        "All data/output files have been deleted. Saved sessions and scripts were kept.";

    }

    catch (error) {

      console.error(
        error
      );


      outputElement.textContent =
        "Could not clear storage:\n" +
        error.toString();

    }

  }
);


// ============================================================
// PREVIEW CSV / TSV / TXT / DAT
// ============================================================

previewButton.addEventListener(
  "click",
  async function () {

    const filename =
      previewFile.value;


    if (!filename) {

      alert(
        "Please select a file."
      );

      return;

    }


    try {

      pyodide.globals.set(
        "_preview_filename",
        filename
      );


      const html =
        await pyodide.runPythonAsync(`
import pandas as pd
import os

filename = _preview_filename
extension = os.path.splitext(filename)[1].lower()

if extension == ".tsv":
    df_preview = pd.read_csv(filename, sep="\\t")
else:
    try:
        df_preview = pd.read_csv(filename)
    except Exception:
        df_preview = pd.read_csv(filename, sep=None, engine="python")

df = df_preview.copy()

df_preview.head(20).to_html(
    classes="data-table",
    index=False
)
        `);


      previewArea.innerHTML =
        html;


      const rows =
        await pyodide.runPythonAsync(
          "len(df)"
        );


      const columns =
        await pyodide.runPythonAsync(
          "len(df.columns)"
        );


      const columnNames =
        await pyodide.runPythonAsync(`
", ".join(str(x) for x in df.columns)
        `);


      outputElement.textContent =
        `Loaded: ${filename}\n` +
        `DataFrame: df\n` +
        `Rows: ${rows}\n` +
        `Columns: ${columns}\n` +
        `Column names: ${columnNames}`;


      scheduleAutosave();

    }

    catch (error) {

      console.error(
        error
      );


      previewArea.innerHTML =
        `<pre>${escapeHTML(
          error.toString()
        )}</pre>`;


      outputElement.textContent =
        error.toString();

    }

  }
);


// ============================================================
// RUN PYTHON
// ============================================================

runButton.addEventListener(
  "click",
  runPython
);


async function runPython() {

  if (!pyodide) {

    alert(
      "Python has not loaded yet."
    );

    return;

  }


  const code =
    editor.getValue();


  const beforeFiles =
    snapshotRuntimeFiles();


  runButton.disabled =
    true;


  runButton.textContent =
    "Running...";


  outputElement.textContent =
    "Running Python...\n";


  try {

    await pyodide.runPythonAsync(`
import matplotlib.pyplot as plt
plt.close("all")
    `);


    pyodide.globals.set(
      "_user_code",
      code
    );


    const result =
      await pyodide.runPythonAsync(`
import io
import os
import traceback
import contextlib

os.chdir("/data")

_stdout_buffer = io.StringIO()
_stderr_buffer = io.StringIO()

try:
    with contextlib.redirect_stdout(_stdout_buffer), contextlib.redirect_stderr(_stderr_buffer):
        exec(
            compile(
                _user_code,
                "<browser>",
                "exec"
            ),
            globals()
        )
except Exception:
    traceback.print_exc(file=_stderr_buffer)

_output_text = _stdout_buffer.getvalue()
_error_text = _stderr_buffer.getvalue()

_output_text + _error_text
      `);


    outputElement.textContent =
      result.trim() === ""

        ? "Code executed successfully."

        : result;


    await displayMatplotlibPlot();


    await syncToIndexedDB();


    if (
      localWorkspaceConnected
    ) {

      const changed =
        changedRuntimeFiles(
          beforeFiles
        );


      await syncRuntimeToLocalWorkspace(
        changed
      );

    }


    await autosaveDraft();


    refreshFileList();

  }

  catch (error) {

    console.error(
      error
    );


    outputElement.textContent =
      error.toString();

  }

  finally {

    runButton.disabled =
      false;


    runButton.textContent =
      "▶ Run Python";

  }

}


// ============================================================
// DISPLAY MATPLOTLIB PLOT
// ============================================================

async function displayMatplotlibPlot() {

  try {

    const numberOfFigures =
      await pyodide.runPythonAsync(`
import matplotlib.pyplot as plt
len(plt.get_fignums())
      `);


    if (
      numberOfFigures === 0
    ) {

      plotArea.innerHTML =
        '<p class="muted">No Matplotlib plot generated.</p>';

      return;

    }


    await pyodide.runPythonAsync(`
import matplotlib.pyplot as plt

fig = plt.gcf()

fig.savefig(
    "/tmp/browser_plot.png",
    dpi=150,
    bbox_inches="tight"
)
    `);


    const png =
      pyodide.FS.readFile(
        "/tmp/browser_plot.png"
      );


    const blob =
      new Blob(
        [png],
        {
          type:
            "image/png"
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    plotArea.innerHTML =
      "";


    const img =
      document.createElement(
        "img"
      );


    img.src =
      url;


    img.alt =
      "Matplotlib plot";


    img.onload =
      () =>
        URL.revokeObjectURL(
          url
        );


    plotArea.appendChild(
      img
    );

  }

  catch (error) {

    console.error(
      "Plot display error:",
      error
    );

  }

}


// ============================================================
// DOWNLOAD BY FILENAME
// ============================================================

downloadButton.addEventListener(
  "click",
  function () {

    const filename =
      downloadFilename
        .value
        .trim();


    if (!filename) {

      alert(
        "Enter a filename, for example results.csv"
      );

      return;

    }


    downloadPyodideFile(
      filename
    );

  }
);


// ============================================================
// DOWNLOAD PYODIDE FILE
// ============================================================

function downloadPyodideFile(
  filename
) {

  try {

    const data =
      pyodide.FS.readFile(
        `${DATA_DIR}/${filename}`
      );


    const blob =
      new Blob(
        [data],
        {
          type:
            getMimeType(
              filename
            )
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href =
      url;


    link.download =
      filename;


    document.body.appendChild(
      link
    );


    link.click();


    document.body.removeChild(
      link
    );


    URL.revokeObjectURL(
      url
    );

  }

  catch (error) {

    alert(
      `Could not download "${filename}".\n\n${error}`
    );

  }

}


// ============================================================
// DOWNLOAD TEXT
// ============================================================

function downloadText(
  text,
  filename,
  mime = "text/plain"
) {

  const blob =
    new Blob(
      [text],
      {
        type:
          mime
      }
    );


  const url =
    URL.createObjectURL(
      blob
    );


  const link =
    document.createElement(
      "a"
    );


  link.href =
    url;


  link.download =
    filename;


  document.body.appendChild(
    link
  );


  link.click();


  document.body.removeChild(
    link
  );


  URL.revokeObjectURL(
    url
  );

}


// ============================================================
// AVAILABLE FILE LIST
// ============================================================

function updateGeneratedFiles() {

  if (!pyodide) {

    return;

  }


  const files =
    getStoredFiles();


  generatedFiles.innerHTML =
    "";


  if (
    files.length === 0
  ) {

    generatedFiles.textContent =
      "No available files.";

    return;

  }


  files.forEach(
    filename => {

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "file-item";


      const info =
        document.createElement(
          "div"
        );


      info.className =
        "file-info";


      const name =
        document.createElement(
          "div"
        );


      name.className =
        "file-name";


      name.textContent =
        filename;


      if (
        localWorkspaceConnected
      ) {

        const badge =
          document.createElement(
            "span"
          );


        badge.className =
          "file-origin";


        badge.textContent =
          workspaceFileOrigins.get(
            filename
          ) ||
          "output";


        name.appendChild(
          badge
        );

      }


      info.appendChild(
        name
      );


      const actions =
        document.createElement(
          "div"
        );


      actions.className =
        "file-actions";


      const download =
        document.createElement(
          "button"
        );


      download.className =
        "small-button";


      download.textContent =
        "Download";


      download.addEventListener(
        "click",
        () =>
          downloadPyodideFile(
            filename
          )
      );


      actions.appendChild(
        download
      );


      row.appendChild(
        info
      );


      row.appendChild(
        actions
      );


      generatedFiles.appendChild(
        row
      );

    }
  );

}


// ============================================================
// MIME TYPES
// ============================================================

function getMimeType(
  filename
) {

  const extension =
    filename
      .split(".")
      .pop()
      .toLowerCase();


  const types = {

    csv:
      "text/csv",

    tsv:
      "text/tab-separated-values",

    txt:
      "text/plain",

    dat:
      "text/plain",

    xyz:
      "text/plain",

    py:
      "text/x-python",

    json:
      "application/json",

    pdf:
      "application/pdf",

    png:
      "image/png",

    jpg:
      "image/jpeg",

    jpeg:
      "image/jpeg",

    svg:
      "image/svg+xml"

  };


  return (
    types[extension] ||
    "application/octet-stream"
  );

}


// ============================================================
// FILE SIZE FORMATTING
// ============================================================

function formatBytes(
  bytes
) {

  if (
    bytes === 0
  ) {

    return "0 B";

  }


  const units = [
    "B",
    "KB",
    "MB",
    "GB"
  ];


  const index =
    Math.floor(
      Math.log(
        bytes
      ) /
      Math.log(
        1024
      )
    );


  const value =
    bytes /
    Math.pow(
      1024,
      index
    );


  return (
    value.toFixed(
      index === 0
        ? 0
        : 1
    ) +
    " " +
    units[index]
  );

}


// ============================================================
// CLEAR OUTPUT
// ============================================================

clearButton.addEventListener(
  "click",
  function () {

    outputElement.textContent =
      "";


    plotArea.innerHTML =
      '<p class="muted">No plot.</p>';

  }
);


// ============================================================
// CSV EXAMPLE
// ============================================================

exampleButton.addEventListener(
  "click",
  function () {

    editor.setValue(
`import pandas as pd
import numpy as np

# Replace this with one of your stored files
df = pd.read_csv("student.csv")

print("Shape:")
print(df.shape)

print("\\nColumns:")
print(df.columns.tolist())

print("\\nFirst five rows:")
print(df.head())

print("\\nSummary statistics:")
print(df.describe())`,
      -1
    );

  }
);


// ============================================================
// PLOT EXAMPLE
// ============================================================

plotExampleButton.addEventListener(
  "click",
  function () {

    editor.setValue(
`import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("student.csv")

x = df.iloc[:, 0]
y = df.iloc[:, 1]

plt.figure(figsize=(7, 5))

plt.scatter(
    x,
    y
)

plt.xlabel(
    df.columns[0]
)

plt.ylabel(
    df.columns[1]
)

plt.title(
    f"{df.columns[1]} vs {df.columns[0]}"
)

plt.tight_layout()

# With a local workspace connected, newly created files
# are synchronized to its output/ folder after the run.

plt.savefig(
    "analysis_plot.pdf",
    bbox_inches="tight"
)

plt.savefig(
    "analysis_plot.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()`,
      -1
    );

  }
);


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHTML(
  text
) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    text;


  return div.innerHTML;

}


// ============================================================
// START
// ============================================================

updateWorkspaceUI(
  "disconnected"
);


initializePython();

// ============================================================
// EXAMPLE LIBRARY
// Content lives in examples/catalog.json + ordinary .py files.
// ============================================================
const exampleToc = document.getElementById("exampleToc");
const exampleSearch = document.getElementById("exampleSearch");
const exampleModuleSelect = document.getElementById("exampleModuleSelect");
const exampleCodeSelect = document.getElementById("exampleCodeSelect");
const exampleBreadcrumb = document.getElementById("exampleBreadcrumb");
const exampleTitle = document.getElementById("exampleTitle");
const exampleDescription = document.getElementById("exampleDescription");
const exampleTags = document.getElementById("exampleTags");
const loadExampleButton = document.getElementById("loadExampleButton");
const runExampleButton = document.getElementById("runExampleButton");
const exampleCodePreview = document.getElementById("exampleCodePreview");
const copyExampleButton = document.getElementById("copyExampleButton");
let exampleCatalog = null;
let selectedExample = null;
let selectedExampleModule = "";

async function initializeExampleLibrary() {
  // Preferred path: generated bundle.js. This works from GitHub Pages,
  // a local web server, and when index.html is opened directly via file://.
  if (window.PY_EXAMPLE_BUNDLE?.catalog) {
    exampleCatalog = window.PY_EXAMPLE_BUNDLE.catalog;
    populateExampleModuleSelect();
    renderExampleToc();
    return;
  }

  // Fallback for deployments that use catalog.json without bundle.js.
  try {
    const response = await fetch("examples/catalog.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`catalog.json: HTTP ${response.status}`);
    exampleCatalog = await response.json();
    populateExampleModuleSelect();
    renderExampleToc();
  } catch (error) {
    exampleToc.innerHTML = `<p class="muted">Could not load the example catalog.<br>${escapeHTML(error.toString())}</p>`;
  }
}


function populateExampleModuleSelect() {
  if (!exampleCatalog || !exampleModuleSelect) return;
  exampleModuleSelect.innerHTML = '<option value="">Choose a module...</option>';
  exampleCatalog.modules.forEach((module, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${module.name} (${module.examples.length})`;
    exampleModuleSelect.appendChild(option);
  });
}

function populateExampleCodeSelect(moduleIndex) {
  if (!exampleCodeSelect) return;
  exampleCodeSelect.innerHTML = '<option value="">Choose an example...</option>';
  exampleCodeSelect.disabled = true;

  if (moduleIndex === "" || !exampleCatalog) return;
  const module = exampleCatalog.modules[Number(moduleIndex)];
  if (!module) return;

  module.examples.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = item.title;
    exampleCodeSelect.appendChild(option);
  });
  exampleCodeSelect.disabled = false;
}

function syncExampleSelectors(module, item) {
  if (!exampleCatalog || !exampleModuleSelect || !exampleCodeSelect) return;
  const moduleIndex = exampleCatalog.modules.findIndex(m => m === module || m.name === module.name);
  if (moduleIndex < 0) return;
  exampleModuleSelect.value = String(moduleIndex);
  populateExampleCodeSelect(String(moduleIndex));
  const exampleIndex = module.examples.findIndex(ex => ex.file === item.file);
  if (exampleIndex >= 0) exampleCodeSelect.value = String(exampleIndex);
}

function renderExampleToc(filter = "") {
  if (!exampleCatalog) return;
  const query = filter.trim().toLowerCase();
  exampleToc.innerHTML = "";
  let count = 0;

  for (const module of exampleCatalog.modules) {
    const matches = module.examples.filter(item => {
      const haystack = [module.name, item.title, item.description, ...(item.tags || [])].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
    if (!matches.length) continue;
    count += matches.length;

    const group = document.createElement("div");
    group.className = "example-module";
    const heading = document.createElement("button");
    heading.className = "example-module-title";
    heading.textContent = `${module.name} (${matches.length})`;
    const list = document.createElement("ul");
    list.className = "example-list";

    for (const item of matches) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.textContent = item.title;
      if (selectedExample?.file === item.file) button.classList.add("active");
      button.addEventListener("click", () => selectExample(module, item));
      li.appendChild(button);
      list.appendChild(li);
    }
    heading.addEventListener("click", () => { list.hidden = !list.hidden; });
    group.append(heading, list);
    exampleToc.appendChild(group);
  }
  if (!count) exampleToc.innerHTML = '<p class="muted">No matching examples.</p>';
}

function selectExample(module, item) {
  selectedExample = item;
  selectedExampleModule = module.name;
  exampleBreadcrumb.textContent = module.name;
  exampleTitle.textContent = item.title;
  exampleDescription.textContent = item.description || "";
  exampleTags.innerHTML = "";
  for (const tag of item.tags || []) {
    const span = document.createElement("span");
    span.className = "example-tag";
    span.textContent = tag;
    exampleTags.appendChild(span);
  }
  loadExampleButton.disabled = false;
  runExampleButton.disabled = false;
  if (copyExampleButton) copyExampleButton.disabled = false;
  syncExampleSelectors(module, item);
  renderExampleToc(exampleSearch.value);
  renderSelectedExamplePreview();
}

async function fetchSelectedExample() {
  if (!selectedExample) return null;

  // Local-safe path: source embedded by examples/bundle.js.
  const bundledCode = window.PY_EXAMPLE_BUNDLE?.files?.[selectedExample.file];
  if (typeof bundledCode === "string") return bundledCode;

  // Fallback for normal web-server/GitHub Pages use.
  const response = await fetch(`examples/${selectedExample.file}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`${selectedExample.file}: HTTP ${response.status}`);
  return await response.text();
}


async function renderSelectedExamplePreview() {
  if (!selectedExample || !exampleCodePreview) return;
  exampleCodePreview.textContent = "Loading example...";
  try {
    const code = await fetchSelectedExample();
    exampleCodePreview.textContent = code;
  } catch (error) {
    exampleCodePreview.textContent = `Could not load example:\n${error}`;
  }
}

async function loadSelectedExample(runAfterLoad = false) {
  try {
    const code = await fetchSelectedExample();
    loadCodeIntoWorkbenchTab(`Example: ${selectedExample.title}`, code, "example");
    editor.focus();
    autosaveStatus.textContent = `Loaded example: ${selectedExampleModule} / ${selectedExample.title}`;
    document.getElementById("pythonEditor").scrollIntoView({ behavior: "smooth", block: "center" });
    if (runAfterLoad) await runPython();
  } catch (error) {
    outputElement.textContent = `Could not load example:\n${error}`;
  }
}

exampleSearch?.addEventListener("input", () => renderExampleToc(exampleSearch.value));
exampleModuleSelect?.addEventListener("change", () => {
  populateExampleCodeSelect(exampleModuleSelect.value);
  selectedExample = null;
  selectedExampleModule = "";
  loadExampleButton.disabled = true;
  runExampleButton.disabled = true;
  if (copyExampleButton) copyExampleButton.disabled = true;
  if (exampleCodePreview) exampleCodePreview.textContent = "Choose an example to preview its source code here.";
  if (exampleModuleSelect.value !== "") {
    const module = exampleCatalog.modules[Number(exampleModuleSelect.value)];
    exampleBreadcrumb.textContent = module.name;
    exampleTitle.textContent = module.name;
    exampleDescription.textContent = `Choose one of the ${module.examples.length} examples in this module.`;
    exampleTags.innerHTML = "";
  } else {
    exampleBreadcrumb.textContent = "Select an example";
    exampleTitle.textContent = "Example library";
    exampleDescription.textContent = "Examples are grouped under Core Python, NumPy, SciPy, pandas, and Matplotlib.";
    exampleTags.innerHTML = "";
  }
});
exampleCodeSelect?.addEventListener("change", () => {
  if (exampleModuleSelect.value === "" || exampleCodeSelect.value === "") return;
  const module = exampleCatalog.modules[Number(exampleModuleSelect.value)];
  const item = module.examples[Number(exampleCodeSelect.value)];
  if (module && item) selectExample(module, item);
});
loadExampleButton?.addEventListener("click", () => loadSelectedExample(false));
copyExampleButton?.addEventListener("click", async () => {
  if (!selectedExample) return;
  const code = await fetchSelectedExample();
  await navigator.clipboard.writeText(code);
  copyExampleButton.textContent = "Copied";
  setTimeout(() => { copyExampleButton.textContent = "Copy"; }, 1200);
});
runExampleButton?.addEventListener("click", () => loadSelectedExample(true));
initializeExampleLibrary();
