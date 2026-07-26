import { onMounted, onBeforeUnmount, ref } from 'vue'
import Quagga from '@ericblade/quagga2'

// Pantry products are virtually always EAN/UPC - CODE_128 dropped so every
// frame spends its decode budget only on formats we'll actually see.
const READERS = ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader']

// Quagga2 has no built-in confidence gate; averaging the per-character error
// rate from decodedCodes is the community-standard mitigation for false
// positives (see the library's README, "Handling false positives").
const MAX_AVERAGE_ERROR = 0.15

// Wraps Quagga2 (a scanner purpose-built for 1D barcodes - unlike
// html5-qrcode/zxing-js, which is QR-first and unreliable at EAN/UPC) so the
// camera feed can sit full-screen behind our own overlay, with just
// pause()/resume() exposed to the scan-first flow.
export function useScanner({ onDecoded, containerRef }) {
  const isRunning = ref(false)
  const isPaused = ref(false)
  const errorMessage = ref('')
  let isInitialized = false

  function averageDecodeError(codeResult) {
    const errors = codeResult.decodedCodes.map((entry) => entry.error).filter((error) => error !== undefined)
    if (errors.length === 0) return 0
    return errors.reduce((sum, error) => sum + error, 0) / errors.length
  }

  function handleDetected(result) {
    if (isPaused.value) return
    if (averageDecodeError(result.codeResult) > MAX_AVERAGE_ERROR) return

    pause()
    onDecoded(result.codeResult.code)
  }

  async function start() {
    try {
      await Quagga.init({
        inputStream: {
          type: 'LiveStream',
          target: containerRef.value,
          // A higher-resolution stream keeps thin barcode bars distinguishable
          // instead of blurring together - the biggest lever for read rate.
          constraints: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          // Restrict decoding to the same middle band the aiming reticle
          // shows, so what the user frames is what actually gets scanned -
          // also less area to search per frame, which itself speeds things up.
          area: { top: '30%', bottom: '30%', left: '8%', right: '8%' },
        },
        decoder: { readers: READERS },
        // 'large' assumes the product is held close to the camera (the
        // expected scan-first distance) - fewer, bigger patches to search
        // per frame than the 'medium' default, at the cost of missing
        // barcodes held far away.
        locator: { patchSize: 'large', halfSample: true },
        // Web workers need DOM access that isn't guaranteed across bundlers
        // and browsers, so decoding runs on the main thread.
        numOfWorkers: 0,
        locate: true,
      })

      isInitialized = true
      Quagga.onDetected(handleDetected)
      Quagga.start()
      isRunning.value = true
    } catch {
      errorMessage.value = 'Kamera konnte nicht gestartet werden. Bitte Kamera-Zugriff erlauben.'
    }
  }

  function pause() {
    if (!isRunning.value || isPaused.value) return
    Quagga.pause()
    isPaused.value = true
  }

  function resume() {
    if (!isRunning.value || !isPaused.value) return
    Quagga.start()
    isPaused.value = false
  }

  function stop() {
    if (!isInitialized) return
    Quagga.offDetected(handleDetected)
    Quagga.stop()
    isRunning.value = false
  }

  onMounted(start)
  onBeforeUnmount(stop)

  return { isRunning, isPaused, errorMessage, pause, resume }
}
