
particlesJS("ms-Rside", {
  "particles": {
    "number": { "value": 80 }, // Số lượng hạt
    "color": { "value": "#00b4d8" }, // Màu hạt (Xanh cyan giống xe của bạn)
    "shape": { "type": "circle" },
    "opacity": { "value": 0.5 },
    "size": { "value": 3 },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#00b4d8", // Màu đường kẻ kết nối
      "opacity": 0.6,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 2 // Tốc độ di chuyển
    }
  },
  "interactivity": {
    "events": {
      "onhover": { "enable": true, "mode": "grab" }, // Hiệu ứng khi di chuột vào
      "onclick": { "enable": true, "mode": "push" }
    }
  }
});

particlesJS("ms-Lside", {
  "particles": {
    "number": { "value": 80 }, // Số lượng hạt
    "color": { "value": "#ffc8dd" }, // Màu hạt (Xanh cyan giống xe của bạn)
    "shape": { "type": "circle" },
    "opacity": { "value": 0.6 },
    "size": { "value": 3 },
    "line_linked": {
      "enable": true,
      "distance": 100,
      "color": "#9ef01a", // Màu đường kẻ kết nối
      "opacity": 0.5,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 2 // Tốc độ di chuyển
    }
  },
  "interactivity": {
    "events": {
      "onhover": { "enable": true, "mode": "grab" }, // Hiệu ứng khi di chuột vào
      "onclick": { "enable": true, "mode": "push" }
    }
  }
});

// kết nối esp32cam

function startCameraStream() {
  const cam = document.getElementById("monitor-camStream");
  cam.src="http://192.168.1.8:81/stream";  
  cam.onerror = function() {
    addBluetoothLog("Không thể tải camera giám sát","error");
    this.src = "/Car-Robot/Assets/Images/map.png"; // Thay thế bằng ảnh dự phòng
    this.onerror = null;   // Quan trọng: Ngắt sự kiện để tránh lặp vô tận nếu map.png cũng lỗi
  };
}

startCameraStream();


// code xử lý kế nối bluetooth

const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const UART_RX_CHARACTERISTIC_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // write
const UART_TX_CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // notify

let uartRxCharacteristic = null;
let uartTxCharacteristic = null;
var bluetoothDevice = null;


async function connect_bluetooth_devices(){
  try {
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE_UUID],
    });
  const server = await bluetoothDevice.gatt.connect();
  const service = await server.getPrimaryService(UART_SERVICE_UUID);

  uartRxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);
  uartTxCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);

  await uartTxCharacteristic.startNotifications();
  uartTxCharacteristic.addEventListener(
    'characteristicvaluechanged',
    handleUartData
  );

  alert("Đã kết nối micro:bit");
  addBluetoothLog("Thiết bị được kết nối thành công","warn")
  console.log("Connected:", bluetoothDevice.name);
  updateBluetoothStatus(true);
  change_UI();  
  bluetoothDevice.addEventListener("gattserverdisconnected",() => {
    console.warn("Bluetooth bị ngắt kết nối");
    addBluetoothLog("Thiết bị không được kết nối","warn")
    updateBluetoothStatus(false);
    }
  );

  } catch (e) {
    console.error(e);
    }  
}

// Hàm ngắt kết nối
function disconnectBluetooth() {
  console.log("disconnect đã được nhấn");
  if (!bluetoothDevice) {
    console.log("Chưa có thiết bị nào được kết nối.");
    return;
  }
  if (bluetoothDevice.gatt.connected) {
    console.log("Đang ngắt kết nối...");
    addBluetoothLog("Đã ngắt kết nối Bluetooth","warn");
    bluetoothDevice.gatt.disconnect();
  } else {
    console.log("Thiết bị đã ở trạng thái ngắt kết nối.");
    addBluetoothLog("Không có thiết bị nào được kết nối","warn")
  }
}


// code gửi dữ liệu

function sendChar(c) {
  if (!uartRxCharacteristic) return;
  const data = new TextEncoder().encode(c + "\n");
  uartRxCharacteristic.writeValue(data);
 console.log(c);
}

// code nhận dữ liệu
let uartBuffer = "";

