import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { diagnosticFile, maxDiagnosticArchiveBytes, maxDiagnosticBytes, parseDiagnostic } from './index-diagnostic.mjs';

export function diagnosticChecksum(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function unpack(bytes) {
  // The central directory supplies sizes when a streaming ZIP uses a data descriptor.
  const end = bytes.length - 22;
  if (bytes.readUInt32LE(end) !== 0x06054b50 || bytes.readUInt32LE(end + 4) !== 0 ||
      bytes.readUInt16LE(end + 8) !== 1 || bytes.readUInt16LE(end + 10) !== 1 || bytes.readUInt16LE(end + 20) !== 0) return null;
  const central = bytes.readUInt32LE(end + 16);
  if (central + 46 > end || central + bytes.readUInt32LE(end + 12) !== end || bytes.readUInt32LE(central) !== 0x02014b50) return null;
  const flags = bytes.readUInt16LE(central + 8);
  const method = bytes.readUInt16LE(central + 10);
  const compressed = bytes.readUInt32LE(central + 20);
  const size = bytes.readUInt32LE(central + 24);
  const filenameSize = bytes.readUInt16LE(central + 28);
  const centralName = central + 46;
  if ((flags & 1) || ![0, 8].includes(method) || size < 1 || size > maxDiagnosticBytes ||
      centralName + filenameSize + bytes.readUInt16LE(central + 30) + bytes.readUInt16LE(central + 32) !== end ||
      bytes.subarray(centralName, centralName + filenameSize).toString('utf8') !== diagnosticFile || bytes.readUInt32LE(central + 42) !== 0) return null;
  if (bytes.readUInt32LE(0) !== 0x04034b50 || bytes.readUInt16LE(6) !== flags || bytes.readUInt16LE(8) !== method ||
      bytes.readUInt16LE(26) !== filenameSize || bytes.subarray(30, 30 + filenameSize).toString('utf8') !== diagnosticFile) return null;
  const dataStart = 30 + filenameSize + bytes.readUInt16LE(28);
  if (dataStart + compressed > central) return null;
  const packed = bytes.subarray(dataStart, dataStart + compressed);
  const data = method === 0 ? packed : inflateRawSync(packed, { maxOutputLength: maxDiagnosticBytes });
  if (data.length !== size || diagnosticChecksum(data) !== bytes.readUInt32LE(central + 16)) return null;
  return new TextDecoder('utf-8', { fatal: true }).decode(data);
}

export function readDiagnosticArchive(bytes, digest) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 98 || bytes.length > maxDiagnosticArchiveBytes) return null;
  if (digest !== undefined && digest !== null &&
      digest !== `sha256:${createHash('sha256').update(bytes).digest('hex')}`) return null;
  try { return parseDiagnostic(unpack(bytes)); }
  catch { return null; }
}
