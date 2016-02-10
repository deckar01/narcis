
var Screenshot = function(imageId) {
  this.image = document.getElementById(imageId);

  this.loaded = new Promise(function(resolve, reject) {
    if(!this.image.complete && typeof this.image.naturalWidth !== "undefined" && this.image.naturalWidth === 0) {
      this.image.onload = resolve;
    } else {
      resolve();
    }
  }.bind(this))
  .then(this._load.bind(this));
}

Screenshot.prototype._load = function() {
  this.canvas = document.createElement("canvas");
  this.width = this.canvas.width = this.image.naturalWidth;
  this.height = this.canvas.height = this.image.naturalHeight;

  this.context = this.canvas.getContext("2d");
  this.context.drawImage(this.image, 0, 0);

  this.imageData = this.context.getImageData(0, 0, this.width, this.height);
}

Screenshot.prototype.renderData = function(data) {
  this.context.putImageData(data, 0, 0);
  this.image.src = this.canvas.toDataURL();
}

Screenshot.prototype.renderCanvas = function(canvas) {
  this.context.drawImage(canvas, 0, 0);
  this.image.src = this.canvas.toDataURL();
}

Screenshot.prototype.reset = function() {
  if(this.imageData) {
    this.context.putImageData(this.imageData, 0, 0);
    this.image.src = this.canvas.toDataURL();
  }
}

Screenshot.prototype.simpleDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {
    var different = false;

    var widthDiff = other.width - this.width;
    if(widthDiff !== 0) {
      different = true;
      console.log('Width: ' + (widthDiff > 0 ? '+' : '') + widthDiff);
    }

    var heightDiff = other.height - this.height;
    if(heightDiff !== 0) {
      different = true;
      console.log('Height: ' + (heightDiff > 0 ? '+' : '') + heightDiff);
    }

    var width = Math.min(this.width, other.width);
    var height = Math.min(this.height, other.height);

    var differentPixels = 0;

    var thisDiffData = this.context.createImageData(this.imageData);
    var otherDiffData = other.context.createImageData(other.imageData);

    for(var y = 0; y < height; y++) {
      for(var x = 0; x < width; x++) {
        var thisIndex = 4*(this.width*y + x);
        var otherIndex = 4*(other.width*y + x);

        var rDiff = other.imageData.data[otherIndex] - this.imageData.data[thisIndex];
        var gDiff = other.imageData.data[otherIndex+1] - this.imageData.data[thisIndex+1];
        var bDiff = other.imageData.data[otherIndex+2] - this.imageData.data[thisIndex+2];

        if(rDiff !== 0 || gDiff !== 0 || bDiff !== 0) {
          differentPixels++;

          var distance = Math.min(255, Math.abs(rDiff) + Math.abs(gDiff) + Math.abs(bDiff));

          thisDiffData.data[thisIndex] = this.imageData.data[thisIndex];
          thisDiffData.data[thisIndex+1] = this.imageData.data[thisIndex+1];
          thisDiffData.data[thisIndex+2] = this.imageData.data[thisIndex+2];
          thisDiffData.data[thisIndex+3] = distance;

          otherDiffData.data[otherIndex] = other.imageData.data[otherIndex];
          otherDiffData.data[otherIndex+1] = other.imageData.data[otherIndex+1];
          otherDiffData.data[otherIndex+2] = other.imageData.data[otherIndex+2];
          otherDiffData.data[otherIndex+3] = distance;
        }
      }
    }

    if(differentPixels > 0) {
      different = true;

      this.renderData(thisDiffData);
      other.renderData(otherDiffData);

      var area = width * height;
      var differentPercent = 100 * differentPixels / area;
      console.log(differentPercent.toFixed(2) + '% different.')
    }

    if(!different) {
      console.log("No difference.");
    }

    return different;
  }.bind(this));
}

Screenshot.prototype.cloneCanvas = function() {
  //create a new canvas
  var canvas = document.createElement('canvas');
  canvas.width = this.width;
  canvas.height = this.height;

  var context = canvas.getContext('2d');
  context.putImageData(this.imageData, 0, 0);

  return canvas;
}

