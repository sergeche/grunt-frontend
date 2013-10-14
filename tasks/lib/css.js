var rework = require('rework');
var path = require('path');
var fs = require('fs');
var inlineImports = require('./rework-inline-imports');
var utils = require('./utils');
var csso = require('csso');

var hashLookup = {};
var reIgnoredUrls = /^\w+\:/;

function lookupHash(file, config) {
	if (!(path in hashLookup)) {
		var f = utils.fileInfo(file, {cwd: config.srcWebroot});
		hashLookup[file] = f.hash;
	}

	return hashLookup[file];
}

function rewriteUrl(url, cssFile, config) {
	if (reIgnoredUrls.test(url)) {
		// do not touch external urls
		return url;
	}

	if (config.ignoredUrls && config.ignoredUrls.test(url)) {
		// ignore user-defined patterns
		return url;
	}

	var parts = url.split('?');
	var cleanUrl = parts.shift();
	var queryString = parts.length ? '?' + parts.join('?') : '';

	var parentDir = path.dirname(cssFile.absPath), absUrl;
	if (cleanUrl.charAt(0) == '/') {
		absUrl = path.join(config.srcWebroot, cleanUrl.substr(1));
	} else {
		absUrl = path.resolve(parentDir, cleanUrl);
	}

	var f = utils.fileInfo(absUrl, {cwd: config.srcWebroot});
	var version = lookupHash(f.absPath, config);

	if (!version) {
		return url;
	}

	return utils.versionedUrl(f.catalogPath + queryString, version, config);
}

module.exports = {
	/**
	 * Processes given CSS files
	 * @param  {Array} files    Normalized Grunt task file list
	 * @param  {Object} config  Current task config
	 * @param  {Object} catalog Output catalog
	 * @param  {Object} env     Task environment (`grunt` and `task` properties)
	 * @return {Object}         Updated catalog
	 */
	compile: function(files, config, catalog, env) {
		var grunt = env.grunt;
		var that = this;

		files.forEach(function(f) {
			var file = utils.fileInfo(f.dest, config);
			grunt.log.write('Processing ' + file.catalogPath.cyan);
			var src = f.src.map(function(src) {
				return utils.fileInfo(src, {cwd: config.srcWebroot});
			});

			file.content = src.map(function(src) {
				return that.processFile(src, config, catalog, env).content;
			}).join('');
			
			if (
				!config.force 
				&& file.catalogPath in catalog 
				&& catalog[file.catalogPath].hash === file.hash 
				&& fs.existsSync(file.absPath)) {
					grunt.log.writeln(' [skip]'.grey);
					return;
			}

			// save result
			grunt.log.writeln(' [save]'.green);
			grunt.file.write(file.absPath, file.content);
			catalog[file.catalogPath] = {
				hash: file.hash,
				date: utils.timestamp(),
				versioned: file.versionedUrl(config),
				files: src.map(function(f) {
					return {
						file: f.catalogPath,
						hash: f.hash,
						versioned: f.versionedUrl(config)
					};
				})
			};
		});
	},

	processFile: function(file, config, catalog, env) {
		if (typeof file == 'string') {
			file = utils.fileInfo(file, {cwd: config.srcWebroot});
		}

		var grunt = env.grunt;
		var imported = [];
		var style = rework(inlineImports.read(file.absPath));

		grunt.verbose.writeln('');

		if (config.inline) {
			grunt.verbose.writeln('Inlining ' + file.catalogPath.cyan);
			style.use(inlineImports(config.srcWebroot, file.absPath, imported));
		}

		if (config.rewriteUrl) {
			grunt.verbose.writeln('Rewriting URLs in ' + file.catalogPath.cyan);
			// rewrite urls to external resources
			style.use(rework.url(function(url) {
				return rewriteUrl(url, file, config);
			}));
		}

		var out = style.toString();

		if (config.minify) {
			// minify CSS
			grunt.verbose.writeln('Minifying ' + file.catalogPath.cyan);
			out = csso.justDoIt(out, true);
		}

		if (config.postProcess) {
			// do additional postprocessing, if required
			grunt.verbose.writeln('Postprocessing ' + file.catalogPath.cyan);
			out = config.postProcess(out, file);
		}

		file.content = out;
		return file;
	}
};