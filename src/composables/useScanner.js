import { onMounted, onBeforeUnmount, ref } from 'vue'
import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill'
import zxingReaderWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'

// Self-host the wasm binary (via Vite's asset pipeline, so it's fingerprinted
// and precached by the service worker) instead of the library's jsDelivr CDN
// default - a scan-first app shouldn't depend on a third-party CDN being up.
prepareZXingModule({
  overrides: {
    locateFile: (path, prefix) => (path.endsWith('.wasm') ? zxingReaderWasmUrl : prefix + path),
  },
})

// Pantry products are virtually always EAN/UPC.
const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']

// The middle band the aiming reticle shows, as fractions of the video's
// native resolution - cropped out before decoding so what the user frames
// is what actually gets scanned, and so the decoder searches fewer pixels.
const CROP_AREA = { top: 0.3, bottom: 0.3, left: 0.08, right: 0.08 }

// Runs our own lightweight capture loop against a real ZXing-C++ engine
// compiled to WebAssembly - a completely different tier of speed and
// accuracy than either html5-qrcode (zxing-js, a thin and unreliable JS
// port) or Quagga2 (a pure-JS locator/decoder pipeline). We own the
// <video> element directly instead of handing a container off to a
// library, so pause()/resume() is just "stop/restart our own loop".
export function useScanner({ onDecoded, videoRef }) {
  const isRunning = ref(false)
  const isPaused = ref(false)
  const errorMessage = ref('')

  const detector = new BarcodeDetector({ formats: FORMATS })
  const cropCanvas = document.createElement('canvas')
  const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true })

  let stream = null
  let animationFrameId = null
  let consecutiveErrors = 0
  // detect() resolving with an empty array is the normal "no barcode in this
  // frame" case - it only rejects on a real failure (e.g. the wasm module
  // itself failing to load), which would otherwise retry silently forever.
  const MAX_CONSECUTIVE_ERRORS = 10

  function cropToScanArea() {
    const video = videoRef.value
    const videoWidth = video?.videoWidth
    const videoHeight = video?.videoHeight
    const displayWidth = video?.clientWidth
    const displayHeight = video?.clientHeight
    if (!videoWidth || !videoHeight || !displayWidth || !displayHeight) return null

    // The <video> is styled with object-fit: cover, which - whenever the
    // camera's native aspect ratio doesn't match the screen's (the common
    // case) - crops away part of the frame before it's ever shown. Without
    // reproducing that same crop here first, CROP_AREA's percentages are
    // taken of the *uncropped* native frame, covering a much larger and
    // differently-placed region than the reticle the user actually sees.
    const videoAspect = videoWidth / videoHeight
    const displayAspect = displayWidth / displayHeight

    let visibleWidth = videoWidth
    let visibleHeight = videoHeight
    let visibleX = 0
    let visibleY = 0

    if (videoAspect > displayAspect) {
      visibleWidth = videoHeight * displayAspect
      visibleX = (videoWidth - visibleWidth) / 2
    } else {
      visibleHeight = videoWidth / displayAspect
      visibleY = (videoHeight - visibleHeight) / 2
    }

    // Now crop down to the reticle's percentage of that visible area.
    const left = visibleX + visibleWidth * CROP_AREA.left
    const top = visibleY + visibleHeight * CROP_AREA.top
    const width = visibleWidth * (1 - CROP_AREA.left - CROP_AREA.right)
    const height = visibleHeight * (1 - CROP_AREA.top - CROP_AREA.bottom)

    cropCanvas.width = width
    cropCanvas.height = height
    cropCtx.drawImage(video, left, top, width, height, 0, 0, width, height)
    return cropCanvas
  }

  async function detectLoop() {
    if (isPaused.value) return

    const frame = cropToScanArea()
    if (frame) {
      try {
        const barcodes = await detector.detect(frame)
        consecutiveErrors = 0
        if (barcodes.length > 0) {
          // Instant tactile confirmation that a code was recognized, without
          // needing to look at the screen. Silently unsupported on iOS
          // Safari (no Vibration API there at all) - harmless no-op.
          navigator.vibrate?.(50)
          pause()
          onDecoded(barcodes[0].rawValue)
          return
        }
      } catch {
        consecutiveErrors += 1
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          errorMessage.value = 'Barcode-Scanner konnte nicht geladen werden.'
          return
        }
      }
    }

    animationFrameId = requestAnimationFrame(detectLoop)
  }

  async function start() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })

      videoRef.value.srcObject = stream
      await videoRef.value.play()

      isRunning.value = true
      detectLoop()
    } catch {
      errorMessage.value = 'Kamera konnte nicht gestartet werden. Bitte Kamera-Zugriff erlauben.'
    }
  }

  function pause() {
    if (!isRunning.value || isPaused.value) return
    isPaused.value = true
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
  }

  function resume() {
    if (!isRunning.value || !isPaused.value) return
    isPaused.value = false
    detectLoop()
  }

  function stop() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
    stream?.getTracks().forEach((track) => track.stop())
    isRunning.value = false
  }

  onMounted(start)
  onBeforeUnmount(stop)

  return { isRunning, isPaused, errorMessage, pause, resume }
}
