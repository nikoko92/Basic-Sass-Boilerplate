//// Requires
/// gulp stuff

const gulp                       = require('gulp'),
		babel 					      = require('gulp-babel'),
		autoprefixer               = require('gulp-autoprefixer'),
		browserSync                = require('browser-sync').create(),
		cached 					      = require('gulp-cached'),
		clean                      = require('gulp-clean')
		cleanCSS                   = require('gulp-clean-css'),
		concat                     = require('gulp-concat'),
		del                        = require('del'),
		imagemin 				      = require('gulp-imagemin'),
		imageminJpegRecompress 	   = require('imagemin-jpeg-recompress'),
		imageminPngquant 		      = require('imagemin-pngquant');
		notify 					      = require('gulp-notify'),
		plumber                    = require('gulp-plumber'),
		rename                     = require('gulp-rename'),
		sass                       = require('gulp-sass'),
		sassPartialsImported 	   = require('gulp-sass-partials-imported'),
		sourcemaps                 = require('gulp-sourcemaps'),
		uglify 					      = require('gulp-uglify');

/// Vars ressources paths & dest

const paths = {

	// src
	src: 					  'src/',

	// build
	build: 				  'dist/',

	// assets

	assets: {
		dest:           'dist/assets',
		destRoot: 		 'dist/',
		src:        [
			'src/assets/**/*.*',
			// except images
			'!src/assets/img/**/*.jpg',
			'!src/assets/img/**/*.png',
			'!src/assets/img/**/*.gif'
		],
		// copy .htaccess  and root files stuff
		srcRoot:     [
			'src/.htaccess',
			'src/crossdomain.xml',
			'src/humans.txt',
			'src/robots.txt'
		],

	},

	// sass
	styles: {
		dest: 				'./dist/styles',
		destDev: 			'./src/styles/css-unminified',
		files: 				'./src/styles/**/*.scss',
		src: 				   './src/styles'
	},

	// scripts
	scripts: {
		dest: 	      './dist/scripts',
		src:   [
			'./src/scripts/vendor/jquery-3.3.1.min.js',  // for vendors js
			'./src/scripts/**/*.js'
		]
	},

	// images (for minification)
	img: {
		dest: 	      'dist/assets/img/',
		src: 	         'src/assets/img/**/*.*'
	},

	// html
	html: {
		dest: 	      'dist/',
		src: 	         'src/*.html'
	},

	// watch
	watch: {
	   scripts: 		'src/scripts/**/*.js',
		styles: 			'src/styles/**/*.scss',
		templates: 		'src/**/*.html'
	}
}


//// Tasks

// tâche Browser Sync
gulp.task('browser-sync', function() {
	browserSync.init({
		server: {
			baseDir: paths.build
		}
	});
});

// tache de copie des éléments visuels
gulp.task('assets', function() {
	gulp.src(paths.assets.src)
	.pipe(gulp.dest(paths.assets.dest));

	return gulp.src(paths.assets.srcRoot)
	.pipe(gulp.dest(paths.assets.destRoot))
});

// Image minification
// lossless + progressive + strip all (pagespeed recommandations)
gulp.task('imagemin', function () {
	return gulp
	.src(paths.img.src)
	.pipe(imagemin([
		imagemin.gifsicle({ interlaced: true }),

		imageminJpegRecompress({
			max: 80,
			min: 70,
			progressive: true
		}),

		imageminPngquant({quality: '75-85'}),
		imagemin.svgo({
			plugins: [{ removeViewBox: false }]
		})
	]))

	.pipe(gulp.dest(paths.img.dest));
});

/*****
/*
/* HTML TASK
/*
*****/
gulp.task('html', function(){
	return gulp.src(paths.html.src)
	// prevent watch crash on error
	.pipe(plumber({
		errorHandler: function(err) {
			notify.onError({
				title: 'Gulp error in ' + err.plugin,
				// message:  err.toString()
				message:  err.message
			})(err);
		},
		handleError: function (err) {
			console.log(err);
			this.emit('end');
		}
	}))
	.pipe(gulp.dest(paths.html.dest))
	.pipe(browserSync.stream());
})

