import { onMounted, onBeforeUnmount, ref } from 'vue'
import Quagga from '@ericblade/quagga2'

// Prioritized so EAN/UPC (our actual use case) are tried before CODE_128,
// per the library's own guidance for biasing towards known-common formats.
const READERS = ['ean_reader', 'ean_8_reader', 'upc_reader', 'upc_e_reader', 'code_128_reader']

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
          constraints: { facingMode: 'environment' },
          // Restrict decoding to the same middle band the aiming reticle
          // shows, so what the user frames is what actually gets scanned.
          area: { top: '35%', bottom: '35%', left: '10%', right: '10%' },
        },
        decoder: { readers: READERS },
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
