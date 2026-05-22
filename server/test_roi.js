import { isInsideROI } from "./config/cameraConfig.js";

const roi = { x_min: 0.1, y_min: 0.1, x_max: 0.9, y_max: 0.9 };
const imgWidth = 1000;
const imgHeight = 1000;

const tests = [
    { name: "Center Point", bbox: [450, 450, 550, 550], expected: true },
    { name: "Top-Left Corner (Outside)", bbox: [0, 0, 50, 50], expected: false },
    { name: "Bottom-Right Corner (Inside Edge)", bbox: [800, 800, 850, 850], expected: true },
    { name: "Far Right (Outside)", bbox: [950, 450, 1000, 550], expected: false },
];

console.log("🧪 Testing ROI Intersection Logic...");
let passed = 0;

tests.forEach(t => {
    const result = isInsideROI(t.bbox, roi, imgWidth, imgHeight);
    const status = result === t.expected ? "✅ PASS" : "❌ FAIL";
    if (result === t.expected) passed++;
    console.log(`${status} | ${t.name.padEnd(25)} | Expected: ${t.expected}, Got: ${result}`);
});

console.log(`\n📊 Results: ${passed}/${tests.length} tests passed.`);
if (passed === tests.length) {
    process.exit(0);
} else {
    process.exit(1);
}
