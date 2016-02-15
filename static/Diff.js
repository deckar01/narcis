var Diff = {};

Diff.Row = function(y, left, right) {
  this.y = y;
  this.left = left;
  this.right = right;
}

Diff.Cluster = function(rows) {
  this.rows = rows || [];
}

Diff.Cluster.prototype.add = function(row) {
  this.rows.push(row);
}

Diff.Cluster.prototype.isEmpty = function() {
  return this.rows.length === 0;
}

Diff.Cluster.prototype.left = function() {
  return this.rows.reduce(function(min, row) {
    return Math.min(min, row.left);
  }, Infinity);
}

Diff.Cluster.prototype.right = function() {
  return this.rows.reduce(function(max, row) {
    return Math.max(max, row.right);
  }, -Infinity);
}

Diff.Cluster.prototype.top = function() {
  return this.rows[0].y;
}

Diff.Cluster.prototype.bottom = function() {
  return this.rows[this.rows.length-1].y;
}

Diff.clusterRows = function(rows, maxDistance) {
  maxDistance = maxDistance || 0;

  var clusters = [];

  for(var i = 0, cluster = new Diff.Cluster(); i < rows.length; i++) {

    var row = rows[i];
    var previousY = (i>0) ? rows[i-1].y : -1;
    var distance = row.y - previousY - 1;

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