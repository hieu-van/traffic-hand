import * as posedetection from '@tensorflow-models/pose-detection';

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

export function switchLight(video, results) {
    const trafficLightImg = document.getElementById("traffic-light-img")

    if (results.length > 0) {
        const normalizedKeypoints = posedetection.calculators.keypointsToNormalizedKeypoints(results[0].keypoints, video)
        const light = determinePose(normalizedKeypoints)

        switch (light) {
            case 0:
                trafficLightImg.src = 'assets/img/traffic-light-red.jpg'
                break
            case 1:
                trafficLightImg.src = 'assets/img/traffic-light-yellow.jpg'
                break
            case 2:
                trafficLightImg.src = 'assets/img/traffic-light-green.jpg'
                break
            default:
                trafficLightImg.src = 'assets/img/pepe-question.png'
        }
    }
}