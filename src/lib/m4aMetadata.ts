/**
 * High-performance, pure-JavaScript MP4/M4A metadata tagger.
 * Injects Title (©nam), Artist (©ART), Album Artist (aART), Album (©alb),
 * Cover Art (covr atom with JPEG/PNG data atom), and Lyrics (©lyr atom)
 * inside moov.udta.meta.ilst with standard 33-byte hdlr (mdir/appl) atom
 * and ISO Base Media File Format chunk offset recalculation (stco/co64).
 * Works offline and across all platforms (Android, Windows, iOS, macOS, Linux).
 */

export interface M4aTags {
  title?: string;
  artist?: string;
  album?: string;
  lyrics?: string;
  cover?: Buffer;
}

function makeAtom(type: string, data: Buffer): Buffer {
  const len = 8 + data.length;
  const buf = Buffer.alloc(len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, "latin1");
  data.copy(buf, 8);
  return buf;
}

function makeTextAtom(type: string, text: string): Buffer {
  const strBuf = Buffer.from(text, "utf8");
  // 'data' atom header: 4 bytes length, 4 bytes 'data', 4 bytes type (1 = UTF-8), 4 bytes flags/locale (0)
  const dataAtom = Buffer.alloc(16 + strBuf.length);
  dataAtom.writeUInt32BE(16 + strBuf.length, 0);
  dataAtom.write("data", 4, 4, "ascii");
  dataAtom.writeUInt32BE(1, 8); // Type 1: UTF-8 string
  dataAtom.writeUInt32BE(0, 12); // flags & locale
  strBuf.copy(dataAtom, 16);
  return makeAtom(type, dataAtom);
}

function makeCoverAtom(imageBuffer: Buffer): Buffer {
  // Determine image type: 13 for JPEG, 14 for PNG
  const isPng =
    imageBuffer.length > 8 &&
    imageBuffer[0] === 0x89 &&
    imageBuffer[1] === 0x50 &&
    imageBuffer[2] === 0x4e &&
    imageBuffer[3] === 0x47;
  const typeCode = isPng ? 14 : 13;

  const dataAtom = Buffer.alloc(16 + imageBuffer.length);
  dataAtom.writeUInt32BE(16 + imageBuffer.length, 0);
  dataAtom.write("data", 4, 4, "ascii");
  dataAtom.writeUInt32BE(typeCode, 8); // 13 = JPEG, 14 = PNG
  dataAtom.writeUInt32BE(0, 12);
  imageBuffer.copy(dataAtom, 16);
  return makeAtom("covr", dataAtom);
}

function buildUdtaAtom(tags: M4aTags): Buffer {
  const items: Buffer[] = [];
  if (tags.title) items.push(makeTextAtom("©nam", tags.title));
  if (tags.artist) {
    items.push(makeTextAtom("©ART", tags.artist));
    items.push(makeTextAtom("aART", tags.artist));
  }
  if (tags.album) items.push(makeTextAtom("©alb", tags.album));
  if (tags.lyrics) items.push(makeTextAtom("©lyr", tags.lyrics));
  if (tags.cover && Buffer.isBuffer(tags.cover) && tags.cover.length > 0) {
    items.push(makeCoverAtom(tags.cover));
  }

  const ilst = makeAtom("ilst", Buffer.concat(items));

  // Standard 33-byte iTunes metadata handler (hdlr) box: mdir/appl
  // Essential for Android MediaMetadataRetriever, Windows Media Player, VLC, Apple Music
  const hdlr = Buffer.from("0000002168646c7200000000000000006d6469726170706c000000000000000000", "hex");

  // meta is a FullAtom: 4 bytes len, 'meta', 4 bytes version/flags (0), then hdlr, then ilst
  const metaPayload = Buffer.concat([
    Buffer.alloc(4), // version & flags = 0
    hdlr,
    ilst,
  ]);

  const meta = makeAtom("meta", metaPayload);
  return makeAtom("udta", meta);
}

