module.exports = function(grunt) {
	"use strict";

	// Project configuration.
	grunt.initConfig({
		nodeunit: {
			tests: ['test/*.js']
		},
		watch: {
			files: '<config:lint.files>',
			tasks: 'default'
		},
		jshint: {
			files: ['Gruntfile.js', 'tasks/**/*.js', 'test/*.js'],
			options: {
				curly:     true,
				eqeqeq:    false,
				immed:     true,
				latedef:   true,
				newcap:    true,
				noarg:     true,
				sub:       true,
				undef:     true,
				boss:      true,
				eqnull:    true,
				node:      true,
				es5:       true,
				smarttabs: true
			},
			globals: {}
		},

		frontend: {
			webroot: './out',
			srcWebroot: './test',
			rewriteScheme: '/-/<%= version %><%= url %>',
			force: true
		},

		'frontend-js': {
			options: {
				force: true
			},
			main: {
				files: {
					'out/js/f.js': [
						'test/js/file1.js',
						'test/js/file2.js'
					]
				}
			}
		},

		'frontend-css': {
			main: {
				options: {
					inline: true,
					rewriteUrl: true,
					minify: true
				},
				files: [
					{src: 'test/css/*.css', dest: 'out/css'}
				]
			}
		},

		'frontend-index': {
			main: {
				files: [{src: 'test/css/**/*.css'}]
			}
		}
	});

	// Load local tasks.
	grunt.loadTasks('tasks');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');

	// Default task.
	grunt.registerTask('default', ['jshint', 'nodeunit']);
};
