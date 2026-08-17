package com.markwise.qrcodescanner

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * ReactPackage that registers the [QRScannerManager] view manager
 * with React Native.
 *
 * Renamed from the legacy "MLKit" prefix. Uses ZXingObjC (not Google ML Kit)
 * for barcode scanning.
 */
class QRScannerPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(QRScannerManager())
    }
}
