
var Screenshot = function(imageId) {
  this.image = document.getElementById(imageId);

  this.loaded = new Promise(function(resolve, reject) {
    if(!this.image.complete && typeof this.image.naturalWidth !== "undefined" && this.image.naturalWidth === 0) {
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
    var pixels = this._diffPixels(other);

    // Highlight the differences.
    this._highlightBoxes(pixels, 'rgba(0, 0, 255, 0.5)', 'rgba(0, 0, 255, 1)', 2);
    other._highlightBoxes(pixels, 'rgba(255, 0, 0, 0.5)', 'rgba(255, 0, 0, 1)', 2);

    if(pixels.length > 0) {
      var width = Math.min(this.width, other.width);
      var height = Math.min(this.height, other.height);

      var area = width * height;
      var differentPercent = 100 * pixels.length / area;
      console.log(differentPercent.toFixed(2) + '% different.');
    } else {
      console.log("No difference.");
    }

  }.bind(this));
}

Screenshot.prototype.horizontalDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff the image rows, cluster them together, and simplify them as boxes.
    var diffRows = this._diffRows(other);
    var rowClusters = Diff.clusterRows(diffRows, 2);
    var boxes = Diff.boxClusters(rowClusters);

    // Highlight the differences.
    this._highlightBoxes(boxes, 'rgba(0, 0, 255, 0.5)', 'rgba(0, 0, 255, 1)', 4);
    other._highlightBoxes(boxes, 'rgba(255, 0, 0, 0.5)', 'rgba(255, 0, 0, 1)', 4);

    if(boxes.length > 0) {
      console.log(boxes.length + ' regions are different.');
      console.log(boxes);
    } else {
      console.log("No difference.");
    }

  }.bind(this));
}

Screenshot.prototype._getPixel = function(x, y) {
  return this.imageData32.getPixel(x, y);
}

Screenshot.prototype._diffPixels = function(other) {
  var pixels = [];

  var width = Math.min(this.width, other.width);
  var height = Math.min(this.height, other.height);

  // Diff each pixel.
  for(var y = 0; y < height; y++) {
    for(var x = 0; x < width; x++) {
      var thisPixel = this._getPixel(x, y);
      var otherPixel = other._getPixel(x, y);

      // Collect a list of pixels that are different.
      if(thisPixel !== otherPixel) {
        pixels.push(new Diff.Box(x, y, x, y));
      }
    }
  }

  return pixels;
}

Screenshot.prototype._diffRows = function(other) {
  var width = Math.min(this.width, other.width);
  var height = Math.min(this.height, other.height);

  var diffRows = [];

  // Diff each row.
  for(var y = 0; y < height; y++) {
    var left = width;
    var right = width;

    // Find the leftmost pixel that is different.
    for(var x = 0; x < width; x++) {
      if(this._getPixel(x, y) !== other._getPixel(x, y)) {
        left = x;
        break;
      }
    }

    // Find the rightmost pixel that is different.
    for(var x = width - 1; x > left; x--) {
      if(this._getPixel(x, y) !== other._getPixel(x, y)) {
        right = x;
        break;
      }
    }

    // Collect a list of rows that are different.
    if(left < width) {
      diffRows.push(new Diff.Row(y, left, right));
    }
  }

  return diffRows;
}

Screenshot.prototype._highlightBoxes = function(boxes, fillStyle, strokeStyle, padding) {
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
  boxes.forEach(function(box) {
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
  boxes.forEach(function(box) {
    context.clearRect(
      box.left - padding,
      box.top  - padding,
      box.right  - box.left + 2*padding + 1,
      box.bottom - box.top  + 2*padding + 1
    );
  });

  if(boxes.length > 0) {
    // Render the overlay.
    this.context.putImageData(this.imageData, 0, 0);
    this.context.drawImage(overlay, 0, 0);
    this.image.src = this.canvas.toDataURL();
  }
}
