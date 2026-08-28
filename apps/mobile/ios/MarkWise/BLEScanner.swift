import CoreBluetooth
import React

@objc(BLEScanner)
final class BLEScanner: RCTEventEmitter, CBCentralManagerDelegate {
  private let serviceUUID = CBUUID(string: "00001101-0000-1000-8000-00805F9B34FB")
  private var central: CBCentralManager!
  private var scanning = false
  private var resolver: RCTPromiseResolveBlock?
  private var rejecter: RCTPromiseRejectBlock?

  override init() {
    super.init()
    central = CBCentralManager(delegate: self, queue: nil)
  }

  override func supportedEvents() -> [String]! { ["BLEDeviceFound", "BLEScanError"] }
  override static func requiresMainQueueSetup() -> Bool { true }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    guard central.state == .poweredOn else {
      if scanning { sendEvent(withName: "BLEScanError", body: ["errorCode": central.state.rawValue, "errorMessage": "Bluetooth is not enabled"]) }
      return
    }
    resolver?(true)
    resolver = nil
    rejecter = nil
  }

  @objc(startScan:resolver:rejecter:)
  func startScan(_ requestedUUID: NSString?, resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard central.state == .poweredOn else {
      self.resolver = resolver
      self.rejecter = rejecter
      rejecter("E_BLUETOOTH_OFF", "Bluetooth is not powered on", nil)
      return
    }
    let uuid = requestedUUID.flatMap { CBUUID(string: String($0)) } ?? serviceUUID
    central.scanForPeripherals(withServices: [uuid], options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
    scanning = true
    resolver(true)
  }

  @objc(startScanNoFilter:rejecter:)
  func startScanNoFilter(resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    guard central.state == .poweredOn else { rejecter("E_BLUETOOTH_OFF", "Bluetooth is not powered on", nil); return }
    central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
    scanning = true
    resolver(true)
  }

  @objc(stopScan:rejecter:)
  func stopScan(resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    central.stopScan()
    scanning = false
    resolver(true)
  }

  @objc(isScanning:rejecter:)
  func isScanning(resolver: @escaping RCTPromiseResolveBlock, rejecter: @escaping RCTPromiseRejectBlock) {
    resolver(scanning)
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    var payload: String?
    if let serviceData = advertisementData[CBAdvertisementDataServiceDataKey] as? [CBUUID: Data], let data = serviceData[serviceUUID] {
      payload = data.base64EncodedString()
    } else if let manufacturer = advertisementData[CBAdvertisementDataManufacturerDataKey] as? Data {
      payload = manufacturer.base64EncodedString()
    }
    sendEvent(withName: "BLEDeviceFound", body: [
      "id": peripheral.identifier.uuidString,
      "name": peripheral.name ?? "",
      "rssi": RSSI.intValue,
      "payload": payload as Any,
      "timestamp": Date().timeIntervalSince1970 * 1000,
    ])
  }
}
