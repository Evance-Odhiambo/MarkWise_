package com.markwise.qrcodegenerator

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.util.Base64

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel

import java.io.ByteArrayOutputStream

/**
 * Native Android QR code generator bridge.
 *
 * Ported from Kotlin. Generates a high-resolution (800×800) QR code PNG
 * as base64, using ZXing directly rather than a JS rendering dependency.
 */
class QRCodeGeneratorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "QRCodeGenerator"

    @ReactMethod
    fun generateQRCode(content: String, promise: Promise) {
        try {
            val hints = hashMapOf<EncodeHintType, Any>()
            hints[EncodeHintType.CHARACTER_SET] = "UTF-8"
            hints[EncodeHintType.MARGIN] = 0
            hints[EncodeHintType.ERROR_CORRECTION] = ErrorCorrectionLevel.M

            val moduleBits = QRCodeWriter().encode(content, BarcodeFormat.QR_CODE, 1, 1, hints)
            val size = moduleBits.width

            val QUIET = 4
            val TOTAL = size + 2 * QUIET
            val OUTPUT_PX = 800
            val moduleSize = OUTPUT_PX / TOTAL
            val actualOutput = moduleSize * TOTAL

            val bitmap = Bitmap.createBitmap(actualOutput, actualOutput, Bitmap.Config.RGB_565)
            val canvas = Canvas(bitmap)
            canvas.drawColor(Color.WHITE)

            val paint = Paint()
            paint.color = Color.BLACK
            paint.style = Paint.Style.FILL
            paint.isAntiAlias = false

            for (row in 0 until size) {
                for (col in 0 until size) {
                    if (moduleBits[col, row]) {
                        val left = (QUIET + col) * moduleSize.toFloat()
                        val top = (QUIET + row) * moduleSize.toFloat()
                        canvas.drawRect(left, top, left + moduleSize, top + moduleSize, paint)
                    }
                }
            }

            val baos = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, baos)
            promise.resolve(Base64.encodeToString(baos.toByteArray(), Base64.DEFAULT))
        } catch (e: Exception) {
            promise.reject("QRCode generation failed", e)
        }
    }
}
