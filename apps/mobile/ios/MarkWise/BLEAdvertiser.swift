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
      rejecter("E_BLE_PAYLOAD_LENGTH", "BLE payload must be exactly 9 bytes", nil)
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

  private func beginAdvertising() {
    guard let data = pendingData else { return }
    manager.stopAdvertising()
    manager.startAdvertising([
      CBAdvertisementDataLocalNameKey: "MW:" + data.base64EncodedString(),
      CBAdvertisementDataServiceUUIDsKey: [serviceUUID],
      CBAdvertisementDataServiceDataKey: [serviceUUID: data],
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
