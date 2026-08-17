package com.markwise.qrcodescanner

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.RCTEventEmitter

import java.util.HashMap

/**
 * ViewManager for the [QRScannerView].
 *
 * Renamed from MLKitCameraManager to clarify that this module uses ZXing
 * (not Google ML Kit) for QR/barcode scanning.
 * Declares the "QRScannerView" view name and the "onBarcodeScan" direct
 * event type — the JS side uses requireNativeComponent('QRScannerView').
 */
class QRScannerManager : SimpleViewManager<QRScannerView>() {

    companion object {
        private const val REACT_CLASS = "QRScannerView"
    }

    override fun getName(): String = REACT_CLASS

    override fun createViewInstance(reactContext: ThemedReactContext): QRScannerView {
        return QRScannerView(reactContext)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        val eventTypes = HashMap<String, Any>()
        val onBarcodeScan = HashMap<String, String>()
        onBarcodeScan["registrationName"] = "onBarcodeScan"
        eventTypes["onBarcodeScan"] = onBarcodeScan
        return eventTypes
    }
}
