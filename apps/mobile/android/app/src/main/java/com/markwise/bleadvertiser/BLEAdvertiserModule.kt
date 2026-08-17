package com.markwise.bleadvertiser

import android.app.Activity
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.content.Intent
import android.util.Base64
import android.util.Log

import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

import java.util.UUID

/**
 * Native Android BLE advertiser bridge.
 *
 * Ported from Kotlin. Talks directly to [BluetoothLeAdvertiser] so the
 * student device can broadcast its attendance payload to nearby lecturer
 * devices without a Google Play Services dependency.
 */
class BLEAdvertiserModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val TAG = "BLEAdvertiserModule"
        private const val REQUEST_ENABLE_BT = 4123
        private const val MANUFACTURER_ID = 0x1234
    }

    private val reactContext: ReactApplicationContext = reactContext

    private var isAdvertising = false
    private var pendingEnablePromise: Promise? = null

    private val advertiseCallback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
            isAdvertising = true
            Log.d(TAG, "Advertising started successfully")
            super.onStartSuccess(settingsInEffect)
        }

        override fun onStartFailure(errorCode: Int) {
            isAdvertising = false
            val errorMessage = when (errorCode) {
                AdvertiseCallback.ADVERTISE_FAILED_ALREADY_STARTED -> "Already started"
                AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "Data too large"
                AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "Feature unsupported"
                AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR -> "Internal error"
                AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many advertisers"
                else -> "Unknown error: $errorCode"
            }
            Log.e(TAG, "Advertising failed to start: $errorMessage (code=$errorCode)")
            super.onStartFailure(errorCode)
        }
    }

    override fun getName(): String = TAG

    // --- ActivityEventListener ---

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_ENABLE_BT) {
            val adapter = getBluetoothAdapter()
            val enabled = adapter != null && adapter.isEnabled()
            if (pendingEnablePromise != null) {
                pendingEnablePromise?.resolve(enabled)
                pendingEnablePromise = null
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        // no-op
    }

    // --- React Methods ---

    private fun getBluetoothAdapter(): BluetoothAdapter? {
        val manager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        return manager.adapter
    }

    private fun getAdvertiser(): BluetoothLeAdvertiser? {
        val adapter = getBluetoothAdapter()
        return adapter?.bluetoothLeAdvertiser
    }

    @ReactMethod
    fun isAdvertisingSupported(promise: Promise) {
        promise.resolve(getAdvertiser() != null)
    }

    @ReactMethod
    fun isBluetoothEnabled(promise: Promise) {
        val adapter = getBluetoothAdapter()
        promise.resolve(adapter != null && adapter.isEnabled())
    }

    @ReactMethod
    fun requestEnableBluetooth(promise: Promise) {
        try {
            val adapter = getBluetoothAdapter()
            if (adapter != null && adapter.isEnabled()) {
                promise.resolve(true)
                return
            }

            val currentActivity = reactContext.currentActivity
            if (currentActivity == null) {
                val intent = Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactContext.startActivity(intent)
                promise.resolve(false)
                return
            }

            pendingEnablePromise = promise
            val enableIntent = Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)
            currentActivity.startActivityForResult(enableIntent, REQUEST_ENABLE_BT)
        } catch (e: Exception) {
            pendingEnablePromise = null
            promise.reject("E_REQUEST_ENABLE_BT", e.message)
        }
    }

    @ReactMethod
    fun startAdvertising(data: String, promise: Promise) {
        val advertiser = getAdvertiser()
        if (advertiser == null) {
            Log.e(TAG, "startAdvertising: BLE Advertiser not available")
            promise.reject("E_BLE_ADVERTISER", "BLE Advertiser not available")
            return
        }

        val adapter = getBluetoothAdapter()
        if (adapter == null || !adapter.isEnabled) {
            Log.e(TAG, "startAdvertising: Bluetooth is not enabled")
            promise.reject("E_BLUETOOTH_OFF", "Bluetooth is not enabled")
            return
        }

        val dataBytes: ByteArray
        try {
            dataBytes = Base64.decode(data, Base64.DEFAULT)
        } catch (e: Exception) {
            Log.e(TAG, "startAdvertising: Failed to decode base64 payload", e)
            promise.reject("E_BLE_BASE64_DECODE", "Failed to decode base64 payload: ${e.message}")
            return
        }

        var effectiveBytes = dataBytes
        if (effectiveBytes.size > 24) {
            Log.w(TAG, "startAdvertising: data size (${effectiveBytes.size} bytes) is too large for manufacturer data, truncating to 24 bytes!")
            effectiveBytes = dataBytes.copyOfRange(0, 24)
        }

        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(false)
            .build()

        val advertiseData = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addManufacturerData(MANUFACTURER_ID, effectiveBytes)
            .build()

        try {
            if (isAdvertising) {
                advertiser.stopAdvertising(advertiseCallback)
                isAdvertising = false
            }
            advertiser.startAdvertising(settings, advertiseData, advertiseCallback)
            promise.resolve(null)
        } catch (e: SecurityException) {
            Log.e(TAG, "startAdvertising failed: ${e.message}", e)
            promise.reject("E_BLE_ADVERTISING_SECURITY", e.message)
        } catch (e: IllegalStateException) {
            Log.e(TAG, "startAdvertising failed: ${e.message}", e)
            promise.reject("E_BLE_ADVERTISING_STATE", e.message)
        } catch (e: Exception) {
            Log.e(TAG, "startAdvertising failed: ${e.message}", e)
            promise.reject("E_BLE_ADVERTISING", e.message)
        }
    }

    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        val advertiser = getAdvertiser()
        if (advertiser == null) {
            Log.d(TAG, "stopAdvertising: advertiser not available, nothing to stop")
            isAdvertising = false
            promise.resolve(null)
            return
        }

        try {
            advertiser.stopAdvertising(advertiseCallback)
            isAdvertising = false
            promise.resolve(null)
        } catch (e: Exception) {
            Log.e(TAG, "stopAdvertising failed: ${e.message}", e)
            promise.reject("E_BLE_ADVERTISING_STOP", e.message)
        }
    }
}
