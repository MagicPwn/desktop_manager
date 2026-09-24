import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const sizes = [16, 32, 48, 64, 128, 256];

function pixels(size) {
  const data = Buffer.alloc(size * size * 4);
  const radius = size * 0.18;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const distanceX = Math.max(radius - x, x - (size - radius - 1), 0);
      const distanceY = Math.max(radius - y, y - (size - radius - 1), 0);
      if (Math.hypot(distanceX, distanceY) > radius) continue;
      data[index] = 26;
      data[index + 1] = 102 + Math.round((y / size) * 36);
      data[index + 2] = 211;
      data[index + 3] = 255;
      const margin = size * 0.25;
      const gap = size * 0.075;
      const tile = (size - margin * 2 - gap) / 2;
      const inTileX = (x >= margin && x < margin + tile) || (x >= margin + tile + gap && x < size - margin);
      const inTileY = (y >= margin && y < margin + tile) || (y >= margin + tile + gap && y < size - margin);
      if (inTileX && inTileY) {
        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
      }
    }
  }
  return data;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return output;
}

function png(size) {
  const rgba = pixels(size);
  const scanlines = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) rgba.copy(scanlines, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, buffer }, index) => {
    const entry = 6 + index * 16;
    header[entry] = size === 256 ? 0 : size;
    header[entry + 1] = size === 256 ? 0 : size;
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(buffer.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += buffer.length;
  });
  return Buffer.concat([header, ...images.map(({ buffer }) => buffer)]);
}

mkdirSync("src-tauri/icons", { recursive: true });
const images = sizes.map((size) => ({ size, buffer: png(size) }));
writeFileSync("src-tauri/icons/icon.png", images.at(-1).buffer);
writeFileSync("src-tauri/icons/icon.ico", ico(images));
