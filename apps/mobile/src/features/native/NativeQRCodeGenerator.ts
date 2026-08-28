import { NativeModules } from 'react-native';

const { QRCodeGenerator } = NativeModules;

type QRCodeResult = {
  uri: string;
  width: number;
  height: number;
};

class QRCodeGeneratorAPI {
  generate(
    text: string,
    width: number = 300,
    height: number = 300,
  ): Promise<QRCodeResult> {
    return this.generateBase64(text, width, height).then(base64 => ({
      uri: `data:image/png;base64,${base64}`,
      width,
      height,
    }));
  }

  generateBase64(
    text: string,
    width: number = 300,
    height: number = 300,
  ): Promise<string> {
    void width;
    void height;
    return QRCodeGenerator.generateQRCode(text);
  }
}

export default new QRCodeGeneratorAPI();
