/* eslint-disable no-restricted-globals */

// ✅ Reuse canvas — avoid GC pressure
let cachedCanvas = null;
let cachedCtx = null;

self.onmessage = async (e) => {
    const { imageBitmap, roi, quality = 0.85 } = e.data;

    try {
        const width = Math.max(1, Math.round(roi.width));
        const height = Math.max(1, Math.round(roi.height));

        // ✅ FIX: Since runDetection now sends a pre-cropped bitmap,
        // roi is always {x:0, y:0, width:320, height:320}.
        // We just re-encode it directly — no crop step needed.
        if (!cachedCanvas || cachedCanvas.width !== width || cachedCanvas.height !== height) {
            cachedCanvas = new OffscreenCanvas(width, height);
            cachedCtx = cachedCanvas.getContext('2d');
        }

        cachedCtx.clearRect(0, 0, width, height);
        // Draw the full bitmap (already cropped by caller)
        cachedCtx.drawImage(imageBitmap, 0, 0, width, height);

        const blob = await cachedCanvas.convertToBlob({ type: 'image/jpeg', quality });

        // ✅ ArrayBuffer → btoa — faster than FileReader
        const arrayBuffer = await blob.arrayBuffer();
        const uint8 = new Uint8Array(arrayBuffer);

        // Chunked to avoid call stack overflow
        const CHUNK = 8192;
        let binary = '';
        for (let i = 0; i < uint8.length; i += CHUNK) {
            binary += String.fromCharCode(...uint8.subarray(i, i + CHUNK));
        }

        self.postMessage({ success: true, base64: `data:image/jpeg;base64,${btoa(binary)}` });

    } catch (err) {
        self.postMessage({ success: false, error: err.message });
    } finally {
        imageBitmap.close();
    }
};