import AVFoundation
import React
import UIKit

final class MarkWiseQRScannerView: UIView, AVCaptureMetadataOutputObjectsDelegate {
  private let session = AVCaptureSession()
  private let previewLayer = AVCaptureVideoPreviewLayer()
  private var configured = false
  private var lastValue: String?
  private var lastScanAt = Date.distantPast

  @objc var onBarcodeScan: RCTDirectEventBlock?

  @objc var pause: Bool = false {
    didSet { pause ? session.stopRunning() : startSessionIfPossible() }
  }

  @objc var torch: Bool = false {
    didSet { setTorch(torch) }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    previewLayer.videoGravity = .resizeAspectFill
    layer.addSublayer(previewLayer)
    configureSession()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    configureSession()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer.frame = bounds
  }

  private func configureSession() {
    guard !configured else { return }
    configured = true
    guard let device = AVCaptureDevice.default(for: .video),
          let input = try? AVCaptureDeviceInput(device: device),
          session.canAddInput(input) else { return }

    let output = AVCaptureMetadataOutput()
    guard session.canAddOutput(output) else { return }
    session.beginConfiguration()
    session.addInput(input)
    session.addOutput(output)
    output.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
    output.metadataObjectTypes = [.qr]
    session.commitConfiguration()
    previewLayer.session = session
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      startSessionIfPossible()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
        guard granted else { return }
        self?.startSessionIfPossible()
      }
    default:
      break
    }
  }

  private func startSessionIfPossible() {
    guard configured, !pause, !session.isRunning else { return }
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self else { return }
      guard AVCaptureDevice.authorizationStatus(for: .video) == .authorized else { return }
      self.session.startRunning()
    }
  }

  private func setTorch(_ enabled: Bool) {
    guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else { return }
    do {
      try device.lockForConfiguration()
      device.torchMode = enabled ? .on : .off
      device.unlockForConfiguration()
    } catch { }
  }

  func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
    guard !pause,
          let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
          let value = object.stringValue,
          !value.isEmpty else { return }
    let now = Date()
    guard value != lastValue || now.timeIntervalSince(lastScanAt) > 1 else { return }
    lastValue = value
    lastScanAt = now
    onBarcodeScan?(["data": value] as [String: Any])
  }

  deinit { session.stopRunning() }
}

@objc(QRScannerViewManager)
final class QRScannerViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }
  override func view() -> UIView! { MarkWiseQRScannerView() }
}