Screenshot.prototype.horizontalDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {
    var different = false;

    var widthDiff = other.width - this.width;
    if(widthDiff !== 0) {
      different = true;
      console.log('Width: ' + (widthDiff > 0 ? '+' : '') + widthDiff);
    }

    var heightDiff = other.height - this.height;
    if(heightDiff !== 0) {
      different = true;
      console.log('Height: ' + (heightDiff > 0 ? '+' : '') + heightDiff);
    }

    var width = Math.min(this.width, other.width);
    var height = Math.min(this.height, other.height);

    var diffRows = [];
    for(var y = 0; y < height; y++) {
      var diffStartX = width;
      var diffEndX = width;

      for(var x = 0; x < width; x++) {
        var thisIndex = 4*(this.width*y + x);
        var otherIndex = 4*(other.width*y + x);

        var rDiff = other.imageData.data[otherIndex] - this.imageData.data[thisIndex];
        var gDiff = other.imageData.data[otherIndex+1] - this.imageData.data[thisIndex+1];
        var bDiff = other.imageData.data[otherIndex+2] - this.imageData.data[thisIndex+2];

        if(rDiff !== 0 || gDiff !== 0 || bDiff !== 0) {
          diffStartX = x;
          break;
        }
      }

      for(var x = width - 1; x > diffStartX; x--) {
        var thisIndex = 4*(this.width*y + x);
        var otherIndex = 4*(other.width*y + x);

        var rDiff = other.imageData.data[otherIndex] - this.imageData.data[thisIndex];
        var gDiff = other.imageData.data[otherIndex+1] - this.imageData.data[thisIndex+1];
        var bDiff = other.imageData.data[otherIndex+2] - this.imageData.data[thisIndex+2];

        if(rDiff !== 0 || gDiff !== 0 || bDiff !== 0) {
          diffEndX = x;
          break;
        }
      }

      if(diffStartX < width) {
        diffRows.push({
          y: y,
          diffStartX: diffStartX,
          diffEndX: diffEndX
        });
      }
    }

    var MAX_GAP = 2;

    var diffSpans = [];
    var currentDiffSpan = [];
    var diffMinX = width;
    var diffMaxX = -1;
    var previousY = -1;
    for(var i = 0; i < diffRows.length; i++) {
      var currentDiffRow = diffRows[i];
      if(currentDiffRow.y <= previousY + 1 + MAX_GAP) {
        currentDiffSpan.push(currentDiffRow);
        if(currentDiffRow.diffStartX < diffMinX) diffMinX = currentDiffRow.diffStartX;
        if(currentDiffRow.diffEndX > diffMaxX) diffMaxX = currentDiffRow.diffEndX;
      } else {
        if(currentDiffSpan.length > 0) {
          diffSpans.push({
            startY: currentDiffSpan[0].y,
            endY: currentDiffSpan[currentDiffSpan.length-1].y,
            startX: diffMinX,
            endX: diffMaxX
          });
        }
        currentDiffSpan = [currentDiffRow];
        var diffMinX = currentDiffRow.diffStartX;
        var diffMaxX = currentDiffRow.diffEndX;
      }
      previousY = currentDiffRow.y;
    }
    if(currentDiffSpan.length > 0) {
      diffSpans.push({
        startY: currentDiffSpan[0].y,
        endY: currentDiffSpan[currentDiffSpan.length-1].y,
        startX: diffMinX,
        endX: diffMaxX
      });
    }


    var thisDiffCanvas = this.cloneCanvas();
    var otherDiffCanvas = other.cloneCanvas();
    var thisDiffContext = thisDiffCanvas.getContext('2d');
    var otherDiffContext = otherDiffCanvas.getContext('2d');

    thisDiffContext.fillStyle = 'rgba(0, 0, 255, 0.5)';
    otherDiffContext.fillStyle = 'rgba(255, 0, 0, 0.5)';
    diffSpans.forEach(function(diffSpan) {
      thisDiffContext.rect(
        diffSpan.startX - 1,
        diffSpan.startY - 1,
        diffSpan.endX - diffSpan.startX + 3,
        diffSpan.endY - diffSpan.startY + 3
      );
      otherDiffContext.rect(
        diffSpan.startX - 1,
        diffSpan.startY- 1,
        diffSpan.endX - diffSpan.startX + 3,
        diffSpan.endY - diffSpan.startY + 3
      );
    });
    thisDiffContext.fill();
    otherDiffContext.fill();

    if(diffRows.length > 0) {
      different = true;

      this.renderCanvas(thisDiffCanvas);
      other.renderCanvas(otherDiffCanvas);

      console.log(diffRows.length + ' lines are different.');
      console.log(diffSpans);
    }

    if(!different) {
      console.log("No difference.");
    }

    return different;
  }.bind(this));
}
