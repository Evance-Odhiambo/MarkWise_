import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import React
import UIKit

@objc(QRCodeGenerator)
final class QRCodeGenerator: NSObject {
  @objc static func moduleName() -> String! { "QRCodeGenerator" }
  @objc static func requiresMainQueueSetup() -> Bool { false }

  @objc(generateQRCode:resolver:rejecter:)
  func generateQRCode(
    _ content: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard let data = content.data(using: .utf8) else {
      reject("QR_ENCODING_FAILED", "Unable to encode QR content", nil)
      return
    }

    let filter = CIFilter.qrCodeGenerator()
    filter.message = data
    filter.correctionLevel = "M"
    guard let output = filter.outputImage else {
      reject("QR_GENERATION_FAILED", "Unable to generate QR image", nil)
      return
    }

    let scale = 800.0 / max(output.extent.width, output.extent.height)
    let transformed = output.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let context = CIContext(options: nil)
    guard let cgImage = context.createCGImage(transformed, from: transformed.extent),
          let png = UIImage(cgImage: cgImage).pngData() else {
      reject("QR_RENDER_FAILED", "Unable to render QR image", nil)
      return
    }
    resolve(png.base64EncodedString())
  }
}
