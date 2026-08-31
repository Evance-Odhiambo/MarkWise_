package com.markwise.blescanner

import android.Manifest
import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.ParcelUuid
import android.util.Base64
import android.util.Log

import androidx.core.app.ActivityCompat

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

import java.util.UUID

/**
 * Native Android BLE scanner bridge.
 *
 * Ported from Kotlin. Scans for nearby BLE peripherals broadcasting the
 * MarkWise service UUID, extracts the compact payload, and emits
 * onDeviceFound / onScanError events to JS.
 */
class BLEScannerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BLEScannerModule"
        private const val EVENT_DEVICE_FOUND = "onDeviceFound"
        private const val EVENT_SCAN_ERROR = "onScanError"
        private val SERVICE_UUID = ParcelUuid.fromString("00001101-0000-1000-8000-00805F9B34FB")
        private const val MANUFACTURER_ID = 0x1234
    }

    private var isScanning = false
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var scanner: android.bluetooth.le.BluetoothLeScanner?

    init {
        val manager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as android.bluetooth.BluetoothManager
        bluetoothAdapter = manager?.adapter
        scanner = bluetoothAdapter?.bluetoothLeScanner
    }

    override fun getName(): String = "BLEScanner"

    // Required by React Native's NativeEventEmitter. The scanner events are
    // emitted through RCTDeviceEventEmitter, while these methods let the JS
    // bridge subscribe without dropping native callbacks.
    @ReactMethod
    fun addListener(eventName: String) { }

    @ReactMethod
    fun removeListeners(count: Int) { }

    private fun hasScanPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ActivityCompat.checkSelfPermission(
                getReactApplicationContext(),
                Manifest.permission.BLUETOOTH_SCAN
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            ActivityCompat.checkSelfPermission(
                getReactApplicationContext(),
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        }
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            getReactApplicationContext()
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "sendEvent failed: ${e.message}")
        }
    }

    private val scanCallback = object : ScanCallback() {
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            Log.d(TAG, "onScanResult: device=${result.device.address}, RSSI=${result.rssi}")
            if (result == null) return

            val scanRecord = result.scanRecord
            Log.d(TAG, "  Device name: ${result.device.name}")
            Log.d(TAG, "  Service UUIDs: ${scanRecord?.serviceUuids}")
            Log.d(TAG, "  Service Data: ${scanRecord?.serviceData}")
            Log.d(TAG, "  Manufacturer Data: ${scanRecord?.manufacturerSpecificData}")
            Log.d(TAG, "  Raw scan record bytes: ${scanRecord?.let { bytesToLog(it.bytes) }}")

            var payload: String? = null

            // Service data is the canonical cross-platform transport. Both
            // Android and iOS scanners can read this under the shared UUID.
            if (scanRecord != null) {
                val serviceData = scanRecord.getServiceData(SERVICE_UUID)
                if (serviceData != null) {
                    payload = Base64.encodeToString(serviceData, Base64.NO_WRAP)
                    Log.d(TAG, "  Extracted compact payload from serviceData: '$payload'")
                }
            }

            // Legacy Android fallback for broadcasts produced before the
            // service-data transport was introduced.
            if (payload == null && scanRecord?.manufacturerSpecificData != null) {
                val data = scanRecord.manufacturerSpecificData.get(MANUFACTURER_ID)
                if (data != null) {
                    payload = Base64.encodeToString(data, Base64.NO_WRAP)
                    Log.d(TAG, "  Extracted legacy payload from manufacturer data [$MANUFACTURER_ID]")
                }
            }

            if (payload == null && scanRecord != null) {
                val localName = scanRecord.deviceName
                if (localName != null && localName.startsWith("MW:")) {
                    val b64 = localName.substring(3)
                    try {
                        val bytes = Base64.decode(b64, Base64.NO_WRAP)
                        if (bytes.isNotEmpty()) {
                            payload = b64
                            Log.d(TAG, "  Extracted payload from local name (iOS peripheral): '$payload'")
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "  MW: local name has invalid base64 payload")
                    }
                }
            }

            val deviceMap = Arguments.createMap()
            deviceMap.putString("id", result.device.address)
            deviceMap.putString("name", result.device.name)
            deviceMap.putInt("rssi", result.rssi)
            if (payload != null) {
                deviceMap.putString("payload", payload)
            }
            sendEvent(EVENT_DEVICE_FOUND, deviceMap)
        }

        override fun onBatchScanResults(results: List<ScanResult>) {
            Log.d(TAG, "onBatchScanResults: ${results?.size ?: 0} results")
            if (results == null) return
            for (result in results) {
                onScanResult(0, result)
            }
        }

        override fun onScanFailed(errorCode: Int) {
            val errorMessage = when (errorCode) {
                ScanCallback.SCAN_FAILED_ALREADY_STARTED -> "Scan already started"
                ScanCallback.SCAN_FAILED_APPLICATION_REGISTRATION_FAILED -> "Application registration failed"
                ScanCallback.SCAN_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported"
                ScanCallback.SCAN_FAILED_INTERNAL_ERROR -> "Internal error"
                else -> "Unknown error: $errorCode"
            }
            Log.e(TAG, "onScanFailed: $errorMessage")
            val params = Arguments.createMap()
            params.putString("message", errorMessage)
            params.putInt("code", errorCode)
            sendEvent(EVENT_SCAN_ERROR, params)
        }
    }

    private fun bytesToLog(bytes: ByteArray?): String? {
        if (bytes == null) return null
        if (bytes.isEmpty()) return "[]"
        val sb = StringBuilder()
        for (i in 0 until minOf(bytes.size, 16)) {
            if (i > 0) sb.append(",")
            sb.append(bytes[i])
        }
        if (bytes.size > 16) sb.append(",...${bytes.size - 16} more")
        return sb.toString()
    }

    @ReactMethod
    fun startScan(serviceUUID: String) {
        if (!hasScanPermission()) {
            Log.w(TAG, "startScan: Required permissions not granted")
            val params = Arguments.createMap()
            params.putString("message", "BLUETOOTH_SCAN or ACCESS_FINE_LOCATION permission not granted")
            sendEvent(EVENT_SCAN_ERROR, params)
            return
        }

        if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
            Log.w(TAG, "startScan: Bluetooth is not enabled")
            val params = Arguments.createMap()
            params.putString("message", "Bluetooth is not enabled")
            sendEvent(EVENT_SCAN_ERROR, params)
            return
        }

        // Bluetooth may have been disabled when this React module was created.
        // Re-resolve the scanner after the adapter becomes ready instead of
        // permanently retaining the initial null instance.
        scanner = bluetoothAdapter?.bluetoothLeScanner
        if (scanner == null) {
            Log.w(TAG, "startScan: BLE scanner is not ready")
            return
        }

        if (isScanning) {
            Log.w(TAG, "startScan: already scanning, ignoring duplicate request")
            return
        }

        Log.d(TAG, "startScan called with serviceUUID: $serviceUUID")

        val scanFilter = ScanFilter.Builder()
            .setServiceUuid(ParcelUuid.fromString(serviceUUID))
            .build()

        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0)
            .build()

        try {
            scanner?.startScan(listOf(scanFilter), scanSettings, scanCallback)
            isScanning = true
            Log.d(TAG, "startScan succeeded")
        } catch (e: SecurityException) {
            Log.e(TAG, "startScan failed: ${e.message}", e)
            isScanning = false
            val params = Arguments.createMap()
            params.putString("message", "Security exception: ${e.message}")
            sendEvent(EVENT_SCAN_ERROR, params)
        } catch (e: Exception) {
            Log.e(TAG, "startScan failed: ${e.message}", e)
            isScanning = false
            val params = Arguments.createMap()
            params.putString("message", "startScan failed: ${e.message}")
            sendEvent(EVENT_SCAN_ERROR, params)
        }
    }

    @ReactMethod
    fun startScanNoFilter() {
        if (!hasScanPermission()) {
            Log.w(TAG, "startScanNoFilter: Required permissions not granted")
            val params = Arguments.createMap()
            params.putString("message", "BLUETOOTH_SCAN or ACCESS_FINE_LOCATION permission not granted")
            sendEvent(EVENT_SCAN_ERROR, params)
            return
        }

        if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
            Log.w(TAG, "startScanNoFilter: Bluetooth is not enabled")
            val params = Arguments.createMap()
            params.putString("message", "Bluetooth is not enabled")
            sendEvent(EVENT_SCAN_ERROR, params)
            return
        }

        // Re-resolve on every start; bluetoothLeScanner can be null during
        // adapter initialization and become available later.
        scanner = bluetoothAdapter?.bluetoothLeScanner
        if (scanner == null) {
            Log.w(TAG, "startScanNoFilter: BLE scanner is not ready")
            return
        }

        if (isScanning) {
            Log.w(TAG, "startScanNoFilter: already scanning, ignoring duplicate request")
            return
        }

        Log.d(TAG, "startScanNoFilter called (discovering all devices)")

        val scanSettings = ScanSettings.Builder()
            .setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY)
            .setReportDelay(0)
            .build()

        try {
            scanner?.startScan(null, scanSettings, scanCallback)
            isScanning = true
            Log.d(TAG, "startScanNoFilter succeeded")
        } catch (e: SecurityException) {
            Log.e(TAG, "startScanNoFilter failed: ${e.message}", e)
            isScanning = false
            val params = Arguments.createMap()
            params.putString("message", "Security exception: ${e.message}")
            sendEvent(EVENT_SCAN_ERROR, params)
        } catch (e: Exception) {
            Log.e(TAG, "startScanNoFilter failed: ${e.message}", e)
            isScanning = false
            val params = Arguments.createMap()
            params.putString("message", e.message)
            sendEvent(EVENT_SCAN_ERROR, params)
        }
    }

    @ReactMethod
    fun stopScan() {
        if (!hasScanPermission()) {
            Log.w(TAG, "stopScan: Required permissions not granted")
            return
        }
        try {
            scanner?.stopScan(scanCallback)
            isScanning = false
            Log.d(TAG, "stopScan succeeded")
        } catch (e: Exception) {
            Log.e(TAG, "stopScan failed: ${e.message}", e)
        }
    }
}
