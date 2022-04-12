const { promises: fs } = require('fs');
const { join } = require('path');
const { inflate, fileExists, fontConfig } = require('./util');

class Chromium {

  /**
   * Returns a list of recommended additional Chromium flags.
   */
  static get args() {
    const result = [
      '--disable-background-timer-throttling',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-cloud-import',
      '--disable-default-apps',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-gesture-typing',
      '--disable-hang-monitor',
      '--disable-infobars',
      '--disable-notifications',
      '--disable-offer-store-unmasked-wallet-cards',
      '--disable-offer-upload-credit-cards',
      '--disable-popup-blocking',
      '--disable-print-preview',
      '--disable-prompt-on-repost',
      '--disable-setuid-sandbox',
      '--disable-speech-api',
      '--disable-sync',
      '--disable-tab-for-desktop-share',
      '--disable-translate',
      '--disable-voice-input',
      '--disable-wake-on-wifi',
      '--disk-cache-size=33554432',
      '--enable-async-dns',
      '--enable-simple-cache-backend',
      '--enable-tcp-fast-open',
      '--enable-webgl',
      '--hide-scrollbars',
      '--ignore-gpu-blacklist',
      '--media-cache-size=33554432',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-first-run',
      '--no-pings',
      '--no-sandbox',
      '--no-zygote',
      '--password-store=basic',
      '--prerender-from-omnibox=disabled',
      '--use-gl=swiftshader',
      '--use-mock-keychain',
    ];

    if (parseInt(process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE || process.env.FUNCTION_MEMORY_MB || '1024', 10) >= 1024) {
      result.push('--memory-pressure-off');
    }

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

  static async prepare() {
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
    for (const overload of ['FrameManager', 'Page']) {
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
