package com.markwise.qrcodescanner

import android.content.Context
import android.graphics.Color
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.ViewGroup
import android.widget.FrameLayout

import androidx.annotation.NonNull
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.lifecycle.LifecycleOwner

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.google.zxing.BinaryBitmap
import com.google.zxing.ChecksumException
import com.google.zxing.FormatException
import com.google.zxing.NotFoundException
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.common.BitMatrix
import com.google.zxing.common.GlobalHistogramBinarizer
import com.google.zxing.common.HybridBinarizer
import com.google.zxing.qrcode.decoder.Decoder
import com.google.zxing.qrcode.detector.Detector

import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Custom camera preview view that analyses each frame for QR/barcodes using ZXing.
 *
 * Renamed from MLKitCameraView. Uses ZXing (not Google ML Kit) exclusively —
 * the "MLKit" name was a legacy misnomer. The module scans QR codes via
 * CameraX + ZXing Detector/Decoder pipeline.
 */
class QRScannerView(context: Context) : FrameLayout(context), LifecycleEventListener {

    private val previewView: PreviewView
    private var cameraProvider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var imageAnalysis: ImageAnalysis? = null
    private val cameraExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val reactContext: ReactContext = context as ReactContext
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        setBackgroundColor(Color.TRANSPARENT)

        previewView = PreviewView(context).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
            scaleType = PreviewView.ScaleType.FILL_CENTER
            setBackgroundColor(Color.TRANSPARENT)
        }
        addView(previewView)

        reactContext.addLifecycleEventListener(this)
        post { startCamera() }
    }

    override fun requestLayout() {
        super.requestLayout()
        post(::measureAndLayout)
    }

    private fun measureAndLayout() {
        measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY)
        )
        layout(left, top, right, bottom)
    }

    private fun startCamera() {
        cameraExecutor.execute {
            try {
                val provider = ProcessCameraProvider.getInstance(
                    getContext()
                ).get(10, TimeUnit.SECONDS)
                mainHandler.post {
                    try {
                        cameraProvider = provider
                        bindCameraUseCases()
                    } catch (exc: Exception) {
                        Log.e("QRScannerView", "Failed to bind camera use cases", exc)
                        scheduleRebind()
                    }
                }
            } catch (exc: Exception) {
                Log.e("QRScannerView", "Failed to initialize camera provider", exc)
                scheduleRebind()
            }
        }
    }

    private fun scheduleRebind(delayMs: Long = 250L) {
        mainHandler.removeCallbacksAndMessages(null)
        mainHandler.postDelayed({
            if (cameraProvider == null) {
                startCamera()
            } else {
                bindCameraUseCases()
            }
        }, delayMs)
    }

    private fun bindCameraUseCases() {
        if (cameraProvider == null) {
            return
        }
        val activity = reactContext.currentActivity
        if (activity !is LifecycleOwner) {
            Log.e("QRScannerView", "Could not get a LifecycleOwner.")
            scheduleRebind()
            return
        }
        val lifecycleOwner = activity as LifecycleOwner

        val preview = Preview.Builder().build()
        preview.setSurfaceProvider(previewView.surfaceProvider)

        imageAnalysis = ImageAnalysis.Builder()
            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
            .build()
        imageAnalysis?.setAnalyzer(cameraExecutor, BarcodeAnalyzer())

        try {
            cameraProvider?.unbindAll()
            camera = cameraProvider?.bindToLifecycle(
                lifecycleOwner,
                CameraSelector.DEFAULT_BACK_CAMERA,
                preview,
                imageAnalysis
            )
        } catch (exc: Exception) {
            Log.e("QRScannerView", "Use case binding failed", exc)
        }
    }

    // ------------------------------------------------------------------
    // Barcode analysis (ZXing)
    // ------------------------------------------------------------------

    private inner class BarcodeAnalyzer : ImageAnalysis.Analyzer {

        private var lastEmitMs = 0L

        @androidx.camera.core.ExperimentalGetImage
        override fun analyze(@NonNull imageProxy: ImageProxy) {
            if (imageProxy.image == null) {
                imageProxy.close()
                return
            }
            try {
                val mediaImage = imageProxy.image!!

                val planes = mediaImage.planes
                val yPlane = planes[0]
                val yBuffer = yPlane.buffer
                val yRowStride = yPlane.rowStride
                val fullWidth = mediaImage.width
                val fullHeight = mediaImage.height

                val yData = ByteArray(yBuffer.remaining())
                yBuffer.get(yData)

                val cropSize = (minOf(fullWidth, fullHeight) * 0.85f).toInt()
                val cropL = (fullWidth - cropSize) / 2
                val cropT = (fullHeight - cropSize) / 2

                var rawValue = tryDecode(yData, yRowStride, fullHeight, cropL, cropT, cropSize, cropSize, true)
                if (rawValue == null) {
                    rawValue = tryDecode(yData, yRowStride, fullHeight, cropL, cropT, cropSize, cropSize, false)
                }
                if (rawValue == null) {
                    return
                }

                val now = System.currentTimeMillis()
                if (now - lastEmitMs < 100) {
                    return
                }
                lastEmitMs = now

                val event = Arguments.createMap()
                event.putString("data", rawValue)
                mainHandler.post {
                    reactContext.getJSModule(RCTEventEmitter::class.java).receiveEvent(
                        id, "onBarcodeScan", event
                    )
                }
            } catch (e: Exception) {
                // swallow frame-level decode errors — next frame will retry
            } finally {
                imageProxy.close()
            }
        }

        private fun tryDecode(
            yData: ByteArray,
            dataWidth: Int,
            dataHeight: Int,
            left: Int,
            top: Int,
            width: Int,
            height: Int,
            fast: Boolean
        ): String? {
            try {
                val source = PlanarYUVLuminanceSource(
                    yData, dataWidth, dataHeight, left, top, width, height, false
                )
                val bitmap = if (fast) {
                    BinaryBitmap(GlobalHistogramBinarizer(source))
                } else {
                    BinaryBitmap(HybridBinarizer(source))
                }

                val blackMatrix = bitmap.blackMatrix
                val detector = Detector(blackMatrix)
                val hints: Map<com.google.zxing.DecodeHintType, Any> = emptyMap()
                val bits = detector.detect(hints).bits

                val decoder = Decoder()
                return decoder.decode(bits, hints).text
            } catch (e: ChecksumException) {
                return null
            } catch (e: FormatException) {
                return null
            } catch (e: NotFoundException) {
                return null
            } catch (e: RuntimeException) {
                return null
            }
        }
    }

    // ------------------------------------------------------------------
    // LifecycleEventListener
    // ------------------------------------------------------------------

    override fun onHostResume() {
        bindCameraUseCases()
    }

    override fun onHostPause() {
        if (cameraProvider != null) {
            cameraProvider?.unbindAll()
        }
    }

    override fun onHostDestroy() {
        if (cameraProvider != null) {
            cameraProvider?.unbindAll()
        }
        mainHandler.removeCallbacksAndMessages(null)
        cameraExecutor.shutdown()
        reactContext.removeLifecycleEventListener(this)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (cameraProvider == null) {
            startCamera()
        } else {
            bindCameraUseCases()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        if (cameraProvider != null) {
            cameraProvider?.unbindAll()
        }
        mainHandler.removeCallbacksAndMessages(null)
    }
}
