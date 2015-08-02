'use strict';

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var babel = require('babel/register');

gulp.task('test', function() {
    return gulp.src(['test/**/*.js'])
        .pipe(mocha({
            compilers: {
                js: babel
            }
        }));
});