function processLine(line) {
  if (!line.includes(":")) {console.log("dữ liệu nhận được không bao gồm :"); return};

  const [key, value] = line.split(":");

  switch (key.toLowerCase()) {
    case "l":
      document.getElementById("val_l").textContent = value;
      break;
    case "p":
      document.getElementById("val_p").textContent = value;
      break;    
    case "s":
      document.getElementById("val_s").textContent = value;
      break;
    case "w":
      document.getElementById("val_w").textContent = value;
      break;
    case "h":
      document.getElementById("val_h").textContent = value;
      break;
    case "a":
      document.getElementById("val_a").textContent = value;
      break;
    case "tem":
      document.getElementById("val_tem").textContent = value;
      break;
    case "vof":
      document.getElementById("val_vof").textContent = value;
      break;
  }
}

function handleUartData(event) {
  const value = event.target.value;
  const decoder = new TextDecoder("utf-8");

  uartBuffer += decoder.decode(value);

  let lines = uartBuffer.split("\n");
  uartBuffer = lines.pop();

  lines.forEach(line => {
    line = line.replace("\r", "").trim();
    if (!line) return;

    if (line.includes("WARN")) {
      addBluetoothLog(line, "warn");
    } else if (line.includes("ERROR")) {
      addBluetoothLog(line, "error");
    } 
    processLine(line);
  });

}

const MAX_LOG_LINES = 50;

function addBluetoothLog(text,type = "info") {
  const ib_log = document.getElementById("ib-log");

  const line = document.createElement("div");
  line.className = "log-line";

  if (type === "warn") line.classList.add("log-warn");
  else if (type === "error") line.classList.add("log-error");
  else line.classList.add("log-info");

  const time = new Date().toLocaleTimeString();
  line.innerHTML = `
    <span class="log-time">[${time}]</span>
    <span class="log-msg">${text}</span>
  `;

  ib_log.appendChild(line);

  while (ib_log.children.length > MAX_LOG_LINES) {
    ib_log.removeChild(ib_log.firstChild);
  }
  ib_log.scrollTop = ib_log.scrollHeight;
}


document.getElementById("bt-clearlog").onclick = () => {
  document.getElementById("ib-log").innerHTML = "";
  addBluetoothLog("Toàn bộ thông báo đã được xóa", "warn");
};

// code xử lý giao diện


document.getElementById("connect-introscreen").addEventListener("click",()=>connect_bluetooth_devices());

const introScreen = document.querySelector('.intro_screen');
function change_UI(){                           /** thay đổi giao diện khi đã kết nối hoàn tất */
  introScreen.classList.add('hide');
  document.body.classList.remove('no-scroll');
  setTimeout(() => {
    introScreen.style.display = 'none';
    }, 400);
}

const dpstatus_connect = document.getElementById("dpstatus");
const pgConnect_status=document.getElementById("pgConnect_status");

function updateBluetoothStatus(isConnected) {
    dpstatus_connect.innerText = isConnected ? ">< Đã kết nối" : "<> Chưa kết nối";
    dpstatus_connect.style.color = isConnected ? "#92e6a7" : "#e5383b";

    pgConnect_status.innerText = isConnected ? "🟢 Đã kết nối" : "🔴 Chưa kết nối";
    pgConnect_status.style.color = isConnected ? "#92e6a7" : "#e5383b";
}
updateBluetoothStatus(false);

const pgConnect_btnConnect=document.getElementById("pgConnect_btnConnect").addEventListener('click',()=>connect_bluetooth_devices());


const menuBtn = document.getElementById("menu-btn"); 
const menu = document.getElementById("menu");



menuBtn.addEventListener("click", () => {
  menu.classList.toggle("hidden");
  menuBtn.textContent = menu.classList.contains("hidden") ? "☰": "✖" ;
});

/* ===== MENU CLICK ===== */
menu.addEventListener("click", (e) => {
  if (!e.target.dataset.page) return;

  const page = e.target.dataset.page;
  menu.classList.add("hidden");
  menuBtn.textContent = menu.classList.contains("hidden") ? "☰": "✖" ;

  if (page === "home") {
    closeModal();
  } 
  else 
    openPage(page);
});

/* ===== MODAL ===== */
const overlay = document.getElementById("overlay");
const modal = document.getElementById("modal");

const pages = document.querySelectorAll(".modal-page");

function openPage(pageId) {
  overlay.classList.remove("hidden");
  modal.classList.remove("hidden");

  pages.forEach(p => p.classList.add("hidden"));

  document.getElementById(pageId).classList.remove("hidden");
}

function closeModal() {
  overlay.classList.add("hidden");
  modal.classList.add("hidden");
}

