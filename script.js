let devices = [];
let busStatus = {
  busy: false,
  failed: false,
};
let packets = [];
let collisions = [];
let deviceDetails = null;

function setup() {
  const canvas = createCanvas(1000, 600);
  canvas.parent("canvas-container");
  resetSimulation();
  frameRate(30);
}

function draw() {
  background(0);
  drawNetwork();
  updatePackets();
  updateCollisions();
  drawDeviceDetails();
}

function mouseMoved() {
  let hoveredDevice = null;
  devices.forEach((device) => {
    let d = dist(mouseX, mouseY, device.x, device.y);
    if (d < 30) {
      hoveredDevice = device;
    }
  });
  deviceDetails = hoveredDevice;
}

function startSimulation() {
  if (busStatus.failed) {
    logEvent("❌ Cannot start - bus has failed");
    return;
  }

  const workingDevices = devices.filter((d) => !d.failed);
  if (workingDevices.length === 0) {
    logEvent("❌ No working devices available");
    return;
  }

  const sender = random(workingDevices);
  sender.status = "sending";
  busStatus.busy = true;

  createPacket(sender);
  logEvent(`📤 Device ${sender.id} starting transmission`);

  // Random collision chance
  if (random() < 0.3) {
    setTimeout(() => {
      simulateCollision(sender);
    }, 1000);
  }
}

function resetSimulation() {
  devices = [];

  for (let i = 0; i < 6; i++) {
    devices.push({
      id: i + 1,
      x: 150 + i * 150,
      y: i % 2 === 0 ? 150 : 450,
      failed: false,
      stats: {
        sent: 0,
        received: 0,
        collisions: 0,
      },
      status: "idle",
    });
  }

  packets = [];
  collisions = [];
  busStatus.failed = false;
  busStatus.busy = false;
  logEvent("🔄 Simulation reset");
  logEvent("ℹ️ 6 devices initialized");
  logEvent("✅ Bus backbone active");
}

function drawNetwork() {
  const busY = height / 2; // Store bus Y position for reuse

  // Draw bus backbone in the middle of the canvas
  push();
  strokeWeight(4);
  stroke(busStatus.failed ? color(255, 0, 0) : color(0, 255, 0));
  line(50, busY, width - 50, busY);
  pop();

  // Draw devices and connections
  devices.forEach((device) => {
    // Draw connection to bus
    push();
    stroke(
      device.failed
        ? color(255, 0, 0)
        : device.status === "sending"
          ? color(0, 255, 0)
          : color(0, 255, 0),
    );
    strokeWeight(2);
    // Draw vertical line connecting device to bus
    line(device.x, device.y, device.x, busY);
    pop();

    // Draw device
    push();
    fill(device.failed ? color(64, 0, 0) : color(0, 32, 0));
    stroke(device.failed ? color(255, 0, 0) : color(0, 255, 0));
    strokeWeight(2);

    // Draw device as a rectangle instead of circle for more traditional look
    rectMode(CENTER);
    rect(device.x, device.y, 60, 40);

    // Draw device status indicators
    noStroke();
    fill(color(0, 255, 0));
    textAlign(CENTER, CENTER);
    textSize(14);
    text(device.id, device.x, device.y - 8);
    textSize(10);
    text(device.status, device.x, device.y + 8);

    // Draw activity indicator
    if (device.status === "sending") {
      fill(color(255, 255, 0));
      const indicatorY = device.y < busY ? device.y + 25 : device.y - 25;
      circle(device.x + 35, indicatorY, 10);
    }
    pop();
  });

  // Draw bus status
  push();
  textSize(14);
  textAlign(LEFT);
  fill(color(0, 255, 0));
  text(
    `Bus Status: ${
      busStatus.failed ? "Failed" : busStatus.busy ? "Busy" : "Idle"
    }`,
    50,
    30,
  );
  pop();
}

function drawPacket(x, y, isCollision) {
  push();
  fill(isCollision ? color(255, 0, 0) : color(0, 255, 0));
  noStroke();
  circle(x, y, 10);
  pop();
}

function createPacket(sender, isCollision = false) {
  packets.push({
    sender: sender,
    x: sender.x,
    y: sender.y,
    phase: "down",
    progress: 0,
    isCollision,
  });

  if (!isCollision) {
    logEvent(`📦 Device ${sender.id} created new packet`);
  }
}

function updatePackets() {
  const busY = height / 2;

  for (let i = packets.length - 1; i >= 0; i--) {
    let packet = packets[i];

    // Update packet position based on phase
    switch (packet.phase) {
      case "down":
        // Move towards bus
        packet.y = lerp(packet.sender.y, busY, packet.progress);
        if (packet.progress >= 1) {
          packet.phase = "broadcast";
          packet.progress = 0;
          logEvent(`Packet from Device ${packet.sender.id} reached the bus`);
        }
        break;
      case "broadcast":
        packet.y = busY;
        if (packet.progress >= 1) {
          packet.phase = "up";
          packet.progress = 0;
          logEvent(
            `Packet from Device ${packet.sender.id} broadcasting on bus`,
          );
        }
        break;
      case "up":
        devices.forEach((device) => {
          if (!device.failed && device !== packet.sender) {
            let packetY = lerp(busY, device.y, packet.progress);
            drawPacket(device.x, packetY, packet.isCollision);
          }
        });
        if (packet.progress >= 1) {
          completeTransmission(packet.sender);
          packets.splice(i, 1);
        }
        break;
    }

    // Draw packet
    drawPacket(packet.x, packet.y, packet.isCollision);

    // Update progress
    packet.progress += 0.02;
  }
}

