import CoreBluetooth
import Foundation
import React

@objc(BLEAdvertiser)
final class BLEAdvertiser: NSObject, CBPeripheralManagerDelegate {
  private let serviceUUID = CBUUID(string: "00001101-0000-1000-8000-00805F9B34FB")
  private var manager: CBPeripheralManager!
  private var pendingData: Data?
  private var resolver: RCTPromiseResolveBlock?
  private var rejecter: RCTPromiseRejectBlock?

  override init() {
    super.init()
    manager = CBPeripheralManager(delegate: self, queue: nil)
  }

  @objc(startAdvertising:resolver:rejecter:)
  func startAdvertising(_ base64Payload: String, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard let data = Data(base64Encoded: base64Payload) else {
      rejecter("E_BLE_BASE64_DECODE", "Invalid base64 BLE payload", nil)
      return
    }
    guard data.count == 9 else {
      rejecter("E_BLE_PAYLOAD_LENGTH", "BLE payload must be 9 bytes", nil)
      return
    }
    pendingData = data
    self.resolver = resolver
    self.rejecter = rejecter
    if manager.state == .poweredOn { beginAdvertising() }
  }

  @objc(stopAdvertising:rejecter:)
  func stopAdvertising(resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    manager.stopAdvertising()
    pendingData = nil
    resolver(true)
  }

  @objc(startBackgroundAdvertising:durationSeconds:resolver:rejecter:)
  func startBackgroundAdvertising(_ base64Payload: String, durationSeconds: NSNumber, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    // Core Bluetooth keeps peripheral advertising eligible in the background
    // when bluetooth-peripheral is declared in Info.plist. iOS controls the
    // actual duty cycle and may suspend the app, so this remains best effort.
    startAdvertising(base64Payload, resolver: resolver, rejecter: rejecter)
  }

  @objc(stopBackgroundAdvertising:rejecter:)
  func stopBackgroundAdvertising(resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    stopAdvertising(resolver: resolver, rejecter: rejecter)
  }

  private func beginAdvertising() {
    guard let data = pendingData else { return }
    manager.stopAdvertising()
    manager.startAdvertising([
      CBAdvertisementDataLocalNameKey: "MW:" + data.base64EncodedString(),
      CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
    ])
    resolver?(true)
    resolver = nil
    rejecter = nil
  }

  func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
    if peripheral.state == .poweredOn { beginAdvertising() }
    else if peripheral.state == .unauthorized || peripheral.state == .unsupported {
      rejecter?("E_BLE_ADVERTISING", "Bluetooth advertising is unavailable", nil)
      resolver = nil
      rejecter = nil
    }
  }
}
