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
    height: number = 300
  ): Promise<QRCodeResult> {
    return QRCodeGenerator.generate(text, width, height);
  }

  generateBase64(
    text: string,
    width: number = 300,
    height: number = 300
  ): Promise<string> {
    return QRCodeGenerator.generateBase64(text, width, height);
  }
}

export default new QRCodeGeneratorAPI();
