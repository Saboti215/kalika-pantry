import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

const SCANNER_ELEMENT_ID = 'kalika-pantry-scanner'

// Without an explicit list, html5-qrcode's ZXing fallback biases towards QR
// and can silently miss 1D barcodes; being explicit both fixes that and
// speeds up decoding by skipping formats we don't care about.
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
]

// Wraps html5-qrcode's imperative Html5Qrcode class (not the pre-built
// Html5QrcodeScanner UI) so the camera feed can sit full-screen behind our
// own overlay, with just pause()/resume() exposed to the scan-first flow.
export function useScanner({ onDecoded }) {
  const isRunning = ref(false)
  const isPaused = ref(false)
  const errorMessage = ref('')
  let html5QrCode = null

  async function start() {
    html5QrCode = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      verbose: false,
      formatsToSupport: SUPPORTED_FORMATS,
      // Deliberately not using useBarCodeDetectorIfSupported: iOS Safari (the
      // primary target) never implemented the Shape Detection API, so it
      // would help nobody - and it's an experimental flag that has shown to
      // break camera startup outright in some browsers.
    })
    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        // Wide/short box matches a 1D barcode's proportions better than a
        // square one, giving the decoder more usable horizontal resolution.
        { fps: 10, qrbox: { width: 300, height: 140 } },
        handleDecoded,
        // Per-frame "no barcode found" callback - fires constantly while
        // aiming, so it's intentionally ignored rather than logged.
        () => {}
      )
      isRunning.value = true
    } catch {
      errorMessage.value = 'Kamera konnte nicht gestartet werden. Bitte Kamera-Zugriff erlauben.'
    }
  }

  function handleDecoded(decodedText) {
    if (isPaused.value) return
    pause()
    onDecoded(decodedText)
  }

  function pause() {
    if (!html5QrCode || !isRunning.value || isPaused.value) return
    html5QrCode.pause(true)
    isPaused.value = true
  }

  function resume() {
    if (!html5QrCode || !isRunning.value || !isPaused.value) return
    html5QrCode.resume()
    isPaused.value = false
  }

  async function stop() {
    if (html5QrCode && isRunning.value) {
      try {
        await html5QrCode.stop()
      } catch {
        // Already stopped, or never fully started - safe to ignore.
      }
      html5QrCode.clear()
    }
    isRunning.value = false
  }

  onMounted(start)
  onBeforeUnmount(stop)

  return { isRunning, isPaused, errorMessage, pause, resume, elementId: SCANNER_ELEMENT_ID }
}
