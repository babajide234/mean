'use strict';

var cluster = require( 'cluster' ),
    app     = require( './index' );

if (cluster.isMaster) {
  // Fork workers.
  for (var i = 0; i < 2; i += 1) {
    cluster.fork();
  }
} else {
  app.listen( 3000 );
}
