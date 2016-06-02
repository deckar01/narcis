
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
    this.imageData32 = ImageData32.from8(this.imageData);

  }.bind(this));
}

Screenshot.diffAlgorithms = {
  binaryDiff: 'Binary Diff',
  horizontalDiff: 'Horizontal Diff',
  splitDiff: 'Split Diff',
  recursiveDiff: 'Recursive Diff',
  moveDiff: 'Move Diff',
  decomposeDiff: 'Decompose Diff'
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
    this._highlightDiff(other, {changes: pixels}, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype.horizontalDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff the image rows.
    var rows = this.imageData32.horizontalDiff(other.imageData32);
    this._highlightDiff(other, {changes: rows}, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype.splitDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff them image regions.
    var regions = this.imageData32.splitDiff(other.imageData32);
    this._highlightDiff(other, {changes: regions}, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype.recursiveDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff them image regions.
    var regions = this.imageData32.recursiveDiff(other.imageData32);
    this._highlightDiff(other, {changes: regions}, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype.moveDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff them image regions.
    var diff = this.imageData32.moveDiff(other.imageData32);
    this._highlightDiff(other, diff, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype.decomposeDiff = function(other) {
  return Promise.all([this.loaded, other.loaded])
  .then(function() {

    // Diff them image regions.
    var diff = this.imageData32.decomposeDiff(other.imageData32);
    this._highlightDiff(other, diff, this._paddingSize());

  }.bind(this));
}

Screenshot.prototype._highlightDiff = function(other, diff, padding) {
  diff.moves = diff.moves || [];
  var thisOverlay = new Overlay(this, 'rgba(0, 0, 255, 0.5)', 'rgba(0, 0, 255, 1)', padding);
  var otherOverlay = new Overlay(other, 'rgba(255, 0, 0, 0.5)', 'rgba(255, 0, 0, 1)', padding);

  thisOutlines = [].concat(diff.changes);
  otherOutlines = [].concat(diff.changes);

  thisHighlights = [].concat(diff.changes);
  otherHighlights = [].concat(diff.changes);

  diff.moves.forEach(function(move) {
    thisOutlines.push(move.from);
    otherOutlines.push(move.to);
    thisHighlights.push(move.from);
    otherHighlights.push(move.to);
  });

  thisOverlay.outline(thisOutlines);
  otherOverlay.outline(otherOutlines);

  otherOverlay.move(diff.moves);

  thisOverlay.clear(thisHighlights);
  otherOverlay.clear(otherHighlights);

  thisOverlay.render();
  otherOverlay.render();
}

var Overlay = function(screenshot, fillStyle, strokeStyle, padding) {
  this.screenshot = screenshot;
  this.width = this.screenshot.width;
  this.height = this.screenshot.height;
  this.padding = padding || 0;
  this.fillStyle = fillStyle;
  this.strokeStyle = strokeStyle;

  this.canvas = document.createElement('canvas');
  this.canvas.width = this.width;
  this.canvas.height = this.height;
  this.context = this.canvas.getContext('2d');

  // Add a semitransparent overlay.
  this.context.fillStyle = this.fillStyle;
  this.context.beginPath();
  this.context.rect(0, 0, this.width, this.height);
  this.context.fill();
}

Overlay.prototype.outline = function(regions) {
  this.context.beginPath();

  // Outline regions of the overlay that are different.
  regions.forEach(function(box) {
    this.context.rect(
      box.left - this.padding,
      box.top  - this.padding,
      box.right  - box.left + 2*this.padding + 1,
      box.bottom - box.top  + 2*this.padding + 1
    );
  }.bind(this));

  this.context.strokeStyle = this.strokeStyle;
  this.context.lineWidth = 2;
  this.context.stroke();
}

Overlay.prototype.clear = function(regions) {
  
  // Erase regions of the overlay that are different.
  regions.forEach(function(box) {
    this.context.clearRect(
      box.left - this.padding,
      box.top  - this.padding,
      box.right  - box.left + 2*this.padding + 1,
      box.bottom - box.top  + 2*this.padding + 1
    );
  }.bind(this));
}

Overlay.prototype.move = function(moves) {

  // Outline regions of the overlay that are different.
  moves.forEach(function(move) {

    // Calculate box centers.
    var fromCenter = move.from.center();
    var toCenter = move.to.center();

    // Calculate the line normal for the arrow.
    var normal = {
      x: toCenter.x - fromCenter.x,
      y: toCenter.y - fromCenter.y
    };
    var normalLength = Math.sqrt(Math.pow(normal.x, 2) + Math.pow(normal.y, 2))
    var unitNormal = {
      x: normal.x / normalLength,
      y: normal.y / normalLength
    };

    this.context.lineWidth = 1;

    // Draw from box.
    this.context.beginPath();
    this.context.rect(
      move.from.left - this.padding,
      move.from.top  - this.padding,
      move.from.right  - move.from.left + 2*this.padding + 1,
      move.from.bottom - move.from.top  + 2*this.padding + 1
    );
    this.context.stroke();

    // Draw arrow.
    this.context.beginPath();
    var radius = 4;
    this.context.arc(fromCenter.x, fromCenter.y, radius, 0, 2*Math.PI, false);
    this.context.moveTo(fromCenter.x + unitNormal.x * radius, fromCenter.y + unitNormal.y * radius);
    this.context.lineTo(toCenter.x, toCenter.y);
    this.context.strokeStyle = this.strokeStyle;
    this.context.stroke();

  }.bind(this));
}

Overlay.prototype.render = function() {
  // Reset the canvas.
  this.screenshot.context.putImageData(this.screenshot.imageData, 0, 0);

  // Render the overlay.
  this.screenshot.context.drawImage(this.canvas, 0, 0);

  // Copy the canvas to the image.
  this.screenshot.image.src = this.screenshot.canvas.toDataURL();
}
