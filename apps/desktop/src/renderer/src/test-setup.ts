if (typeof globalThis.DOMMatrix === 'undefined') {
  class DOMMatrixStub {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
  }
  Object.assign(globalThis, { DOMMatrix: DOMMatrixStub });
}
