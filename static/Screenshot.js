
var Screenshot = function(imageId) {
  this.image = document.getElementById(imageId);

  this.loaded = new Promise(function(resolve, reject) {
    if(!this.image.complete || typeof this.image.naturalWidth !== "undefined" || this.image.naturalWidth === 0) {
      this.image.onload = resolve;
    } else {
      resolve();
    }
  }.bind(this))
  .then(function() {

    this.canvas = document.createElement("canvas");
    this.width = this.canvas.width = this.image.naturalWidth;
    this.height = this.canvas.height = this.image.naturalHeight;

    this.context = this.canvas.getContext("2d");
    this.context.drawImage(this.image, 0, 0);

    this.imageData = this.context.getImageData(0, 0, this.width, this.height);
    this.imageData32 = new ImageData32(this.imageData);

  }.bind(this));
}

Screenshot.prototype.setClusterSize = function(clusterSize) {
  return this.loaded.then(function() {
    this.imageData32.setClusterSize(clusterSize);
  }.bind(this));
}

Screenshot.prototype._paddingSize = function() {
  return this.imageData32.clusterSize();
}


Screenshot.prototype.reset = function() {
  return this.loaded.then(function() {
    this.context.putImageData(this.imageData, 0, 0);
    this.image.src = this.canvas.toDataURL();
  }.bind(this));
}

Screenshot.prototype.binaryDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff the image pixels.
    var pixels = this.imageData32.binaryDiff(other.imageData32);
    this._highlightDiff(other, pixels, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype.horizontalDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff the image rows.
    var rows = this.imageData32.horizontalDiff(other.imageData32);
    this._highlightDiff(other, rows, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype.splitDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff them image regions.
    var regions = this.imageData32.splitDiff(other.imageData32);
    this._highlightDiff(other, regions, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype.recursiveDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff them image regions.
    var regions = this.imageData32.recursiveDiff(other.imageData32);
    this._highlightDiff(other, regions, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype._highlightDiff = function(other, regions, padding) {
  this._highlight(regions, 'rgba(0, 0, 255, 0.5)', 'rgba(0, 0, 255, 1)', padding);
  other._highlight(regions, 'rgba(255, 0, 0, 0.5)', 'rgba(255, 0, 0, 1)', padding);
}

Screenshot.prototype._highlight = function(regions, fillStyle, strokeStyle, padding) {
  padding = padding || 0;

  var overlay = document.createElement('canvas');
  overlay.width = this.width;
  overlay.height = this.height;
  var context = overlay.getContext('2d');

  // Add a semitransparent overlay.
  context.fillStyle = fillStyle;
  context.beginPath();
  context.rect(0, 0, this.width, this.height);
  context.fill();

  context.beginPath();

  // Outline regions of the overlay that are different.
  regions.forEach(function(box) {
    context.rect(
      box.left - padding,
      box.top  - padding,
      box.right  - box.left + 2*padding + 1,
      box.bottom - box.top  + 2*padding + 1
    );
  });

  context.strokeStyle = strokeStyle;
  context.stroke();
  
  // Erase regions of the overlay that are different.
  regions.forEach(function(box) {
    context.clearRect(
      box.left - padding,
      box.top  - padding,
      box.right  - box.left + 2*padding + 1,
      box.bottom - box.top  + 2*padding + 1
    );
  });

  if(regions.length > 0) {
    // Reset the canvas.
    this.context.putImageData(this.imageData, 0, 0);

    // Render the overlay.
    this.context.drawImage(overlay, 0, 0);

    // Copy the canvas to the image.
    this.image.src = this.canvas.toDataURL();
  }
}
