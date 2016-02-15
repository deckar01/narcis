var ImageData32 = function(imageData8) {
  this.data = new Uint32Array(imageData8.data.buffer);
  this.width = imageData8.width;
  this.height = imageData8.height;
};

ImageData32.prototype.index = function(x, y) {
  return x + y*this.width;
};

ImageData32.prototype.getPixel = function(x, y) {
  return this.data[this.index(x, y)];
};

ImageData32.prototype.setPixel = function(x, y, color) {
  this.data[this.index(x, y)] = color;
};

ImageData32.rgbaToUint32 = function(r, g, b, a) {
  return (r<<24 | g<<16 | b<<8 | a) >>> 0;
};

ImageData32.uint32ToRgba = function(color) {
  return [
    color>>24 & 0xff,
    color>>16 & 0xff,
    color>>8  & 0xff,
    color     & 0xff,
  ];
};

ImageData32.prototype.sliceRow = function(y, xBegin, xEnd) {
  return this.data.slice(
    this.index(xBegin, y),
    this.index(xEnd, y)
  );
};