function updateCollisions() {
  const busY = height / 2; // Collision should happen at bus level

  for (let i = collisions.length - 1; i >= 0; i--) {
    let collision = collisions[i];
    push();
    fill(color(255, 0, 0, collision.alpha));
    noStroke();
    // Draw collision effect centered on the bus line
    circle(collision.x, busY, collision.size);
    pop();

    // Update collision animation
    collision.size += 2;
    collision.alpha -= 5;

    if (collision.alpha <= 0) {
      collisions.splice(i, 1);
    }
  }
}

function createCollision(x, y) {
  collisions.push({
    x: x,
    y: y,
    size: 10,
    alpha: 255,
  });
}

function simulateCollision(sender = null) {
  if (!sender) {
    const workingDevices = devices.filter((d) => !d.failed);
    if (workingDevices.length === 0) return;
    sender = random(workingDevices);
  }

  sender.stats.collisions++;
  createCollision(sender.x, height / 2);
  packets = []; // Clear all packets
  busStatus.busy = false;
  sender.status = "idle";

  logEvent(`💥 Collision detected! Device ${sender.id}'s transmission failed`);
  logEvent(
    `ℹ️ Total collisions for Device ${sender.id}: ${sender.stats.collisions}`,
  );
}

function completeTransmission(sender) {
  const receivingDevices = devices.filter((d) => !d.failed && d !== sender);

  sender.stats.sent++;
  devices.forEach((device) => {
    if (!device.failed && device !== sender) {
      device.stats.received++;
    }
  });

  sender.status = "idle";
  busStatus.busy = false;

  logEvent(`✅ Device ${sender.id} completed transmission`);
  logEvent(`📊 Stats for Device ${sender.id}:`);
  logEvent(`   - Total packets sent: ${sender.stats.sent}`);
  logEvent(
    `   - Successfully received by ${receivingDevices.length} device(s)`,
  );
}

function simulateDeviceFailure() {
  const workingDevices = devices.filter((d) => !d.failed);
  if (workingDevices.length === 0) {
    logEvent("❌ All devices have failed");
    return;
  }

  const device = random(workingDevices);
  device.failed = true;
  device.status = "failed";

  const remainingDevices = workingDevices.length - 1;
  logEvent(`🔧 Device ${device.id} has failed`);
  logEvent(`ℹ️ ${remainingDevices} working device(s) remaining`);

  // If device was in middle of transmission
  if (device.status === "sending") {
    packets = []; // Clear any pending packets
    busStatus.busy = false;
    logEvent(
      `❌ Ongoing transmission from Device ${device.id} terminated due to failure`,
    );
  }
}

function simulateBackboneFailure() {
  if (busStatus.failed) {
    logEvent("ℹ️ Bus already failed");
    return;
  }

  busStatus.failed = true;
  packets = [];
  logEvent("🚫 Bus backbone has failed");
  logEvent("❌ All ongoing transmissions terminated");

  // Count active devices
  const workingDevices = devices.filter((d) => !d.failed).length;
  logEvent(`ℹ️ ${workingDevices} device(s) disconnected from network`);
}

function logEvent(message) {
  const logDiv = document.getElementById("event-log");
  const time = new Date().toLocaleTimeString();
  const logEntry = document.createElement("div");
  logEntry.innerHTML = `[${time}] ${message}`;
  logEntry.style.borderBottom = "1px solid #004400";
  logEntry.style.padding = "4px 0";
  logDiv.insertBefore(logEntry, logDiv.firstChild);

  // Keep only the last 50 messages
  while (logDiv.children.length > 50) {
    logDiv.removeChild(logDiv.lastChild);
  }
}

function drawDeviceDetails() {
  if (deviceDetails) {
    push();
    fill(255);
    stroke(0);
    rect(mouseX + 10, mouseY + 10, 150, 80);
    fill(0);
    noStroke();
    textSize(12);
    textAlign(LEFT);
    text(`Device ID: ${deviceDetails.id}`, mouseX + 15, mouseY + 25);
    text(`Status: ${deviceDetails.status}`, mouseX + 15, mouseY + 40);
    text(`Packets Sent: ${deviceDetails.stats.sent}`, mouseX + 15, mouseY + 55);
    text(
      `Packets Received: ${deviceDetails.stats.received}`,
      mouseX + 15,
      mouseY + 70,
    );
    text(
      `Collisions: ${deviceDetails.stats.collisions}`,
      mouseX + 15,
      mouseY + 85,
    );
    pop();
  }
}

function random(arr) {
  if (Array.isArray(arr)) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  return Math.random();
}
