/**
 * A Rework plugin for inlining imports
 */
var path = require('path');
var fs = require('fs');
var reExternal = /^(\w+\:)?\/\//;
var rework = require('rework');

function read(file) {
	return fs.readFileSync(file, {encoding: 'utf8'});
}

function defaultResolver(root, file, parentFile) {
	var parentDir = path.dirname(parentFile);
	if (file.charAt(0) !== '/') {
		return path.join(parentDir, file);
	}

	return path.join(root, file.replace(/^\/+/, ''));
}

function stripURL(url) {
	return url.trim()
		.replace(/^url\(|\)\;?$/g, '')
		.replace(/^['"]|['"]$/g, '');
}

function processImport(rule, style, resolve, imported, keep) {
	var url = stripURL(rule['import']);
	if (reExternal.test(url)) {
		// keep external rules
		if (!~keep.indexOf(url)) {
			keep.push(rule);
		}
		return null;
	}

	var resolved = resolve(url, style.__url);
	if (~imported.indexOf(resolved)) {
		// import was already included, skip it
		return null;
	}

	imported.push(resolved);
	var rules = null;
	rework(read(resolved))
		.use(function(style) {
			style.__url = resolved;
			rules = resolveImports(style, resolve, imported, keep);
			return style;
		});

	return rules;
}

function resolveImports(style, resolve, imported, keep) {
	imported = imported || [];
	keep = keep || [];

	var rules = [];
	style.rules.forEach(function(rule) {
		if (rule.type == 'import') {
			var processed = processImport(rule, style, resolve, imported, keep);
			if (processed) {
				rules = rules.concat(processed);
			}
		} else {
			rules.push(rule);
		}
	});

	return rules;
}

module.exports = function(pathResolver, url, imported) {
	if (typeof pathResolver == 'string') {
		var root = pathResolver;
		pathResolver = function(file, parentFile) {
			return defaultResolver(root, file, parentFile);
		};
	}

	return function(style) {
		style.__url = url;
		var keep = [];
		style.rules = resolveImports(style, pathResolver, imported, keep);
		
		while (keep.length) {
			style.rules.unshift(keep.pop());
		}

		return style;
	};
};

module.exports.resolver = defaultResolver;
module.exports.read = read;