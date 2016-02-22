var Diff = {};

Diff.Cluster = function(boxes) {
  this.boxes = boxes || [];
}

Diff.Cluster.prototype.add = function(box) {
  this.boxes.push(box);
}

Diff.Cluster.prototype.isEmpty = function() {
  return this.boxes.length === 0;
}

Diff.Cluster.prototype.left = function() {
  return this.boxes.reduce(function(min, box) {
    return Math.min(min, box.left);
  }, Infinity);
}

Diff.Cluster.prototype.right = function() {
  return this.boxes.reduce(function(max, box) {
    return Math.max(max, box.right);
  }, -Infinity);
}

Diff.Cluster.prototype.top = function() {
  return this.boxes.reduce(function(min, box) {
    return Math.min(min, box.top);
  }, Infinity);
}

Diff.Cluster.prototype.bottom = function() {
  return this.boxes.reduce(function(max, box) {
    return Math.max(max, box.bottom);
  }, -Infinity);
}

Diff.clusterRows = function(rows, maxDistance) {
  maxDistance = maxDistance || 0;

  var clusters = [];

  for(var i = 0, cluster = new Diff.Cluster(); i < rows.length; i++) {

    var row = rows[i];
    var previousY = (i>0) ? rows[i-1].bottom : -1;
    var distance = row.top - previousY - 1;

    if(distance <= maxDistance) {
      cluster.add(row);
    } else {
      if(!cluster.isEmpty()) clusters.push(cluster);
      cluster = new Diff.Cluster([row]);
    }
  }

  if(!cluster.isEmpty()) clusters.push(cluster);

  return clusters;
}

Diff.clusterColumns = function(columns, maxDistance) {
  maxDistance = maxDistance || 0;

  var clusters = [];

  for(var i = 0, cluster = new Diff.Cluster(); i < columns.length; i++) {

    var column = columns[i];
    var previousX = (i>0) ? columns[i-1].right : -1;
    var distance = column.left - previousX - 1;

    if(distance <= maxDistance) {
      cluster.add(column);
    } else {
      if(!cluster.isEmpty()) clusters.push(cluster);
      cluster = new Diff.Cluster([column]);
    }
  }

  if(!cluster.isEmpty()) clusters.push(cluster);

  return clusters;
}

Diff.Box = function(left, top, right, bottom) {
  this.left = left;
  this.top = top;
  this.right = right;
  this.bottom = bottom;
}

Diff.Box.prototype.toArray = function() {
  return [
    this.left,
    this.top,
    this.right,
    this.bottom
  ];
}

Diff.Box.fromCluster = function(cluster) {
  return new Diff.Box(
    cluster.left(),
    cluster.top(),
    cluster.right(),
    cluster.bottom()
  );
}

Diff.boxClusters = function(clusters) {
  var boxes = clusters.map(function(cluster) {
    return Diff.Box.fromCluster(cluster);
  });

  return boxes;
}