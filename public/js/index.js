const video = document.getElementById("webcam")
const canvasElement = document.getElementById("pose-canvas")
const trafficLightImg = document.getElementById("traffic-light-img")

const videoHeight = "360px";
const videoWidth = "480px";

let detector

// Create a detector
async function createDetector() {
	detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
		modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
		modelUrl: '../assets/pose_classifier.tflite',
		enableTracking: true
	});
}

createDetector()

/****************
 * Xử lý webcam *
 ****************/

let renderer = new RendererCanvas2d(canvasElement);

// Máy người dùng có webcam không
const hasGetUserMedia = () => navigator.mediaDevices.getUserMedia;
let webcamButton;

if (hasGetUserMedia()) {
	webcamButton = document.getElementById("webcam-button");
	webcamButton.addEventListener("click", enableCam);
} else {
	alert("Có vẻ máy bạn không có webcam rồi :)");
}

let webcamActive = false

function enableCam(event) {
	if (! detector) {
		alert("Đang load engine. Chờ chút");
		return;
	}

	if (webcamActive == false) {
		webcamActive = true
		webcamButton.innerHTML = 'Tắt webcam'
		webcamButton.classList.replace('btn-primary', 'btn-danger')

		navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
			video.srcObject = stream;
			video.addEventListener("loadeddata", analyzePose);
		})
	} else {
		webcamActive = false
		webcamButton.innerHTML = 'Bật webcam'
		webcamButton.classList.replace('btn-danger', 'btn-primary')

		video.srcObject = null
	}
}

/******************
 * Xử lý hình ảnh *
 ******************/

/**
 * Các điểm có (gần) thẳng hàng với nhau không
 *
 * @param {Number} direction Phương
 * 	- 0: Thẳng đứng
 * 	- 1: Nằm ngang
 * @param {Number} threshold Ngưỡng để xét thẳng hàng (có thể lệch bao nhiêu…). Giá trị trong khoảng từ 0 đến 1
 * @param {...NormalizedLandmark} points Các điểm tọa độ cơ thể
 * @returns {Boolean} Thẳng hàng trong ngưỡng đã xác định hay không
 */
function straight(direction, threshold, ...points) {
	if (direction == 0) {
		// Xét tọa độ trục hoành
		const xCoords = points.map(p => p.x)
		return (Math.max(...xCoords) - Math.min(...xCoords)) <= threshold

	} else if (direction == 1) {
		// Xét tọa độ trục tung
		const yCoords = points.map(p => p.y)
		return (Math.max(...yCoords) - Math.min(...yCoords)) <= threshold
	}
}

/**
 * Dựa vào bản đồ cơ thể có được, xác định xem đó là động tác gì và tương ứng với loại đèn nào
 *
 * @param {NormalizedLandmark[]} landmarks Bản đồ cơ thể (của một người)
 * @returns {Number} Mã loại đèn giao thông
 * - 0: Đèn đỏ
 * - 1: Đèn vàng
 * - 2: Đèn xanh
 * - -1: Không rõ
 */
function determinePose(landmarks) {
	// Tìm điểm
	const p6 = landmarks.find(v => v.name == 'right_shoulder')
	const p8 = landmarks.find(v => v.name == 'right_elbow')
	const p10 = landmarks.find(v => v.name == 'right_wrist')

	// Đèn đỏ:
	// Xét các điểm 6, 8, 10 có nằm dọc, gần thẳng hàng với nhau không, và 10 có phải cao nhất không 
	const redLightPose = straight(0, 0.1, p6, p8, p10) && p10.y < p6.y
	if (redLightPose) return 0

	// Đèn vàng:
	// Xét các điểm 6, 8, 10 có tạo thành góc vuông không (vuông tại 8)
	const yellowLightPose = straight(1, 0.05, p6, p8) && straight(0, 0.05, p8, p10)
	if (yellowLightPose) return 1

	// Đèn xanh:
	// Xét các điểm 6, 8, 10 có nằm ngang, gần thẳng hàng với nhau không
	const greenLightPose = straight(1, 0.1, p6, p8, p10)
	if (greenLightPose) return 2

	return -1
}

let lastVideoTime = -1;

function drawResult(result) {
	canvasCtx.save();
	canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
	canvasCtx.lineWidth = 1

	for (const landmarksPerson of result.landmarks) {
		drawingUtils.drawLandmarks(
			landmarksPerson,
			{
				lineWidth: 1,
				radius: 2,
				color: (data) => {
					switch (data.index) {
						case 12:	// Khớp vai phải
							return 'red'
						case 14:	// Khuỷu tay phải
							return 'green'
						case 16:	// Cổ tay phải
							return 'blue'
						default:
							return 'white'
					}
				}
			}
		);
		drawingUtils.drawConnectors(
			landmarksPerson,
			PoseLandmarker.POSE_CONNECTIONS,
			{
				lineWidth: 1
			}
		);
	}

	canvasCtx.restore();
}

/**
 * Phân tích luồng ảnh từ webcam, tìm ra bản đồ cơ thể, sau đó vẽ lên canvas
 *
 * @returns {Promise<null>}
 */
async function analyzePose() {
	canvasElement.style.height = videoHeight;
	video.style.height = videoHeight;
	canvasElement.style.width = videoWidth;
	video.style.width = videoWidth;

	let startTimeMs = performance.now();

	if (lastVideoTime !== video.currentTime) {
		lastVideoTime = video.currentTime;

		detector.estimatePoses(video, { maxPoses: 1, flipHorizontal: false }, startTimeMs, (result) => {
			const rendererParams = [camera.video, poses, true];
			renderer.draw(rendererParams);

			if (result.length > 0) {
				const normalizedKeypoints = detector.calculators.keypointsToNormalizedKeypoints(result[0].keypoints, video)
				const light = determinePose(normalizedKeypoints)

				switch (light) {
					case 0:
						trafficLightImg.src = './img/traffic-light-red.jpg'
						break
					case 1:
						trafficLightImg.src = './img/traffic-light-yellow.jpg'
						break
					case 2:
						trafficLightImg.src = './img/traffic-light-green.jpg'
						break
					default:
						trafficLightImg.src = './img/pepe-question.png'
				}
			}
		});
	}

	window.requestAnimationFrame(analyzePose);
}
