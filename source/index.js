const { promises: fs } = require('fs');
const { join } = require('path');
const { inflate, fileExists, fontConfig } = require('./util');

class Chromium {

  /**
   * Returns a list of recommended additional Chromium flags.
   */
  static get args() {
    const result = [
      '--autoplay-policy=user-gesture-required',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-dev-shm-usage',
      '--disable-domain-reliability',
      '--disable-extensions',
      '--disable-features=AudioServiceOutOfProcess',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-notifications',
      '--disable-offer-store-unmasked-wallet-cards',
      '--disable-popup-blocking',
      '--disable-print-preview',
      '--disable-prompt-on-repost',
      '--disable-renderer-backgrounding',
      '--disable-setuid-sandbox',
      '--disable-speech-api',
      '--disable-sync',
      '--disk-cache-size=33554432',
      '--hide-scrollbars',
      '--ignore-gpu-blacklist',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-first-run',
      '--no-pings',
      '--no-sandbox',
      '--no-zygote',
      '--password-store=basic',
      '--use-gl=swiftshader',
      '--use-mock-keychain',
    ];

    if (this.headless === true) {
      result.push('--single-process');
    } else {
      result.push('--start-maximized');
    }

    return result;
  }

  /**
   * Returns more sensible default viewport settings.
   */
  static get defaultViewport() {
    return {
      deviceScaleFactor: 1,
      hasTouch: false,
      height: Chromium.headless === true ? 1080 : 0,
      isLandscape: true,
      isMobile: false,
      width: Chromium.headless === true ? 1920 : 0,
    };
  }

  static async prepare(folder) {
    await fs.mkdir(folder, { recursive: true, mode: 0o777 })
    const chromiumExpectedPath = join(folder, 'chromium')
    if (await fileExists(chromiumExpectedPath)) {
      const files = await fs.readdir(folder)
      for (const file of files) {
        if (file.startsWith('core.chromium') === true) {
          await fs.unlink(join(folder, file));
        }
      }
    } else {
      const input = join(__dirname, '..', 'bin');
      const promises = [
        inflate(folder, `${input}/chromium.br`),
        inflate(folder, `${input}/swiftshader.tar.br`),
        inflate(folder, `${input}/aws.tar.br`),
      ];

      const awsFolder = join(folder, 'aws')

      await Promise.all(promises);
      await fs.writeFile(join(awsFolder, 'fonts.conf'), fontConfig(awsFolder), { encoding: 'utf8', mode: 0o700})
    }
    return {
      fontConfigPath: join(folder, 'aws'),
      ldLibraryPath: join(folder, 'aws', 'lib'),
      chromiumPath: chromiumExpectedPath,
    }
  }

  /**
   * Returns a boolean indicating if we are running on AWS Lambda or Google Cloud Functions.
   * Returns false if Serverless environment variable `IS_LOCAL` is set.
   */
  static get headless() {
    if (process.env.IS_LOCAL !== undefined) {
      return false;
    }

    return ['AWS_LAMBDA_FUNCTION_NAME', 'FUNCTION_NAME', 'FUNCTION_TARGET'].some((key) => process.env[key] !== undefined);
  }

  /**
   * Overloads puppeteer with useful methods and returns the resolved package.
   */
  static get puppeteer() {
    for (const overload of ['Browser', 'FrameManager', 'Page']) {
      require(`${__dirname}/puppeteer/lib/${overload}`);
    }

    try {
      return require('puppeteer');
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') {
        throw error;
      }

      return require('puppeteer-core');
    }
  }
}

module.exports = Chromium;