/* ===== CLICK NGOÀI ĐỂ ĐÓNG ===== */
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) {
    closeModal();
  }
});


// settings modal
const changecolor=document.getElementById("set-changecolor");
changecolor.addEventListener('input',(event)=>{
  const selectcolor=event.target.value;
  document.documentElement.style.setProperty('--bg-color',selectcolor)
});

// Nút bấm trang kết nối bluetooth
document.getElementById("pgConnect_btnDisConnect").addEventListener("click",()=>{
  disconnectBluetooth();
});

document.getElementById("pgConnect_btnConnect").addEventListener("click",()=>{
  connect_bluetooth_devices();
});



function disable(id){
  let list =document.querySelectorAll(id);
  list.forEach(btn=>{
    btn.disabled=true;
    btn.classList.add('btn_locked');
  })
}

// line mode
const line =document.getElementById("btn_Line");
line.onmousedown = () => {
  sendChar("LINE");
  line.classList.add('btn_active');
  disable('.bottom-buttons button');
  disable('#btn_Auto');
  disable('#btn_Manual');
  disable('#btn_Follow');
  disable('#btn_compile');
}
// follow mode
const follow = document.getElementById("btn_Follow")
follow.onmousedown = () => {
  sendChar("FOLLOW");
  follow.classList.add('btn_active');
  disable('.bottom-buttons button');
  disable('#btn_Auto');
  disable('#btn_Manual');
  disable('#btn_Line');
  disable('#btn_compile');
}

let control_mode=0;
// Auto
const auto = document.getElementById("btn_Auto");
auto.onmousedown = () =>{
  control_mode=1;
  changeMode(control_mode);
} 

const complie=document.getElementById('btn_compile');
complie.onmousedown = () =>{
  disable("#btn_Manual");
  disable('.bottom-buttons button');
  disable('.rb-BtGroup2 button');
  addBluetoothLog("Đã gửi chương trình")
} 

// Manual
const manual = document.getElementById("btn_Manual");
manual.onmousedown = () =>{
  control_mode=0;
  changeMode(control_mode);
}

// hàm chuyển chế độ
function changeMode(control_mode){
  if(control_mode==1){
    auto.classList.add('btn_active');
    manual.classList.remove('btn_active');
    document.querySelector(".rb-BtGroup3").classList.remove("visibility");
    document.getElementById("auto-programming").classList.add("show");
    document.getElementById("auto-programming").classList.remove("hidden");
    document.getElementById("btn_pass").classList.add("show");
    document.getElementById("btn_pass").classList.remove("hidden");
  }
  else{
    manual.classList.add('btn_active');
    auto.classList.remove('btn_active');
    document.querySelector(".rb-BtGroup3").classList.add("visibility");
    document.getElementById("auto-programming").classList.remove("show");
    document.getElementById("auto-programming").classList.add("hidden");
    document.getElementById("btn_pass").classList.remove("show");
    document.getElementById("btn_pass").classList.add("hidden");
  }
}

/* =========================
   AUTO TIMELINE SYSTEM
========================= */

let timelineData = [];
let defaultScale = 5;

let isPlaying = false;
let isPaused = false;
let playStartTime = 0;
let pausedOffset = 0;
let animationFrame;

const track = document.getElementById("AP-track");
const scaleDiv = document.getElementById("AP-scale");

/* =========================
   ADD BLOCK
========================= */

function addBlock(label, duration = 1) {
  timelineData.push({ label, duration });
  renderTimeline();
}

/* =========================
   SCALE
========================= */

function renderScale(scale) {
  scaleDiv.innerHTML = "";

  const trackWidth = track.clientWidth;

  for (let i = 0; i <= scale; i++) {
    const percent = (i / scale) * 100;

    const mark = document.createElement("div");
    mark.className = "scale-mark";
    mark.style.left = percent + "%";

    const label = document.createElement("span");
    label.innerText = i + "s";

    mark.appendChild(label);
    scaleDiv.appendChild(mark);
  }
}

/* =========================
   RENDER
========================= */

