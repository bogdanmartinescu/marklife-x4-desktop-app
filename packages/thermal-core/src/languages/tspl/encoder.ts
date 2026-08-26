export class BinaryWriter {
  private readonly chunks: Uint8Array[] = [];

  text(value: string): this {
    this.chunks.push(new TextEncoder().encode(value));
    return this;
  }

  bytes(value: Uint8Array): this {
    this.chunks.push(value);
    return this;
  }

  concat(): Uint8Array {
    let length = 0;
    for (const chunk of this.chunks) {
      length += chunk.length;
    }
    const out = new Uint8Array(length);
    let offset = 0;
    for (const chunk of this.chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}