/*****
/*
/* CSS TASK
/*
*****/

gulp.task('sass', function() {
	return gulp.src(paths.styles.files)
	// prevent watch crash on error
	.pipe(plumber({
		errorHandler: function(err) {
			notify.onError({
				title: 'Gulp error in ' + err.plugin,
				// message:  err.toString()
				message:  err.message
			})(err);
		},
		handleError: function (err) {
			console.log(err);
			this.emit('end');
		}
	}))
	// caching to fasten watch
	.pipe(cached('sassCache'))
	// during watch, force recompile of un modified scss files that imports modified sass files
	// allow sass watch with cache
	.pipe(sassPartialsImported(paths.styles.src))
	.pipe(
		sass({
			outputStyle: 'expanded',
			sourceComments: 'map',
			onError: console.error.bind(console, 'Sass error:'),
			includePaths: [paths.styles.src]
	}))
	.pipe(sourcemaps.init())
	// Pass the compiled sass through the prefixer with defined
	.pipe(autoprefixer( {
			browsers: ['last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'],
			grid: true
		}))
	// Un compressed css version for debug purposes
	.pipe(gulp.dest(paths.styles.destDev))
	// Minify w. sourcemaps
	.pipe(cleanCSS())
	.pipe(rename({
		suffix: '.min'
	}))
	.pipe(sourcemaps.write())
	// Finally put the compiled sass into a css file
	.pipe(gulp.dest(paths.styles.dest))
	// Call browser reload
	.pipe(browserSync.stream());
});

/*****
/*
/* JAVASCRIPT TASK
/*
*****/

gulp.task('js', function () {

	// return gulp.src(paths.scripts.src)
	return gulp.src(paths.scripts.src)
	.pipe(sourcemaps.init())
	/// Manage ES6 via babel
	// .pipe(babel({
	// 	presets: ['env']
	// }))
	.pipe(uglify())
	.pipe(concat('main.js'))
	.pipe(rename({
		suffix: '.min'
	}))
	.pipe(sourcemaps.write('.'))
	.pipe(gulp.dest(paths.scripts.dest))
	.pipe(browserSync.stream());
});

// Dedicated watch functions to allow independant re-compile & force browser reload
gulp.task('watch-html', ['html'], function(done) {
	// Used for caching during watch, cf. html()
	global.isWatching = true;

	browserSync.reload();
	done();
});
gulp.task('watch-sass', ['sass'], function(done) {
	browserSync.reload();
	done();
});
gulp.task('watch-js', ['js'], function(done) {
	browserSync.reload();
	done();
});

/*****
/*
/* WATCH TASK
/*
*****/

gulp.task('watch', function() {
	gulp.start('browser-sync');

	gulp.watch(paths.watch.templates, ['watch-html']);
	gulp.watch(paths.watch.styles,    ['watch-sass']);
	gulp.watch(paths.watch.scripts,   ['watch-js']);
});

/*****
/*
/* CLEAN TASK
/*
*****/

// Remove CSS and JS directories

gulp.task('clean', function() {
	return del([
		'dist/script/main.min.js',
		'dist/styles/main.min.css',
		'src/styles/css-unminified'
	]);
});

// Remove all folders & files


gulp.task('clean-all', function() {
	return del([
		'dist',
		'src/styles/css-unminified'
	]);
});

/*****
/*
/* MAIN GULP TASKS (gulp, gulp build, gulp rebuild)
/*
*****/

// Build Task - create entire dist folder

gulp.task('build', function() {
	gulp.start('assets');
	gulp.start('html');
	gulp.start('sass');
	gulp.start('js');
	gulp.start('imagemin');
});

// Rebuild Task - delete entire dist folder and rebuild

gulp.task('rebuild', ['clean-all'], function(){
	gulp.start('build');
});

// Gulp Task - clean css & js files adding watch task

gulp.task('default', ['clean', 'watch'], function() {
	gulp.start('sass');
	gulp.start('js');
});





//// Thanks to
/*
* https://www.mikestreety.co.uk/blog/a-simple-sass-compilation-gulpfile-js
* .. and to all awesome guys you worked, work or will work on open source plugins
*/
