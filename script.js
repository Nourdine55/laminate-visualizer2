import {
  ImageSegmenter,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest";

let segmenter;
let canvas = new fabric.Canvas("canvas");
let floorMask;
let userImage;

// Load Floor AI model
async function loadModel() {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );

  segmenter = await ImageSegmenter.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-assets/room_segmentation.tflite",
    },
    outputCategoryMask: true,
  });
}

loadModel();

// Handle image upload
document.getElementById("upload").onchange = async function (e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = async function (f) {
    fabric.Image.fromURL(f.target.result, async (img) => {
      canvas.clear();
      userImage = img;
      img.scaleToWidth(900);
      canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));

      const input = document.createElement("img");
      input.src = f.target.result;
      await input.decode();

      const result = await segmenter.segment(input);
      const mask = result.categoryMask;

      const floorCanvas = document.createElement("canvas");
      floorCanvas.width = mask.width;
      floorCanvas.height = mask.height;

      const ctx = floorCanvas.getContext("2d");
      const imageData = ctx.createImageData(mask.width, mask.height);

      for (let i = 0; i < mask.data.length; i++) {
        const isFloor = mask.data[i] === 2;
        imageData.data[i * 4 + 0] = 0;
        imageData.data[i * 4 + 1] = 0;
        imageData.data[i * 4 + 2] = 0;
        imageData.data[i * 4 + 3] = isFloor ? 255 : 0;
      }

      ctx.putImageData(imageData, 0, 0);
      floorMask = floorCanvas;
    });
  };

  reader.readAsDataURL(file);
};

// Laminate thumbnails
const laminates = ["textures/lam1.jpg", "textures/lam2.jpg", "textures/lam3.jpg"];
const container = document.getElementById("laminates");

// Show laminate images
laminates.forEach((src) => {
  let img = document.createElement("img");
  img.src = src;
  img.style.margin = "5px";
  img.onclick = () => applyLaminate(src);
  container.appendChild(img);
});

// Apply laminate to floor only
function applyLaminate(src) {
  if (!floorMask) {
    alert("Please upload a photo and wait for AI to detect the floor.");
    return;
  }

  fabric.Image.fromURL(src, function (texture) {
    texture.scaleToWidth(900);
    texture.opacity = 0.75;

    const maskImg = new fabric.Image(floorMask, {
      selectable: false,
      absolutePositioned: true,
    });

    texture.clipPath = maskImg;

    canvas.add(texture);
    canvas.renderAll();
  });
}

// Download image
document.getElementById("download").onclick = function () {
  const dataURL = canvas.toDataURL("image/jpeg");
  const a = document.createElement("a");
  a.href = dataURL;
  a.download = "laminate-floor.jpg";
  a.click();
};