function renderTimeline() {
  track.innerHTML = "";

  const totalDuration = timelineData.reduce((s, b) => s + b.duration, 0);
  const scale = Math.max(defaultScale, totalDuration);

  let currentTime = 0;

  timelineData.forEach((block, index) => {
    const div = document.createElement("div");
    div.className = "ap-block";

    div.style.width = (block.duration / scale) * 100 + "%";

    // Label trong block
    div.innerHTML = `
      <div>${block.label}&nbsp;</div>
      <small>${block.duration}s</small>
    `;

    // ===== CHIẾU LÊN SCALE =====
    const percent = (currentTime / scale) * 100;

    const timeMark = document.createElement("div");
    timeMark.className = "scale-mark";
    timeMark.style.left = percent + "%";

    const label = document.createElement("span");
    label.innerText = currentTime.toFixed(1) + "s";

    timeMark.appendChild(label);
    scaleDiv.appendChild(timeMark);

    currentTime += block.duration;

    div.addEventListener("contextmenu", e => {
      e.preventDefault();
      showContextMenu(e.pageX, e.pageY, index);
    });

    track.appendChild(div);
  });

  renderScale(scale);
}

/* =========================
   CONTEXT MENU
========================= */
const contextMenu = document.getElementById("context-menu");
let currentBlockIndex = null;

/* ===== SHOW MENU ===== */
function showContextMenu(x, y, index) {
  currentBlockIndex = index;

  contextMenu.style.left = x + "px";
  contextMenu.style.top = y - 119 + "px";
  contextMenu.classList.remove("hidden");
}

/* ===== HIDE MENU ===== */
function hideContextMenu() {
  contextMenu.classList.add("hidden");
}

document.addEventListener("click", hideContextMenu);

contextMenu.addEventListener("click", e => {

  const action = e.target.dataset.action;
  if (!action) return;

  if (action === "add") {
    timelineData.splice(currentBlockIndex + 1, 0, {
      label: timelineData[currentBlockIndex].label,
      duration: 1
    });
  }

  if (action === "edit") {
    let newTime = parseFloat(prompt(">=0.5s, bội 0.5"));
    if (newTime >= 0.5 && newTime % 0.5 === 0) {
      timelineData[currentBlockIndex].duration = newTime;
    }
  }

  if (action === "delete") {
    timelineData.splice(currentBlockIndex, 1);
  }

  hideContextMenu();
  renderTimeline();
});
/* =========================
   DRAG & DROP từ bottom-buttons
========================= */

document.querySelectorAll(".btn-bb").forEach(btn => {
  btn.setAttribute("draggable", true);

  btn.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", btn.innerText);
  });
});

track.addEventListener("dragover", e => e.preventDefault());

track.addEventListener("drop", e => {
  e.preventDefault();

  const label = e.dataTransfer.getData("text/plain");

  const rect = track.getBoundingClientRect();
  const dropX = e.clientX - rect.left;   // vị trí tương đối trong track
  const trackWidth = rect.width;

  const totalDuration = timelineData.reduce((s, b) => s + b.duration, 0);
  const scale = Math.max(defaultScale, totalDuration);

  // chuyển vị trí pixel thành thời gian
  const dropTime = (dropX / trackWidth) * scale;

  // tìm block tương ứng
  let cumulative = 0;
  let insertIndex = timelineData.length; // mặc định thêm cuối

  for (let i = 0; i < timelineData.length; i++) {
    cumulative += timelineData[i].duration;

    if (dropTime <= cumulative) {
      insertIndex = i + 1;  // chèn sau block đó
      break;
    }
  }

  timelineData.splice(insertIndex, 0, {
    label: label,
    duration: 1
  });

  renderTimeline();
});

/* =========================
   PLAY SYSTEM
========================= */

function playTimeline() {

  if (timelineData.length === 0) return;

  isPlaying = true;
  isPaused = false;

  playStartTime = performance.now() - pausedOffset;
  animate();
}

function animate() {
  if (!isPlaying || isPaused) return;

  const elapsed = (performance.now() - playStartTime) / 1000;

  const totalDuration = timelineData.reduce((s, b) => s + b.duration, 0);
  const scale = Math.max(defaultScale, totalDuration);

  if (elapsed >= scale) {
    isPlaying = false;
    pausedOffset = 0;
    return;
  }

  animationFrame = requestAnimationFrame(animate);
  console.log("chạy");
}

/* =========================
   BUTTON EVENTS
========================= */

document.getElementById("btn_compile").onclick = () => {
  if (isPlaying) return;
  startAutoExecution();
};

document.getElementById("btn_pause").onclick = () => {
  if (!isPlaying) return;
  isPaused = true;
  pausedOffset = performance.now() - playStartTime;
};

