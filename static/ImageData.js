var ImageData32 = function(data, width, height) {
  this.data = data;
  this.width = width;
  this.height = height;
  this.clusterSize = Diff.Constant(0);
};

ImageData32.from8 = function(imageData8) {
  return new ImageData32(
    new Uint32Array(imageData8.data.buffer),
    imageData8.width,
    imageData8.height
  );
}

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

ImageData32.prototype.moveDiff = function(other) {

  // Recursively diff the image boxes.
  var boxes = this.recursiveDiff(other);

  return this._matchRegions(other, boxes);
}

ImageData32.prototype._matchRegions = function(other, boxes) {

  // Seprate out pairs of exact matches between diff regions.
  moves = [];
  for(var i = 0; i < boxes.length; i++) {
    box1 = boxes[i];

    for(var j = i + 1; j < boxes.length; j++) {
      var box2 = boxes[j];

      if(!this.compareRegions(other, box1, box2)) continue;

      var move = {};

      // ASSUMTION: The foreground of a webpage has higher entropy than the background.
      // Consider analyzing just the entropy of the border to measure continuity.
      // IDEA: The foreground is the thing that changed the least, then fall back to entropy if equal.
      if(this.entropy(box1) > other.entropy(box1)) {
        move = {from: box1, to: box2};
      } else {
        move = {from: box2, to: box1};
      }

      moves.push(move);
      boxes.splice(j, 1);
      boxes.splice(i, 1);
      i--;
      break;
    }
  }

  return {
    changes: boxes,
    moves: moves
  };
}

ImageData32.prototype.decomposeDiff = function(other) {

  // Move diff the image boxes.
  var diff = this.moveDiff(other);

  var boxes = [];

  // Seprate out pairs of exact matches between diff regions.
  for(var i = 0; i < diff.changes.length; i++) {
    box = diff.changes[i];

    // Decompose the image region.
    boxes = boxes.concat(this.decompose(box), other.decompose(box));
  }

  var innerDiff = this._matchRegions(other, boxes);

  return {
    changes: innerDiff.changes,
    moves: diff.moves.concat(innerDiff.moves)
  };
}

ImageData32.prototype.decompose = function(boundary) {
  var outline = this.outline(boundary);

  var base = new ImageData32(
    new Uint32Array(boundary.width() * boundary.height()),
    boundary.width(),
    boundary.height()
  );

  var boxes = base.recursiveDiff(outline);

  boxes.forEach(function(box) {
    box.top += boundary.top;
    box.bottom += boundary.top;
    box.left += boundary.left;
    box.right += boundary.left;
  });

  return boxes;
}

ImageData32.prototype.outline = function(boundary) {
  var outline = new ImageData32(
    new Uint32Array(boundary.width() * boundary.height()),
    boundary.width(),
    boundary.height()
  );
  // Diff each pixel.
  var backgroundColor = this.getPixel(boundary.left - 1, boundary.top - 1);
  for(var y = boundary.top, j = 0; y <= boundary.bottom; y++, j++) {
    for(var x = boundary.left, i = 0; x <= boundary.right; x++, i++) {
      var pixel = this.getPixel(x, y);

      var same = pixel == backgroundColor;
      
      if(!same) outline.setPixel(i, j, 0xffffffff);
    }
  }
  return outline;
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

ImageData32.prototype.compareRegions = function(other, thisBoundary, otherBoundary) {

  if(thisBoundary.width() != otherBoundary.width()) return false;
  if(thisBoundary.height() != otherBoundary.height()) return false;

  // Diff each row.
  for(var y1 = thisBoundary.top, y2 = otherBoundary.top; y1 <= thisBoundary.bottom; y1++, y2++) {
    for(var x1 = thisBoundary.left, x2 = otherBoundary.left; x1 <= thisBoundary.right; x1++, x2++) {
      if(this.getPixel(x1, y1) != other.getPixel(x2, y2)) return false;
    }
  }

  return true;
}

ImageData32.prototype.entropy = function(boundary) {
  var entropy = 0;
  edges = 2 * (boundary.width() - 1) * (boundary.height() - 1);

  for(var y = boundary.top; y < boundary.bottom; y++) {
    for(var x = boundary.left; x < boundary.right; x++) {
      pixel = ImageData32.uint32ToRgba(this.getPixel(x, y));
      beside = ImageData32.uint32ToRgba(this.getPixel(x+1, y));
      below = ImageData32.uint32ToRgba(this.getPixel(x, y+1));
      entropy += (
        Math.abs(pixel[0] - beside[0]) + 
        Math.abs(pixel[1] - beside[1]) + 
        Math.abs(pixel[2] - beside[2]) +
        Math.abs(pixel[0] - below[0]) + 
        Math.abs(pixel[1] - below[1]) + 
        Math.abs(pixel[2] - below[2])
      )/(3*256);
    }
  }

  return entropy/edges;
}
