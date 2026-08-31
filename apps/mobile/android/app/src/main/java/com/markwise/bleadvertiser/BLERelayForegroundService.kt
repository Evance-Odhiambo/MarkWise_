package com.markwise.bleadvertiser

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Base64
import android.util.Log

class BLERelayForegroundService : Service() {
    companion object {
        const val ACTION_START = "com.markwise.bleadvertiser.START_RELAY"
        const val ACTION_STOP = "com.markwise.bleadvertiser.STOP_RELAY"
        const val EXTRA_PAYLOAD = "payload"
        const val EXTRA_DURATION_SECONDS = "durationSeconds"
        private const val TAG = "BLERelayService"
        private const val CHANNEL_ID = "markwise_ble_relay"
        private const val NOTIFICATION_ID = 4817
        private const val MANUFACTURER_ID = 0x1234
        private const val ROTATION_MS = 5_000L
    }

    private val handler = Handler(Looper.getMainLooper())
    private var advertiser: BluetoothLeAdvertiser? = null
    private var payload: ByteArray? = null
    private var advertising = false
    private var stopAtMs = 0L

    private val callback = object : AdvertiseCallback() {
        override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
            advertising = true
        }

        override fun onStartFailure(errorCode: Int) {
            advertising = false
            Log.e(TAG, "BLE relay advertising failed: $errorCode")
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopRelay()
            return START_NOT_STICKY
        }

        if (intent?.action == ACTION_START) {
            val raw = intent.getStringExtra(EXTRA_PAYLOAD)
            val duration = intent.getLongExtra(EXTRA_DURATION_SECONDS, 600L)
            val decoded = runCatching { Base64.decode(raw ?: "", Base64.DEFAULT) }.getOrNull()
            if (decoded == null || decoded.size != 9) {
                stopRelay()
                return START_NOT_STICKY
            }
            payload = decoded
            stopAtMs = System.currentTimeMillis() + duration.coerceAtLeast(1L) * 1_000L
            startForeground(NOTIFICATION_ID, buildNotification())
            startOrRefreshAdvertising()
            scheduleRotation()
        }
        return START_NOT_STICKY
    }

    private fun scheduleRotation() {
        handler.removeCallbacksAndMessages(null)
        handler.postDelayed({
            if (System.currentTimeMillis() >= stopAtMs) {
                stopRelay()
            } else {
                payload?.let { bytes ->
                    val current = ((bytes[4].toInt() and 0xff) shl 8) or (bytes[5].toInt() and 0xff)
                    val next = (current + 1) and 0xffff
                    bytes[4] = (next ushr 8).toByte()
                    bytes[5] = next.toByte()
                }
                startOrRefreshAdvertising()
                scheduleRotation()
            }
        }, ROTATION_MS)
    }

    private fun startOrRefreshAdvertising() {
        val adapter = (getSystemService(BLUETOOTH_SERVICE) as BluetoothManager).adapter
        val currentAdvertiser = adapter?.bluetoothLeAdvertiser
        val bytes = payload
        if (currentAdvertiser == null || adapter == null || !adapter.isEnabled || bytes == null) return
        advertiser = currentAdvertiser
        val settings = AdvertiseSettings.Builder()
            .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
            .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
            .setConnectable(false)
            .build()
        val data = AdvertiseData.Builder()
            .setIncludeDeviceName(false)
            .setIncludeTxPowerLevel(false)
            .addManufacturerData(MANUFACTURER_ID, bytes)
            .build()
        if (advertising) currentAdvertiser.stopAdvertising(callback)
        advertising = false
        currentAdvertiser.startAdvertising(settings, data, callback)
    }

    private fun stopRelay() {
        handler.removeCallbacksAndMessages(null)
        advertiser?.stopAdvertising(callback)
        advertising = false
        payload = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "MarkWise attendance relay",
                NotificationManager.IMPORTANCE_LOW,
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("MarkWise relay active")
                .setContentText("Broadcasting attendance signals nearby")
                .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
                .setOngoing(true)
                .build()
        } else {
            Notification.Builder(this)
                .setContentTitle("MarkWise relay active")
                .setContentText("Broadcasting attendance signals nearby")
                .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth)
                .setOngoing(true)
                .build()
        }
    }

    override fun onDestroy() {
        stopRelay()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
