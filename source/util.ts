import * as tar_fs from 'tar-fs';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';


export async function fileExists(filepath: string) {
    try {
      await fs.promises.access(filepath, fs.constants.F_OK)
      return true
    } catch(e) {
      return false
    }
  }
    /**
     * Decompresses a (tarballed) Brotli or Gzip compressed file and returns the path to the decompressed file/folder.
     *
     * @param {string} folder
     * @param {string} file Path of the file to decompress.
     */
 export async function inflate(folder: string, file: string) {
    // Swiftshader need to be extracted at the same level as chromium and not inside a swiftshader director
    // https://github.com/alixaxel/chrome-aws-lambda/pull/264#issuecomment-1136311984
    const isSwiftshader = file.includes('swiftshader')

    const output = isSwiftshader ?
        folder :
        path.join(folder, path.basename(file).replace(/[.](?:t(?:ar(?:[.](?:br|gz))?|br|gz)|br|gz)$/i, ''));

    if (isSwiftshader) {
      if(await fileExists(path.join(output, 'libGLESv2.so'))) {
        return output;
      }
    } else if (await fileExists(output)) {
      return output;
    }

    return new Promise((resolve, reject) => {
        const source = fs.createReadStream(file, { highWaterMark: 2 ** 23 });
        let target = null;
        if (/[.](?:t(?:ar(?:[.](?:br|gz))?|br|gz))$/i.test(file)) {
            target = tar_fs.extract(output);
            target.once('finish', () => {
                return resolve(output);
            });
        } else {
            target = fs.createWriteStream(output, { mode: 0o700 });
        }
        source.once('error', (error) => {
            return reject(error);
        });
        target.once('error', (error: any) => {
            return reject(error);
        });
        target.once('close', () => {
            return resolve(output);
        });
        if (/(?:br|gz)$/i.test(file)) {
            source.pipe(/br$/i.test(file) ? zlib.createBrotliDecompress({ chunkSize: 2 ** 21 }) : zlib.createUnzip({ chunkSize: 2 ** 21 })).pipe(target);
        } else {
            source.pipe(target);
        }
    });
}

export function fontConfig(awsFolder: string) {
    return `<?xml version="1.0"?>
    <!DOCTYPE fontconfig SYSTEM "fonts.dtd">
    <fontconfig>
      <dir>${awsFolder}/.fonts</dir>
      <dir>/tmp/.fonts</dir>
      <dir>/opt/.fonts</dir>

      <match target="pattern">
        <test qual="any" name="family">
          <string>mono</string>
        </test>
        <edit name="family" mode="assign" binding="same">
          <string>monospace</string>
        </edit>
      </match>

      <match target="pattern">
        <test qual="any" name="family">
          <string>sans serif</string>
        </test>
        <edit name="family" mode="assign" binding="same">
          <string>sans-serif</string>
        </edit>
      </match>

      <match target="pattern">
        <test qual="any" name="family">
          <string>sans</string>
        </test>
        <edit name="family" mode="assign" binding="same">
          <string>sans-serif</string>
        </edit>
      </match>

      <config></config>
    </fontconfig>`
}
