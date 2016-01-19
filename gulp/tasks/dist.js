var gulp = require('gulp');


gulp.task('dist', ['build'], function() {
  gulp.src('./build/ffwdme*').pipe(gulp.dest('./dist'));
  gulp.src('./build/components/**').pipe(gulp.dest('./dist/components'));

});
