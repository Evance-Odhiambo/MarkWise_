package com.markwise

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.markwise.accelerometer.AccelerometerPackage
import com.markwise.bleadvertiser.BLEAdvertiserPackage
import com.markwise.blescanner.BLEScannerPackage
import com.markwise.qrcodegenerator.QRCodeGeneratorPackage
import com.markwise.qrcodescanner.QRScannerPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(AccelerometerPackage())
          add(BLEAdvertiserPackage())
          add(BLEScannerPackage())
          add(QRCodeGeneratorPackage())
          add(QRScannerPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
