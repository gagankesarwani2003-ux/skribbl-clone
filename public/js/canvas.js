/**
 * HTML5 Canvas Drawing Engine with normalized coordinates (800x600 virtual resolution),
 * smooth line interpolation, flood fill BFS, undo, and real-time network sync.
 */
class PaintCanvas {
  constructor(canvasElement, onActionCallback) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.onAction = onActionCallback || (() => {});

    // Virtual coordinate resolution
    this.width = 800;
    this.height = 600;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Drawing state
    this.isDrawing = false;
    this.canDraw = false; // Only true when active drawer
    this.tool = "brush"; // "brush", "eraser", "fill"
    this.color = "#000000";
    this.brushSize = 6;

    this.lastX = 0;
    this.lastY = 0;
    this.currentPath = null;
    this.actionsHistory = [];

    this.initCanvas();
    this.bindEvents();
  }

  initCanvas() {
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  setCanDraw(canDraw) {
    this.canDraw = canDraw;
    this.canvas.style.cursor = canDraw ? "crosshair" : "default";
  }

  setTool(tool) {
    this.tool = tool;
  }

  setColor(color) {
    this.color = color;
  }

  setBrushSize(size) {
    this.brushSize = size;
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    return {
      x: Math.round(((clientX - rect.left) / rect.width) * this.width),
      y: Math.round(((clientY - rect.top) / rect.height) * this.height)
    };
  }

  bindEvents() {
    const startDraw = (e) => {
      if (!this.canDraw) return;
      e.preventDefault();
      const coords = this.getCanvasCoords(e);

      if (this.tool === "fill") {
        this.executeFill(coords.x, coords.y, this.color, true);
        return;
      }

      this.isDrawing = true;
      this.lastX = coords.x;
      this.lastY = coords.y;

      const strokeColor = this.tool === "eraser" ? "#ffffff" : this.color;
      this.currentPath = {
        type: "stroke",
        color: strokeColor,
        size: this.brushSize,
        points: [[coords.x, coords.y]]
      };

      // Draw initial point / dot
      this.drawSegment(coords.x, coords.y, coords.x, coords.y, strokeColor, this.brushSize);
    };

    const moveDraw = (e) => {
      if (!this.canDraw || !this.isDrawing) return;
      e.preventDefault();
      const coords = this.getCanvasCoords(e);

      // Only record if moved at least 2 pixels to reduce payload size
      const dist = Math.hypot(coords.x - this.lastX, coords.y - this.lastY);
      if (dist >= 2) {
        const strokeColor = this.tool === "eraser" ? "#ffffff" : this.color;
        this.drawSegment(this.lastX, this.lastY, coords.x, coords.y, strokeColor, this.brushSize);

        this.currentPath.points.push([coords.x, coords.y]);

        // Send streaming segment to server
        this.onAction({
          type: "segment",
          x1: this.lastX,
          y1: this.lastY,
          x2: coords.x,
          y2: coords.y,
          color: strokeColor,
          size: this.brushSize
        });

        this.lastX = coords.x;
        this.lastY = coords.y;
      }
    };

    const endDraw = (e) => {
      if (!this.canDraw || !this.isDrawing) return;
      e.preventDefault();
      this.isDrawing = false;

      if (this.currentPath && this.currentPath.points.length > 0) {
        this.actionsHistory.push(this.currentPath);
        this.onAction({
          type: "path_end",
          path: this.currentPath
        });
      }
      this.currentPath = null;
    };

    // Pointer events (handles Mouse, Touch, Stylus universally)
    this.canvas.addEventListener("pointerdown", startDraw);
    window.addEventListener("pointermove", moveDraw);
    window.addEventListener("pointerup", endDraw);
    window.addEventListener("pointercancel", endDraw);
  }

  drawSegment(x1, y1, x2, y2, color, size) {
    this.ctx.strokeStyle = color;
    this.ctx.fillStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    // Fill round cap at joint
    this.ctx.beginPath();
    this.ctx.arc(x2, y2, size / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // --- Flood Fill Algorithm (BFS) ---

  executeFill(startX, startY, fillColorHex, broadcast = false) {
    const rgb = this.hexToRgb(fillColorHex);
    if (!rgb) return;

    const imgData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imgData.data;

    const startIndex = (startY * this.width + startX) * 4;
    const targetR = data[startIndex];
    const targetG = data[startIndex + 1];
    const targetB = data[startIndex + 2];
    const targetA = data[startIndex + 3];

    // Same color check
    if (targetR === rgb.r && targetG === rgb.g && targetB === rgb.b && targetA === 255) {
      return;
    }

    const matchTarget = (idx) => {
      return (
        Math.abs(data[idx] - targetR) < 15 &&
        Math.abs(data[idx + 1] - targetG) < 15 &&
        Math.abs(data[idx + 2] - targetB) < 15 &&
        Math.abs(data[idx + 3] - targetA) < 15
      );
    };

    const colorPixel = (idx) => {
      data[idx] = rgb.r;
      data[idx + 1] = rgb.g;
      data[idx + 2] = rgb.b;
      data[idx + 3] = 255;
    };

    const stack = [[startX, startY]];
    const seen = new Uint8Array(this.width * this.height);

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      const pixIdx = cy * this.width + cx;
      if (seen[pixIdx]) continue;
      seen[pixIdx] = 1;

      const byteIdx = pixIdx * 4;
      if (!matchTarget(byteIdx)) continue;

      colorPixel(byteIdx);

      if (cx > 0) stack.push([cx - 1, cy]);
      if (cx < this.width - 1) stack.push([cx + 1, cy]);
      if (cy > 0) stack.push([cx, cy - 1]);
      if (cy < this.height - 1) stack.push([cx, cy + 1]);
    }

    this.ctx.putImageData(imgData, 0, 0);

    const action = {
      type: "fill",
      x: startX,
      y: startY,
      color: fillColorHex
    };

    this.actionsHistory.push(action);

    if (broadcast) {
      this.onAction(action);
    }
  }

  hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  // --- Clear & Undo ---

  clearCanvas(broadcast = true) {
    this.initCanvas();
    this.actionsHistory = [];

    if (broadcast) {
      this.onAction({ type: "clear" });
    }
  }

  undo(broadcast = true) {
    if (this.actionsHistory.length === 0) return;
    this.actionsHistory.pop();
    this.redrawAll();

    if (broadcast) {
      this.onAction({ type: "undo" });
    }
  }

  redrawAll() {
    this.initCanvas();
    for (const act of this.actionsHistory) {
      this.applyAction(act, false);
    }
  }

  loadHistory(history) {
    this.initCanvas();
    this.actionsHistory = [...(history || [])];
    this.redrawAll();
  }

  // --- Apply Remote Action from Network ---

  applyAction(action, saveToHistory = true) {
    if (!action) return;

    if (action.type === "segment") {
      this.drawSegment(action.x1, action.y1, action.x2, action.y2, action.color, action.size);
    } else if (action.type === "path_end") {
      if (saveToHistory) this.actionsHistory.push(action.path);
    } else if (action.type === "stroke") {
      if (action.points && action.points.length > 0) {
        for (let i = 0; i < action.points.length - 1; i++) {
          const p1 = action.points[i];
          const p2 = action.points[i + 1];
          this.drawSegment(p1[0], p1[1], p2[0], p2[1], action.color, action.size);
        }
      }
      if (saveToHistory) this.actionsHistory.push(action);
    } else if (action.type === "fill") {
      this.executeFill(action.x, action.y, action.color, false);
      if (saveToHistory) this.actionsHistory.push(action);
    } else if (action.type === "clear") {
      this.initCanvas();
      if (saveToHistory) this.actionsHistory = [];
    } else if (action.type === "undo") {
      this.undo(false);
    }
  }
}

window.PaintCanvas = PaintCanvas;
