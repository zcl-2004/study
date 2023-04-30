const gulp = require('gulp');
// const uglify = require("gulp-uglify");
let uglify = require('gulp-uglify-es').default;

const rootDir = "./"
const workDir = "./preDist"
const outDir = "./dist"

const copyBuilt = function() {
	return gulp.src([`${workDir}/builtin-dts/**/*`])
			.pipe(gulp.dest(`${outDir}/builtin-dts`))
}

const copyPackage = function() {
	return gulp.src([`${workDir}/node_modules/**/*`])
			.pipe(gulp.dest(`${outDir}/node_modules`))
}

const copyPreDist = function() {
	return gulp.src([`${workDir}/**/*`, `!${workDir}/**/*.js`, `!${workDir}/**/*.json`])
			.pipe(gulp.dest(outDir))
}

// const copyBin = function() {
// 	return gulp.src([`${workDir}/node_modules/.bin/**/*`])
// 			.pipe(gulp.dest(`${outDir}/node_modules/.bin/`))
// }


const handleJS = function() {
	return gulp.src([`${workDir}/**/*.js`, `!${workDir}/**/node_modules/**`])
			.pipe(uglify())
			.pipe(gulp.src(`${workDir}/**/*.json`))
			.pipe(gulp.dest(outDir));
}

const defaultTask = gulp.series(handleJS, copyBuilt, copyPackage, copyPreDist);

exports.default = defaultTask;