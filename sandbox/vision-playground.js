"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var tf = require("@tensorflow/tfjs");
var tfjs_converter_1 = require("@tensorflow/tfjs-converter");
// Placeholder for model URLs - replace with actual URLs
var EFFICIENTDET_URL = 'https://tfhub.dev/tensorflow/efficientdet/lite0/detection/1?tfjs-format=graph_model';
var YOLOV8N_URL = 'https://tfhub.dev/tensorflow/yolov8n/detection/1?tfjs-format=graph_model';
// Simulate image loading and preprocessing
function loadImage(url) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            // In a real scenario, you would load an image (e.g., from a URL or file)
            // and convert it to a TensorFlow tensor. For this simulation, we create a dummy tensor.
            console.log("Simulating loading image from: ".concat(url));
            // Create a dummy image tensor (e.g., 640x640 with 3 channels)
            return [2 /*return*/, tf.zeros([640, 640, 3])];
        });
    });
}
function runBenchmark(modelName, modelUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var model, dummyImage, numIterations, totalTime, i, startTime, endTime, avgTime, fps;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("\n--- Running benchmark for ".concat(modelName, " ---"));
                    return [4 /*yield*/, (0, tfjs_converter_1.loadGraphModel)(modelUrl)];
                case 1:
                    model = _a.sent();
                    console.log("".concat(modelName, " model loaded."));
                    return [4 /*yield*/, loadImage('dummy_image.jpg')];
                case 2:
                    dummyImage = _a.sent();
                    numIterations = 50;
                    totalTime = 0;
                    for (i = 0; i < numIterations; i++) {
                        startTime = performance.now();
                        // Simulate prediction
                        model.execute(dummyImage.expandDims(0));
                        endTime = performance.now();
                        totalTime += (endTime - startTime);
                    }
                    avgTime = totalTime / numIterations;
                    fps = 1000 / avgTime;
                    console.log("Average inference time per image: ".concat(avgTime.toFixed(2), " ms"));
                    console.log("Estimated FPS: ".concat(fps.toFixed(2)));
                    // Dispose tensors to free up memory
                    dummyImage.dispose();
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // Ensure TensorFlow.js backend is ready
                return [4 /*yield*/, tf.ready()];
                case 1:
                    // Ensure TensorFlow.js backend is ready
                    _a.sent();
                    console.log("TensorFlow.js backend: ".concat(tf.getBackend()));
                    // Run benchmarks for both models
                    return [4 /*yield*/, runBenchmark('EfficientDet-Lite', EFFICIENTDET_URL)];
                case 2:
                    // Run benchmarks for both models
                    _a.sent();
                    return [4 /*yield*/, runBenchmark('YOLOv8-n', YOLOV8N_URL)];
                case 3:
                    _a.sent();
                    console.log('\nBenchmark simulation complete. Actual mAP and RAM usage would require a full dataset and environment.');
                    console.log('Please refer to the generated benchmark_v1.md for a summary.');
                    return [2 /*return*/];
            }
        });
    });
}
main();
