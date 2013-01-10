module.exports = function(grunt) {
	"use strict";

	var cssModule = require('../lib/css');
	var crypto = require('crypto');
	var path = require('path');
	var csso = require('csso');
	var fs = require('fs');
	var _ = require('underscore');

	var catalogFile = '.build-catalog.json';
	var reSkipCSSFileName = /^_/;

	function md5(str) {
		return crypto.createHash('md5').update(str).digest("hex");
	}

	function padNumber(num) {
		return (num < 10 ? '0' : '') + num;
	}

	function timestamp() {
		var now = new Date();
		return [now.getFullYear(), 
			padNumber(now.getMonth() + 1),
			padNumber(now.getDate()),
			padNumber(now.getHours()),
			padNumber(now.getMinutes()),
			padNumber(now.getSeconds())
		].join('');
	}

	function makeAbsPath(file) {
		return path.resolve(process.cwd(), file);
	}

	function createPathResolver(webroot) {
		return function(file, originalFile) {
			var dirname = originalFile ? path.dirname(originalFile) : __dirname;
			if (file.charAt(0) == '/') {
				// resolve absolute file include
				file = file.replace(/^\/+/, '');
				dirname = webroot;
			}

			return path.resolve(dirname, file);
		};
	}

	function loadCatalog(config) {
		if (fs.existsSync(catalogFile)) {
			return grunt.file.readJSON(catalogFile);
		}

		return {};
	}

	function saveCatalog(json) {
		// update catalog
		grunt.file.write(catalogFile, JSON.stringify(json, null, '\t'));
	}

	/**
	 * Returns file path for catalog entry
	 * @param  {String} filePath 
	 * @param  {String} webroot 
	 * @return {String} 
	 */
	function filePathForCatalog(filePath, webroot) {
		var len = webroot.length;
		if (filePath.substring(0, len) == webroot) {
			filePath = filePath.substring(len);
			if (filePath.charAt(0) != '/') {
				filePath = '/' + filePath;
			}
		}

		return filePath;
	}

	// function getConfig(ctx) {
	// 	var keyName = 'frontendConfig';
	// 	ctx.requiresConfig(keyName);
	// 	var config = grunt.config.get(keyName);
	// 	if (!config.webroot) {
	// 		return grunt.fail.fatal('You shoud specify "webroot" property in "' + keyName + '" section', 100);
	// 	}

	// 	var force = false;
	// 	if ('force' in config) {
	// 		force = !!config.force;
	// 	}

	// 	if (ctx.args && ~ctx.args.indexOf('force')) {
	// 		force = true;
	// 	}

	// 	return _.extend(config, {
	// 		force: force,
	// 		webroot: makeAbsPath(config.webroot),
	// 		srcWebroot: makeAbsPath(config.srcWebroot || config.webroot)
	// 	});
	// }

	function validateConfig(config) {
		if (!config.webroot) {
			return grunt.fail.fatal('You shoud specify "webroot" property in frontend config', 100);
		}

		var force = false;
		if ('force' in config) {
			force = !!config.force;
		}

		return _.extend(config, {
			force: force,
			webroot: makeAbsPath(config.webroot),
			srcWebroot: makeAbsPath(config.srcWebroot || config.webroot)
		});
	}

	function shouldCompileJSFile(file, deps, catalog, config) {
		var catalogName = filePathForCatalog(file, config.webroot);
		var shouldCompile = config.force || !(catalogName in catalog) || !fs.existsSync(file);
		if (!shouldCompile) {
			// we should compare a list length, file order and md5 of children files
			var prevList = catalog[catalogName].files;
			shouldCompile = prevList.length !== deps.length;

			// compare lib content and file order
			if (!shouldCompile) {
				shouldCompile = !!_.reject(deps, function(f, i) {
					var cf = filePathForCatalog(makeAbsPath(f), config.srcWebroot);
					return cf === prevList[i].file;
				}).length;
			}

			// compare md5 of files
			if (!shouldCompile) {
				shouldCompile = !!_.find(deps, function(f, i) {
					return md5(grunt.file.read(f)) !== prevList[i].md5;
				});
			}
		}

		return shouldCompile;
	}

	/**
	 * Check if passed path is a file
	 * @param  {String}  path
	 * @return {Boolean}
	 */
	function isFile(path) {
		if (fs.existsSync(path)) {
			return fs.statSync(path).isFile();
		} else {
			return (/\.\w+$/).test(path);
		}
	}

	/** 
	 * Register reusable CSS compiler helper
	 * @param {Object} data Task payload
	 * @param {Object} config Task config (can be obtained from getConfig() method)
	 * @param {Object} catalog Pointer resources to catalog (can be obtained from loadCatalog())
	 */
	grunt.registerHelper('frontend-css', function(data, config, catalog) {
		if (!('src' in data)) {
			return grunt.fail('No "src" property specified for "css" task');
		}

		if (!('dest' in data)) {
			return grunt.fail('No "dest" property specified for "css" task');
		}

		catalog = catalog || {};

		var srcDir =  makeAbsPath(data.src);
		var destDir = makeAbsPath(data.dest);

		// read all css files
		var reCSSFile = /\.css$/i;
		var reSkip = config.skipNames || reSkipCSSFileName;
		var resolver = createPathResolver(config.srcWebroot);
		grunt.file.recurse(srcDir, function(abspath, rootdir, subdir, filename) {
			if (reCSSFile.test(abspath) && !reSkip.test(filename)) {
				var payload = {};
				payload[path.join(destDir, subdir, filename)] = abspath;
				grunt.helper('frontend-css-file', payload, config, catalog);
			}
		});

		return catalog;
	});

	/** 
	 * Compiles single CSS file
	 * @param {Object} data Task payload
	 * @param {Object} config Task config (can be obtained from getConfig() method)
	 * @param {Object} catalog Pointer resources to catalog (can be obtained from loadCatalog())
	 */
	grunt.registerHelper('frontend-css-file', function(data, config, catalog) {
		catalog = catalog || {};

		var resolver = createPathResolver(config.srcWebroot);

		_.each(data, function(src, dest) {
			var destFile = makeAbsPath(dest);
			grunt.file.mkdir(path.dirname(destFile));

			var imports = {};
			var keepImports = [];
			var srcCatalogFiles = [];

			// sequentially inline all source CSS files into a singe one
			var max = _.map(grunt.file.expandFiles(src), function(f) {
				var srcFile = makeAbsPath(f);
				srcCatalogFiles.push(filePathForCatalog(srcFile, config.srcWebroot));
				grunt.log.writeln('\nReading ' + _.last(srcCatalogFiles));

				return cssModule.inlineCSSFile(srcFile, resolver, keepImports, imports);
			}).join('');

			// create file header with @imports that should be kept
			var header = _.map(keepImports, function(imp) {
				return imp.value;
			}).join(';\n') + '\n';

			// minify CSS
			var min = csso.justDoIt(header + max, true);

			// check if we should re-save compiled file
			// thus change its content and modification date				
			var hash = md5(min);
			var catalogName = filePathForCatalog(destFile, config.webroot);
			if (!config.force && catalogName in catalog && catalog[catalogName].md5 === hash && fs.existsSync(destFile)) {
				grunt.log.writeln('File is not modified, skipping');
				return;
			}

			grunt.log.writeln('Saving minified version to ' + catalogName);
			grunt.file.write(destFile, min);

			catalog[catalogName] = {
				md5: hash,
				date: timestamp(),
				files: srcCatalogFiles
			};
		});

		return catalog;
	});

	grunt.registerHelper('frontend-js', function(data, config, catalog) {
		catalog = catalog || {};

		var failed = _.find(data, function(src, dest) {
			// a copy on "min" task
			var files = grunt.file.expandFiles(src);
			var absDestPath = makeAbsPath(dest, config.webroot);

			var catalogName = filePathForCatalog(absDestPath, config.webroot);
			grunt.log.writeln('\nReading ' + catalogName);

			// Get banner, if specified. It would be nice if UglifyJS supported ignoring
			// all comments matching a certain pattern, like /*!...*/, but it doesn't.
			var banner = grunt.task.directive(files[0], function() { return null; });
			if (banner === null) {
				banner = '';
			} else {
				files.shift();
			}

			// check if current file should be compiled
			if (!shouldCompileJSFile(absDestPath, files, catalog, config)) {
				grunt.log.writeln('File is not modified, skipping\n');
				return false;
			}

			// Concat specified files. This should really be a single, pre-built (and
			// linted) file, but it supports any number of files.
			var max = grunt.helper('concat', files);

			// Concat banner + minified source.
			var min = banner + grunt.helper('uglify', max, grunt.config('uglify'));
			grunt.file.write(dest, min);

			// Fail task if errors were logged.
			if (grunt.fail.errorcount) {
				return true;
			}

			// Otherwise, print a success message....
			grunt.log.writeln('File "' + catalogName + '" created.');
			// ...and report some size information.
			grunt.helper('min_max_info', min, max);

			// update catalog entry
			catalog[catalogName] = {
				md5: md5(min),
				date: timestamp(),
				files: _.map(files, function(f) {
					return {
						file: filePathForCatalog(makeAbsPath(f), config.srcWebroot),
						md5: md5(grunt.file.read(f))
					};
				})
			};
		});

		if (failed) {
			return false;
		}

		return catalog;
	});

	grunt.registerMultiTask('frontend', 'Builds font-end part of your web-site: compiles CSS and JS files', function() {
		grunt.log.writeln('Compiling ' + this.target.toUpperCase());
		var data = this.data;
		var catalog = loadCatalog();
		var config = validateConfig(_.extend({}, grunt.config.get('frontendConfig') || {}, this.data.options || {}));

		['css', 'css-single', 'js'].forEach(function(h) {
			if (h in data) {
				grunt.helper('frontend-' + h, data[h], config, catalog);
			}
		});

		// update catalog
		return saveCatalog(catalog);
	});
};