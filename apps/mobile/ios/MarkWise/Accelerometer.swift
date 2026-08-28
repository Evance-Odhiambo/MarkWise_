import CoreMotion
import React

@objc(Accelerometer)
final class Accelerometer: RCTEventEmitter {
  private let manager = CMMotionManager()
  private var interval: TimeInterval = 0.25

  override func supportedEvents() -> [String]! { ["AccelerometerData"] }
  override static func requiresMainQueueSetup() -> Bool { false }

  @objc(setUpdateInterval:)
  func setUpdateInterval(_ intervalMs: NSNumber) {
    interval = max(0.01, intervalMs.doubleValue / 1000.0)
    if manager.isAccelerometerActive { start() }
  }

  @objc func start() {
    guard manager.isAccelerometerAvailable else { return }
    manager.accelerometerUpdateInterval = interval
    manager.startAccelerometerUpdates(to: OperationQueue()) { [weak self] data, _ in
      guard let data else { return }
      self?.sendEvent(withName: "AccelerometerData", body: [
        "x": data.acceleration.x * 9.80665,
        "y": data.acceleration.y * 9.80665,
        "z": data.acceleration.z * 9.80665,
        "timestamp": Date().timeIntervalSince1970 * 1000,
      ])
    }
  }

  @objc func stop() { manager.stopAccelerometerUpdates() }
  override func invalidate() { stop(); super.invalidate() }
}
