
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

Screenshot.prototype.renderDiff = function() {
  if(this.diffData) {
    this.context.putImageData(this.diffData, 0, 0);
    this.image.src = this.canvas.toDataURL();
  }
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

    this.diffData = this.context.createImageData(this.imageData);
    other.diffData = other.context.createImageData(other.imageData);

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

          this.diffData.data[thisIndex] = this.imageData.data[thisIndex];
          this.diffData.data[thisIndex+1] = this.imageData.data[thisIndex+1];
          this.diffData.data[thisIndex+2] = this.imageData.data[thisIndex+2];
          this.diffData.data[thisIndex+3] = distance;

          other.diffData.data[otherIndex] = other.imageData.data[otherIndex];
          other.diffData.data[otherIndex+1] = other.imageData.data[otherIndex+1];
          other.diffData.data[otherIndex+2] = other.imageData.data[otherIndex+2];
          other.diffData.data[otherIndex+3] = distance;
        }
      }
    }

    if(differentPixels > 0) {
      different = true;

      this.renderDiff();
      other.renderDiff();

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