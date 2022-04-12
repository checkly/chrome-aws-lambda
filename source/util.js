const tar_fs = require('tar-fs');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');


async function fileExists(filepath: string) {
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
     * @param file Path of the file to decompress.
     */
async function inflate(folder: string, file: string) {
    const output = path.join(folder, path.basename(file).replace(/[.](?:t(?:ar(?:[.](?:br|gz))?|br|gz)|br|gz)$/i, ''));
    if (await fileExists(output)) {
        return output;
    }
    return new Promise((resolve, reject) => {
        const source = fs.createReadStream(file, { highWaterMark: 2 ** 23 });
        let target = null;
        if (/[.](?:t(?:ar(?:[.](?:br|gz))?|br|gz))$/i.test(file) === true) {
            target = tar_fs.extract(output);
            target.once('finish', () => {
                return resolve(output);
            });
        }
        else {
            target = fs.createWriteStream(output, { mode: 0o700 });
        }
        source.once('error', (error) => {
            return reject(error);
        });
        target.once('error', (error) => {
            return reject(error);
        });
        target.once('close', () => {
            return resolve(output);
        });
        if (/(?:br|gz)$/i.test(file) === true) {
            source.pipe(/br$/i.test(file) ? zlib.createBrotliDecompress({ chunkSize: 2 ** 21 }) : zlib.createUnzip({ chunkSize: 2 ** 21 })).pipe(target);
        }
        else {
            source.pipe(target);
        }
    });
}

function fontConfig(awsFolder: string) {
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

module.exports = { fileExists, inflate, fontConfig }
