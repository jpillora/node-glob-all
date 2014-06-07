var glob = require('../');

var t = Date.now();
glob([,
  '**/*.js',
  '**'
], {
  cwd: /* folder with many files */
}, function(err, files) {
  console.log(Date.now()-t,  err || files.length);
});
