import {
	PoseLandmarker,
	FilesetResolver,
	DrawingUtils
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

let poseLandmarker;
const runningMode = "VIDEO";
let webcamButton;
const videoHeight = "360px";
const videoWidth = "480px";

async function createPoseLandmarker() {
	const vision = await FilesetResolver.forVisionTasks(
		"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
	);
	poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
		baseOptions: {
			modelAssetPath: '../assets/pose_landmarker_lite.task',
			delegate: "GPU"
		},
		runningMode: runningMode,
	});
};

createPoseLandmarker();

/****************
 * Xử lý webcam *
 ****************/

const video = document.getElementById("webcam")
const canvasElement = document.getElementById("pose-canvas")
const canvasCtx = canvasElement.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);

// Máy người dùng có webcam không
const hasGetUserMedia = () => navigator.mediaDevices.getUserMedia;

if (hasGetUserMedia()) {
	webcamButton = document.getElementById("webcam-button");
	webcamButton.addEventListener("click", enableCam);
} else {
	alert("Có vẻ máy bạn không có webcam rồi :)");
}

let webcamActive = false

function enableCam(event) {
	if (! poseLandmarker) {
		alert("Đang load model. Chờ chút");
		return;
	}

	if (webcamActive == false) {
		webcamActive = true
		webcamButton.innerHTML = 'Các em ko được tắt cam nhé'
		webcamButton.classList.replace('btn-primary', 'btn-danger')

		navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
			video.srcObject = stream;
			video.addEventListener("loadeddata", analyzePose);
		})
	} else {
		webcamActive = false
		webcamButton.innerHTML = 'Bật lại cam đi các em'
		webcamButton.classList.replace('btn-danger', 'btn-primary')

		video.srcObject = null
	}
}

let lastVideoTime = -1;

async function analyzePose() {
	canvasElement.style.height = videoHeight;
	video.style.height = videoHeight;
	canvasElement.style.width = videoWidth;
	video.style.width = videoWidth;

	let startTimeMs = performance.now();

	if (lastVideoTime !== video.currentTime) {
		lastVideoTime = video.currentTime;

		poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
			canvasCtx.save();
			canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
			canvasCtx.lineWidth = 1

			for (const landmark of result.landmarks) {
				drawingUtils.drawLandmarks(
					landmark,
					{
						lineWidth: 1,
						radius: 2
					}
				);
				drawingUtils.drawConnectors(
					landmark,
					PoseLandmarker.POSE_CONNECTIONS,
					{
						lineWidth: 1
					}
				);
			}

			canvasCtx.restore();
		});
	}

	window.requestAnimationFrame(analyzePose);
}