export function tagM4a(buffer: Buffer, tags: M4aTags): Buffer {
  if (buffer.length < 16) return buffer;

  let moovStart = -1;
  let moovLen = 0;
  let mdatStart = -1;

  // 1. Locate top-level atoms (moov, mdat)
  let pos = 0;
  while (pos + 8 <= buffer.length) {
    let size = buffer.readUInt32BE(pos);
    const type = buffer.toString("latin1", pos + 4, pos + 8);

    if (size === 1 && pos + 16 <= buffer.length) {
      // 64-bit extended size
      const bigSize = buffer.readBigUInt64BE(pos + 8);
      size = Number(bigSize);
    } else if (size === 0) {
      size = buffer.length - pos;
    }

    if (size < 8) break;

    if (type === "moov") {
      moovStart = pos;
      moovLen = size;
    } else if (type === "mdat") {
      mdatStart = pos;
    }

    pos += size;
  }

  if (moovStart === -1 || moovLen === 0) {
    return buffer; // Not a valid MP4 with moov atom
  }

  // 2. Extract moov atom payload (excluding 8 bytes moov header)
  const moovPayload = buffer.subarray(moovStart + 8, moovStart + moovLen);

  // 3. Remove existing udta and meta atoms if present in moov
  const filteredChildren: Buffer[] = [];
  let childPos = 0;
  while (childPos + 8 <= moovPayload.length) {
    let cSize = moovPayload.readUInt32BE(childPos);
    const cType = moovPayload.toString("latin1", childPos + 4, childPos + 8);
    if (cSize === 0) cSize = moovPayload.length - childPos;
    if (cSize < 8 || childPos + cSize > moovPayload.length) break;

    if (cType !== "udta" && cType !== "meta") {
      filteredChildren.push(moovPayload.subarray(childPos, childPos + cSize));
    }
    childPos += cSize;
  }

  // 4. Build standard udta atom containing iTunes metadata (title, artist, album, covr, ©lyr)
  const newUdta = buildUdtaAtom(tags);
  filteredChildren.push(newUdta);

  const newMoovPayload = Buffer.concat(filteredChildren);
  const newMoov = makeAtom("moov", newMoovPayload);
  const delta = newMoov.length - moovLen;

  // 5. If moov is placed BEFORE mdat in the file, media chunk offsets (stco/co64) in mdat have shifted by delta!
  if (delta !== 0 && mdatStart > moovStart) {
    let p = 0;
    while (p + 8 <= newMoov.length) {
      // Find stco (32-bit chunk offset)
      if (newMoov.toString("latin1", p + 4, p + 8) === "stco") {
        const atomSize = newMoov.readUInt32BE(p);
        if (p + atomSize <= newMoov.length && atomSize >= 16) {
          const entryCount = newMoov.readUInt32BE(p + 12);
          for (let i = 0; i < entryCount; i++) {
            const offsetPos = p + 16 + i * 4;
            if (offsetPos + 4 <= newMoov.length) {
              const oldOffset = newMoov.readUInt32BE(offsetPos);
              newMoov.writeUInt32BE(oldOffset + delta, offsetPos);
            }
          }
        }
      }
      // Find co64 (64-bit chunk offset)
      else if (newMoov.toString("latin1", p + 4, p + 8) === "co64") {
        const atomSize = newMoov.readUInt32BE(p);
        if (p + atomSize <= newMoov.length && atomSize >= 16) {
          const entryCount = newMoov.readUInt32BE(p + 12);
          for (let i = 0; i < entryCount; i++) {
            const offsetPos = p + 16 + i * 8;
            if (offsetPos + 8 <= newMoov.length) {
              const oldOffset = newMoov.readBigUInt64BE(offsetPos);
              newMoov.writeBigUInt64BE(oldOffset + BigInt(delta), offsetPos);
            }
          }
        }
      }
      p++;
    }
  }

  // 6. Return reconstructed file buffer
  return Buffer.concat([
    buffer.subarray(0, moovStart),
    newMoov,
    buffer.subarray(moovStart + moovLen),
  ]);
}
