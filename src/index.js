import '@tensorflow/tfjs-backend-webgl';

import * as posedetection from '@tensorflow-models/pose-detection';

import { Camera } from './camera';
import { RendererCanvas2d } from './renderer_canvas2d';
import { setupDatGui } from './option_panel';
import { STATE } from './params';
import { setupStats } from './stats_panel';
import { setBackendAndEnvFlags } from './util';
import { switchLight } from './gestureProcessor'

let detector, camera, stats;
let startInferenceTime, numInferences = 0;
let inferenceTimeSum = 0, lastPanelUpdate = 0;
let rafId;
let renderer = null;

async function createDetector() {
	let modelType = posedetection.movenet.modelType.SINGLEPOSE_THUNDER;
	const modelConfig = {modelType};

	if (STATE.modelConfig.customModel !== '') {
		modelConfig.modelUrl = STATE.modelConfig.customModel;
	}

	if (STATE.modelConfig.type === 'multipose') {
		modelConfig.enableTracking = STATE.modelConfig.enableTracking;
	}

	return posedetection.createDetector(STATE.model, modelConfig);
}

async function checkGuiUpdate() {
	if (STATE.isTargetFPSChanged || STATE.isSizeOptionChanged) {
		camera = await Camera.setupCamera(STATE.camera);
		STATE.isTargetFPSChanged = false;
		STATE.isSizeOptionChanged = false;
	}

	if (STATE.isModelChanged || STATE.isFlagChanged || STATE.isBackendChanged) {
		STATE.isModelChanged = true;

		window.cancelAnimationFrame(rafId);

		if (detector != null) {
			detector.dispose();
		}

		if (STATE.isFlagChanged || STATE.isBackendChanged) {
			await setBackendAndEnvFlags(STATE.flags, STATE.backend);
		}

		try {
			detector = await createDetector(STATE.model);
		} catch (error) {
			detector = null;
			alert(error);
		}

		STATE.isFlagChanged = false;
		STATE.isBackendChanged = false;
		STATE.isModelChanged = false;
	}
}

function beginEstimatePosesStats() {
	startInferenceTime = (performance || Date).now();
}

function endEstimatePosesStats() {
	const endInferenceTime = (performance || Date).now();
	inferenceTimeSum += endInferenceTime - startInferenceTime;
	++numInferences;

	const panelUpdateMilliseconds = 1000;
	if (endInferenceTime - lastPanelUpdate >= panelUpdateMilliseconds) {
		const averageInferenceTime = inferenceTimeSum / numInferences;
		inferenceTimeSum = 0;
		numInferences = 0;
		stats.customFpsPanel.update(
				1000.0 / averageInferenceTime, 120 /* maxValue */);
		lastPanelUpdate = endInferenceTime;
	}
}

async function renderResult() {
	if (camera.video.readyState < 2) {
		await new Promise((resolve) => {
			camera.video.onloadeddata = () => {
				resolve(video);
			};
		});
	}

	let poses = null;

	// Detector can be null if initialization failed (for example when loading
	// from a URL that does not exist).
	if (detector != null) {
		// FPS only counts the time it takes to finish estimatePoses.
		beginEstimatePosesStats();

		// Detectors can throw errors, for example when using custom URLs that
		// contain a model that doesn't provide the expected output.
		try {
			poses = await detector.estimatePoses(camera.video, { maxPoses: STATE.modelConfig.maxPoses, flipHorizontal: false });
		} catch (error) {
			detector.dispose();
			detector = null;
			alert(error);
		}

		endEstimatePosesStats();
	}

	const rendererParams = [camera.video, poses, STATE.isModelChanged];
	renderer.draw(rendererParams);
	switchLight(camera.video, poses)
}

async function renderPrediction() {
	await checkGuiUpdate();

	if (! STATE.isModelChanged) {
		await renderResult();
	}

	rafId = requestAnimationFrame(renderPrediction);
};

async function app() {
	// Gui content will change depending on which model is in the query string.
	const urlParams = new URLSearchParams(window.location.search);

	if (! urlParams.has('model')) {
		alert('Cannot find model in the query string.');
		return;
	}

	await setupDatGui(urlParams);

	stats = setupStats();

	camera = await Camera.setup(STATE.camera);

	await setBackendAndEnvFlags(STATE.flags, STATE.backend);

	detector = await createDetector();

	const canvas = document.getElementById('output');

	canvas.width = camera.video.width;
	canvas.height = camera.video.height;

	renderer = new RendererCanvas2d(canvas);

	renderPrediction();
};

app();