package com.markwise.accelerometer

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Native Android accelerometer bridge.
 *
 * Talks directly to [SensorManager] and [Sensor] (the OS-level
 * accelerometer driver) rather than going through a JS abstraction layer.
 * Values are emitted in SI units (m/s²) as raw `x/y/z` doubles, matching
 * the data shape previously provided by react-native-sensors.
 */
class AccelerometerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), SensorEventListener {

    companion object {
        private const val TAG = "AccelerometerModule"
        private const val EVENT_NAME = "onAccelerometerData"
    }

    private val sensorManager: SensorManager =
        reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometerSensor: Sensor? =
        sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    private var isRegistered = false
    private var updateIntervalUs: Long = 250000L // 250 ms default

    override fun getName(): String = TAG

    /**
     * Set the sensor polling interval in milliseconds.
     * Mirrors react-native-sensors' setUpdateIntervalForType.
     */
    @ReactMethod
    fun setUpdateInterval(intervalMs: Double) {
        updateIntervalUs = (intervalMs * 1000L).toLong()
        if (isRegistered) {
            sensorManager.unregisterListener(this)
            registerLocked()
        }
    }

    @ReactMethod
    fun start() {
        if (accelerometerSensor == null) {
            Log.w(TAG, "Accelerometer sensor not available on this device")
            return
        }
        if (isRegistered) {
            return
        }
        registerLocked()
    }

    @ReactMethod
    fun stop() {
        if (!isRegistered) {
            return
        }
        sensorManager.unregisterListener(this)
        isRegistered = false
    }

    private fun registerLocked() {
        if (accelerometerSensor == null) {
            return
        }
        val intervalUs = updateIntervalUs.coerceAtMost(Int.MAX_VALUE.toLong()).toInt()
        sensorManager.registerListener(this, accelerometerSensor, intervalUs)
        isRegistered = true
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event == null || event.sensor == null) {
            return
        }
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) {
            return
        }

        val params = Arguments.createMap()
        params.putDouble("x", if (event.values.isNotEmpty()) event.values[0].toDouble() else 0.0)
        params.putDouble("y", if (event.values.size > 1) event.values[1].toDouble() else 0.0)
        params.putDouble("z", if (event.values.size > 2) event.values[2].toDouble() else 0.0)
        params.putDouble("timestamp", event.timestamp.toDouble())
        params.putInt("accuracy", event.accuracy)

        getReactApplicationContext()
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(EVENT_NAME, params)
    }

    override fun onAccuracyChanged(sensor: Sensor, accuracy: Int) {
        // Not used by the consumer layer — no-op.
    }
}