document.getElementById("btn_resume").onclick = () => {
  if (!isPlaying) return;
  isPaused = false;
  playStartTime = performance.now() - pausedOffset;
  animate();
};

document.getElementById("btn_clcode").onmousedown = () => {
  const track = document.getElementById("AP-track");
  track.innerText="";
  timelineData=[];
  addBluetoothLog("Chương trình vừa bị xóa");
}

/* INIT */
renderTimeline();



let autoInterval = null;
let currentBlock = 0;
let blockRemainingTime = 0;
let autoRunning = false;

// compile chương trình sang microbit

function startAutoExecution() {

  if (timelineData.length === 0) return;

  autoRunning = true;
  currentBlock = 0;
  blockRemainingTime = timelineData[0].duration;

  // bật sáng compile
  const compileBtn = document.getElementById("btn_compile");
  compileBtn.classList.add("btn_active");

  // khóa nút
  disable("#btn_Manual");
  disable(".bottom-buttons button");
  disable(".rb-BtGroup2 button");

  autoInterval = setInterval(() => {

    if (!autoRunning) return;

    const block = timelineData[currentBlock];
    if (!block) {
      finishAutoExecution();
      return;
    }

    sendCommandFromLabel(block.label);

    blockRemainingTime -= 1;

    if (blockRemainingTime <= 0) {
      currentBlock++;

      if (currentBlock >= timelineData.length) {
        finishAutoExecution();
        return;
      }

      blockRemainingTime = timelineData[currentBlock].duration;
    }

  }, 1000);
}

// chọn gửi từ nhãn
function sendCommandFromLabel(label) {

  switch (label) {
    case "Trái": sendChar("L"); break;
    case "Phải": sendChar("R"); break;
    case "Tiến": sendChar("T"); break;
    case "Lùi": sendChar("B"); break;
    case "Quay": sendChar("SW"); break;
    case "Nâng": sendChar("UP"); break;
    case "Hạ": sendChar("DOWN"); break;
    case "Kẹp": sendChar("CLAMP"); break;
    case "Nhả": sendChar("RCLAMP"); break;
  }
}

// kết thúc compile
function finishAutoExecution() {

  autoRunning = false;

  if (autoInterval) {
    clearInterval(autoInterval);
    autoInterval = null;
  }

  currentBlock = 0;
  blockRemainingTime = 0;

  document.getElementById("btn_compile")
    .classList.remove("btn_active");

  const remove_lock = document.querySelectorAll("button");
  remove_lock.forEach(btn => {
    btn.classList.remove("btn_locked");
    btn.disabled = false;
  });
}


// stop mode
const stop= document.getElementById("btn_Stop");
stop.onmousedown = () => {
  let list=document.querySelectorAll('.btn_active:not(#btn_Auto,#btn_Manual)');
  list.forEach(id=>id.classList.remove('btn_active'))
  const remove_lock=document.querySelectorAll('button');
  remove_lock.forEach(btn=>{
    btn.classList.remove('btn_locked');
    btn.disabled=false
  })
  addBluetoothLog("Dừng khẩn cấp","warn");
  sendChar("STOP");
}
stop.onclick = () => {
  if (!autoRunning) return;

  autoRunning = false;

  if (autoInterval) {
    clearInterval(autoInterval);
    autoInterval = null;
  }

  // gửi STOP nhiều lần để đảm bảo flush
  sendChar("STOP");
  finishAutoExecution();
  console.log("oke")
};


function sendManual(data){
  if (control_mode==0){
    sendChar(data);
    // setTimeout(sendChar("D"), 500);
  }
}
document.getElementById("btn_left").onmousedown = () => sendManual("L");
document.getElementById("btn_right").onmousedown = () => sendManual("R");
document.getElementById("btn_ahead").onmousedown = () => sendManual("T");
document.getElementById("btn_back").onmousedown = () => sendManual("B");
document.getElementById("btn_swivel").onmousedown = () => sendManual("SW");
document.getElementById("btn_up").onmousedown = () => sendManual("UP");
document.getElementById("btn_down").onmousedown = () => sendManual("DOWN");
document.getElementById("btn_clamp").onmousedown = () => sendManual("CLAMP");
document.getElementById("btn_ReleaseClamp").onmousedown = () => sendManual("RCLAMP");

document.addEventListener("DOMContentLoaded", () => document.getElementById("btn_Manual")?.onmousedown());
