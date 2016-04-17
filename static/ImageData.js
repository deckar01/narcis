var ImageData32 = function(imageData8) {
  this.data = new Uint32Array(imageData8.data.buffer);
  this.width = imageData8.width;
  this.height = imageData8.height;
  this.clusterSize = Diff.Constant(0);
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

ImageData32.prototype.setClusterSize = function(clusterSize) {
  this.clusterSize = clusterSize;
};

ImageData32.prototype.binaryDiff = function(other) {
  var pixels = [];

  var width = Math.min(this.width, other.width);
  var height = Math.min(this.height, other.height);

  // Diff each pixel.
  for(var y = 0; y < height; y++) {
    for(var x = 0; x < width; x++) {
      var thisPixel = this.getPixel(x, y);
      var otherPixel = other.getPixel(x, y);

      // Collect a list of pixels that are different.
      if(thisPixel !== otherPixel) {
        pixels.push(new Diff.Box(x, y, x, y));
      }
    }
  }

  return pixels;
}

ImageData32.prototype.horizontalDiff = function(other, boundary) {
  boundary = boundary || this.commonBoundary(other);

  // Diff the image rows.
  var diffRows = this.diffRows(other, boundary);

  // Cluster the rows together.
  var maxHeight = this.clusterSize(boundary.height());
  var rowClusters = Diff.clusterRows(diffRows, maxHeight);

  // Simplify the clusters as boxes.
  var boxes = Diff.boxClusters(rowClusters);

  return boxes;
}

ImageData32.prototype.splitDiff = function(other, boundary) {
  
  var rowBoxes = this.horizontalDiff(other, boundary);

  return rowBoxes.reduce(function(boxes, rowBox) {

    // Diff the image columns.
    var diffColumns = this.diffColumns(other, rowBox);

    // Cluster the columns together.
    var maxWidth = this.clusterSize(rowBox.width());
    var columnClusters = Diff.clusterColumns(diffColumns, maxWidth);

    // Simplify the clusters as boxes.
    var columnBoxes = Diff.boxClusters(columnClusters);

    return boxes.concat(columnBoxes);
  }.bind(this), []);
}

ImageData32.prototype.recursiveDiff = function(other, boundary) {
  
  // Split diff within the boundary.
  var boxes = this.splitDiff(other, boundary);
  
  // Stop if the boundary could not be split.
  if(boxes.length <= 1) { return boxes; }

  // Recursively split boxes into smaller boxes.
  return boxes.reduce(function(innerBoxes, box) {
    return innerBoxes.concat(this.recursiveDiff(other, box));
  }.bind(this), []);
}

ImageData32.prototype.commonBoundary = function(other) {

  var width = Math.min(this.width, other.width);
  var height = Math.min(this.height, other.height);

  // Return the intersecting region of the two boundaries.
  return new Diff.Box(0, 0, width - 1, height - 1);
}

ImageData32.prototype.diffRows = function(other, boundary) {

  var diffRows = [];

  // Diff each row.
  for(var y = boundary.top; y <= boundary.bottom; y++) {
    var first = boundary.right + 1;
    var last = boundary.right + 1;

    // Find the leftmost pixel that is different.
    for(var x = boundary.left; x <= boundary.right; x++) {
      if(this.getPixel(x, y) !== other.getPixel(x, y)) {
        first = x;
        break;
      }
    }

    // Find the rightmost pixel that is different.
    for(var x = boundary.right; x > first; x--) {
      if(this.getPixel(x, y) !== other.getPixel(x, y)) {
        last = x;
        break;
      }
    }

    // Collect a list of rows that are different.
    if(first <= boundary.right) {
      diffRows.push(new Diff.Box(first, y, last, y));
    }
  }

  return diffRows;
}

ImageData32.prototype.diffColumns = function(other, boundary) {

  boundary = boundary || this.commonBoundary(other);

  var diffRows = [];

  // Diff each column.
  for(var x = boundary.left; x <= boundary.right; x++) {
    var first = boundary.bottom + 1;
    var last = boundary.bottom + 1;

    // Find the topmost pixel that is different.
    for(var y = boundary.top; y <= boundary.bottom; y++) {
      if(this.getPixel(x, y) !== other.getPixel(x, y)) {
        first = y;
        break;
      }
    }

    // Find the bottommost pixel that is different.
    for(var y = boundary.bottom; y > first; y--) {
      if(this.getPixel(x, y) !== other.getPixel(x, y)) {
        last = y;
        break;
      }
    }

    // Collect a list of columns that are different.
    if(first <= boundary.bottom) {
      diffRows.push(new Diff.Box(x, first, x, last));
    }
  }

  return diffRows;
}
